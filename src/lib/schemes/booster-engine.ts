
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
import { eq, and, ilike, sql, inArray, or } from "drizzle-orm";

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

    let metadata: any = { 
        baseTransactionId: data.baseTransactionId,
        processedAt: new Date().toISOString()
    };

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

    // 3. Find ALL Active Schemes (Booster & Slab)
    const activeSchemes = await tx.select({
        id: schemes.id,
        name: schemes.name,
        config: schemes.config,
        budget: schemes.budget,
        spentBudget: schemes.spentBudget,
        startDate: schemes.startDate,
        endDate: schemes.endDate,
        typeName: schemeTypes.name
    })
    .from(schemes)
    .innerJoin(schemeTypes, eq(schemes.schemeType, schemeTypes.id))
    .where(and(
        inArray(schemeTypes.name, ['Booster', 'Slab']),
        eq(schemes.isActive, true),
        sql`${schemes.startDate} <= NOW()`,
        sql`${schemes.endDate} >= NOW()`
    ));

    console.log(`[BoosterEngine] Found ${activeSchemes.length} active schemes for processing`);

    for (const scheme of activeSchemes) {
        const type = scheme.typeName;
        const config = (scheme.config as any)?.[type === 'Booster' ? 'booster' : 'slab'];
        if (!config) {
            console.log(`[BoosterEngine] No config found for scheme ${scheme.id} type ${type}`);
            continue;
        }

        console.log(`[BoosterEngine] Processing scheme: ${scheme.name} (${type})`);

        // Eligibility Check
        // a) Audience
        const audienceMatch = !config.audienceIds?.length || (userMeta.roleId && config.audienceIds.includes(userMeta.roleId));
        console.log(`[BoosterEngine] Audience Match: ${audienceMatch} (User: ${userMeta.roleId}, Allowed: ${config.audienceIds})`);
        if (!audienceMatch) continue;

        // b) Geography
        const geo = config.geoScope;
        if (geo) {
            const zMatch = !geo.zones?.length || geo.zones.some((z: string) => z.toLowerCase().trim() === userZone.toLowerCase().trim());
            const sMatch = !geo.states?.length || geo.states.some((s: string) => s.toLowerCase().trim() === (userMeta.state || '').toLowerCase().trim());
            const cMatch = !geo.cities?.length || geo.cities.some((c: string) => c.toLowerCase().trim() === (userMeta.city || '').toLowerCase().trim());
            
            console.log(`[BoosterEngine] Geo Match: Zone=${zMatch}, State=${sMatch}, City=${cMatch} (User: ${userZone}, ${userMeta.state}, ${userMeta.city})`);
            if (!zMatch || !sMatch || !cMatch) continue;
        }

        // c) Product Target
        let targetMatch = false;
        if (config.targetType === 'ALL') targetMatch = true;
        else if (config.targetType === 'Category' && categoryId && config.targetIds.map(String).includes(String(categoryId))) targetMatch = true;
        else if (config.targetType === 'SubCategory' && subCategoryId && config.targetIds.map(String).includes(String(subCategoryId))) targetMatch = true;
        else if (config.targetType === 'SKU' && skuVariantId && config.targetIds.map(String).includes(String(skuVariantId))) targetMatch = true;
        
        console.log(`[BoosterEngine] Target Match: ${targetMatch} (Type: ${config.targetType}, ID: ${skuVariantId}, TargetIDs: ${JSON.stringify(config.targetIds)})`);

        if (!targetMatch) continue;

        // d) User Limit Check
        const maxUsers = Number(config.maxUsers || 0);
        if (maxUsers > 0) {
            const [userCountRes] = await tx.select({ count: sql<number>`count(distinct user_id)` })
                .from(mechanicTransactionLogs)
                .where(and(
                    eq(mechanicTransactionLogs.schemeId, scheme.id),
                    inArray(mechanicTransactionLogs.category, ['SCHEME_BOOSTER', 'SCHEME_SLAB'])
                ));
            const userCount = Number(userCountRes?.count || 0);

            const [userExists] = await tx.select({ id: mechanicTransactionLogs.id })
                .from(mechanicTransactionLogs)
                .where(and(
                    eq(mechanicTransactionLogs.schemeId, scheme.id),
                    eq(mechanicTransactionLogs.userId, data.userId),
                    inArray(mechanicTransactionLogs.category, ['SCHEME_BOOSTER', 'SCHEME_SLAB'])
                ))
                .limit(1);

            if (userCount >= maxUsers && !userExists) continue;
        }

        // 4. Calculate Points
        let bonusPoints = 0;
        let remarks = '';
        let category = '';

        if (type === 'Booster') {
            category = 'SCHEME_BOOSTER';
            if (config.rewardType === 'Fixed') {
                bonusPoints = Number(config.rewardValue);
            } else if (config.rewardType === 'Percentage') {
                bonusPoints = Math.round((Number(config.rewardValue) / 100) * data.points);
            }
            remarks = `Booster Reward: ${scheme.name} (${config.rewardValue}${config.rewardType === 'Percentage' ? '%' : ' Pts'})`;
        } 
        else if (type === 'Slab') {
            category = 'SCHEME_SLAB';
            const slabConfig = config.slabConfig;
            if (!slabConfig || slabConfig.disbursalType !== 'REALTIME') continue;

            // Get current progress
            const [progressRes] = await tx.select({
                totalPoints: sql<number>`sum(cast(points as integer))`,
                scanCount: sql<number>`count(*)`
            })
            .from(mechanicTransactionLogs)
            .where(and(
                eq(mechanicTransactionLogs.userId, data.userId),
                eq(mechanicTransactionLogs.category, 'QR_SCAN'),
                // We should ideally filter by scheme date range but the query above already does that for active schemes
                // For slab progress, we count ALL scans during the scheme's validity
                sql`${mechanicTransactionLogs.createdAt} >= ${scheme.startDate}`, 
                sql`${mechanicTransactionLogs.createdAt} <= ${scheme.endDate}`
            ));

            const currentBasisValue = slabConfig.basis === 'SCAN_COUNT' 
                ? Number(progressRes?.scanCount || 0)
                : Number(progressRes?.totalPoints || 0);

            console.log(`[BoosterEngine] Slab Progress for ${scheme.id}: Basis=${slabConfig.basis}, CurrentValue=${currentBasisValue} (Scans: ${progressRes?.scanCount}, Points: ${progressRes?.totalPoints})`);

            // Find matching slab - Only trigger if the user has REACHED the max of a slab
            const matchingSlab = slabConfig.slabs.find((s: any) => 
                currentBasisValue === Number(s.max)
            );

            if (matchingSlab) {
                // Double check if this slab was already rewarded to prevent duplicates
                const [alreadyRewarded] = await tx.select({ id: mechanicTransactionLogs.id })
                    .from(mechanicTransactionLogs)
                    .where(and(
                        eq(mechanicTransactionLogs.userId, data.userId),
                        eq(mechanicTransactionLogs.schemeId, scheme.id),
                        eq(mechanicTransactionLogs.category, 'SCHEME_SLAB'),
                        sql`metadata->>'slabMax' = ${matchingSlab.max.toString()}`
                    ))
                    .limit(1);

                if (!alreadyRewarded) {
                    bonusPoints = Number(matchingSlab.rewardValue);
                    remarks = `Slab Reward Completion: ${scheme.name} (Milestone: ${matchingSlab.max} ${slabConfig.basis === 'SCAN_COUNT' ? 'Scans' : 'Pts'})`;
                    // Store the milestone in metadata so we don't repeat it
                    metadata = { 
                        ...metadata, 
                        slabMax: matchingSlab.max,
                        basisValue: currentBasisValue
                    };
                } else {
                    console.log(`[BoosterEngine] Slab milestone ${matchingSlab.max} already rewarded for user ${data.userId}`);
                }
            }
        }

        if (bonusPoints > 0) {
            // e) Budget Limit Check
            const maxBudget = Number(scheme.budget || 0);
            const spentBudget = Number(scheme.spentBudget || 0);
            if (maxBudget > 0 && (spentBudget + bonusPoints) > maxBudget) {
                console.log(`[BoosterEngine] Budget exhausted for scheme ${scheme.name}`);
                continue;
            }

            // 5. Insert Transaction
            console.log(`[BoosterEngine] Awarding ${bonusPoints} pts for scheme ${scheme.name} (${category})`);
            await tx.insert(mechanicTransactionLogs).values({
                userId: data.userId,
                earningType: 9, // QR Scan
                points: bonusPoints.toString(),
                category: category,
                status: 'approved',
                qrCode: data.serialNumber,
                sku: data.sku,
                schemeId: scheme.id,
                remarks: remarks,
                metadata: {
                    ...metadata,
                    schemeName: scheme.name,
                    schemeType: type
                }
            });

            // 6. Update Spent Budget
            await tx.update(schemes)
                .set({ spentBudget: sql`${schemes.spentBudget} + ${bonusPoints}` })
                .where(eq(schemes.id, scheme.id));

            // 7. Update Mechanic Balance
            const [m] = await tx.select().from(mechanics).where(eq(mechanics.userId, data.userId)).limit(1);
            if (m) {
                await tx.update(mechanics)
                    .set({
                        pointsBalance: (Number(m.pointsBalance) + bonusPoints).toString(),
                        totalEarnings: (Number(m.totalEarnings) + bonusPoints).toString(),
                        redeemablePoints: (Number(m.redeemablePoints) + bonusPoints).toString()
                    })
                    .where(eq(mechanics.userId, data.userId));
            }
            console.log(`[BoosterEngine] Credited ${bonusPoints} pts for scheme ${scheme.name} to user ${data.userId}`);
        }
    }
}
