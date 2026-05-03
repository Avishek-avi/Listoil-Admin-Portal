
import { 
    schemes, 
    schemeTypes, 
    mechanicTransactionLogs, 
    mechanics, 
    users, 
    pincodeMaster, 
    skuEntity, 
    skuVariant 
} from "@/db/schema";
import { eq, and, ilike, sql } from "drizzle-orm";

/**
 * Central engine to process Booster Schemes for a given transaction.
 * This logic enforces budget limits and user limits to prevent point leakage.
 */
export async function processBoosterSchemes(
    tx: any, 
    data: {
        userId: number;
        points: number;
        serialNumber: string;
        sku: string;
        baseTransactionId?: number;
    }
) {
    const now = new Date().toISOString();

    // 1. Get user location and role
    const [userMeta] = await tx.select({
        roleId: users.roleId,
        state: mechanics.state,
        city: mechanics.city,
        pincode: mechanics.pincode
    })
    .from(users)
    .leftJoin(mechanics, eq(users.id, mechanics.userId))
    .where(eq(users.id, data.userId))
    .limit(1);

    if (!userMeta) return;

    let userZone = '';
    if (userMeta?.pincode) {
        const [pin] = await tx.select({ zone: pincodeMaster.zone }).from(pincodeMaster).where(eq(pincodeMaster.pincode, userMeta.pincode)).limit(1);
        userZone = pin?.zone || '';
    }

    // 2. Get SKU hierarchy for the scanned SKU
    const [entityInfo] = await tx.select({
        id: skuEntity.id,
        parentId: skuEntity.parentEntityId,
        levelId: skuEntity.levelId
    })
    .from(skuEntity)
    .where(ilike(skuEntity.name, data.sku))
    .limit(1);

    if (!entityInfo) return;

    let parentInfo = null;
    if (entityInfo.parentId) {
        [parentInfo] = await tx.select({
            id: skuEntity.id,
            parentId: skuEntity.parentEntityId,
            levelId: skuEntity.levelId
        }).from(skuEntity).where(eq(skuEntity.id, entityInfo.parentId)).limit(1);
    }

    let grandParentInfo = null;
    if (parentInfo?.parentId) {
        [grandParentInfo] = await tx.select({
            id: skuEntity.id,
            levelId: skuEntity.levelId
        }).from(skuEntity).where(eq(skuEntity.id, parentInfo.parentId)).limit(1);
    }

    const categoryId = [entityInfo, parentInfo, grandParentInfo].find(e => e?.levelId === 11)?.id;
    const subCategoryId = [entityInfo, parentInfo, grandParentInfo].find(e => e?.levelId === 12)?.id;
    const [skuVar] = await tx.select({id: skuVariant.id}).from(skuVariant).where(eq(skuVariant.skuEntityId, entityInfo.id)).limit(1);
    const skuVariantId = skuVar?.id;

    // 3. Find Active Booster Schemes
    const activeBoosterSchemes = await tx.select({
        id: schemes.id,
        name: schemes.name,
        config: schemes.config,
        budget: schemes.budget,
        spentBudget: schemes.spentBudget
    })
    .from(schemes)
    .innerJoin(schemeTypes, eq(schemes.schemeType, schemeTypes.id))
    .where(and(
        ilike(schemeTypes.name, 'Booster'),
        eq(schemes.isActive, true),
        sql`${schemes.startDate} <= ${now}`,
        sql`${schemes.endDate} >= ${now}`
    ));

    for (const scheme of activeBoosterSchemes) {
        const config = (scheme.config as any)?.booster;
        if (!config) continue;

        // Eligibility Check
        // a) Audience
        if (config.audienceIds && config.audienceIds.length > 0 && !config.audienceIds.includes(userMeta.roleId)) continue;

        // b) Geography
        const geo = config.geoScope;
        if (geo) {
            const zoneMatch = !geo.zones?.length || (userZone && geo.zones.includes(userZone));
            const stateMatch = !geo.states?.length || (userMeta.state && geo.states.includes(userMeta.state));
            const cityMatch = !geo.cities?.length || (userMeta.city && geo.cities.includes(userMeta.city));
            if (!zoneMatch || !stateMatch || !cityMatch) continue;
        }

        // c) Product Target
        let targetMatch = false;
        if (config.targetType === 'Category' && categoryId && config.targetIds.includes(categoryId)) targetMatch = true;
        else if (config.targetType === 'SubCategory' && subCategoryId && config.targetIds.includes(subCategoryId)) targetMatch = true;
        else if (config.targetType === 'SKU' && skuVariantId && config.targetIds.includes(skuVariantId)) targetMatch = true;

        if (!targetMatch) continue;

        // d) User Limit Check
        const maxUsers = Number(config.maxUsers || 0);
        if (maxUsers > 0) {
            const [userCountRes] = await tx.select({ count: sql<number>`count(distinct user_id)` })
                .from(mechanicTransactionLogs)
                .where(and(
                    eq(mechanicTransactionLogs.schemeId, scheme.id),
                    eq(mechanicTransactionLogs.category, 'SCHEME_BOOSTER')
                ));
            const userCount = Number(userCountRes?.count || 0);

            const [userExists] = await tx.select({ id: mechanicTransactionLogs.id })
                .from(mechanicTransactionLogs)
                .where(and(
                    eq(mechanicTransactionLogs.schemeId, scheme.id),
                    eq(mechanicTransactionLogs.userId, data.userId),
                    eq(mechanicTransactionLogs.category, 'SCHEME_BOOSTER')
                ))
                .limit(1);

            if (userCount >= maxUsers && !userExists) continue;
        }

        // 4. Calculate Points
        let boosterPoints = 0;
        if (config.rewardType === 'Fixed') {
            boosterPoints = Number(config.rewardValue);
        } else if (config.rewardType === 'Percentage') {
            boosterPoints = Math.round((Number(config.rewardValue) / 100) * data.points);
        }

        if (boosterPoints > 0) {
            // e) Budget Limit Check (Point Leakage Prevention)
            const maxBudget = Number(scheme.budget || 0);
            const spentBudget = Number(scheme.spentBudget || 0);
            if (maxBudget > 0 && (spentBudget + boosterPoints) > maxBudget) {
                console.log(`[BoosterEngine] Budget exhausted for scheme ${scheme.name}`);
                continue;
            }

            // 5. Insert Booster Transaction
            await tx.insert(mechanicTransactionLogs).values({
                userId: data.userId,
                earningType: 9, // QR Scan
                points: boosterPoints.toString(),
                category: 'SCHEME_BOOSTER',
                status: 'approved',
                qrCode: data.serialNumber,
                sku: data.sku,
                schemeId: scheme.id,
                remarks: `Booster Reward: ${scheme.name} (${config.rewardValue}${config.rewardType === 'Percentage' ? '%' : ' Pts'})`,
                metadata: {
                    baseTransactionId: data.baseTransactionId,
                    schemeName: scheme.name,
                    rewardType: config.rewardType,
                    rewardValue: config.rewardValue,
                    processedAt: new Date().toISOString()
                }
            });

            // 6. Update Spent Budget in Scheme Table
            await tx.update(schemes)
                .set({ spentBudget: sql`${schemes.spentBudget} + ${boosterPoints}` })
                .where(eq(schemes.id, scheme.id));

            // 7. Update Mechanic Balance
            const [m] = await tx.select().from(mechanics).where(eq(mechanics.userId, data.userId)).limit(1);
            if (m) {
                await tx.update(mechanics)
                    .set({
                        pointsBalance: (Number(m.pointsBalance) + boosterPoints).toString(),
                        totalEarnings: (Number(m.totalEarnings) + boosterPoints).toString(),
                        redeemablePoints: (Number(m.redeemablePoints) + boosterPoints).toString()
                    })
                    .where(eq(mechanics.userId, data.userId));
            }
        }
    }
}
