
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
import { alias } from "drizzle-orm/pg-core";

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
        transactionDate?: string;
    }
) {
    const processingDate = data.transactionDate || new Date().toISOString();

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
        sql`LOWER(${schemeTypes.name}) IN ('booster', 'slab', 'crosssell')`,
        eq(schemes.isActive, true),
        sql`${schemes.startDate} <= ${processingDate}`,
        sql`${schemes.endDate} >= ${processingDate}`
    ))
    .for('update'); // Prevent budget race conditions

    console.log(`[BoosterEngine] Found ${activeSchemes.length} active schemes for processing`);

    for (const scheme of activeSchemes) {
        const type = scheme.typeName;
        console.log(`[BoosterEngine] Checking scheme: ${scheme.name} (ID: ${scheme.id}, Type: ${type})`);
        const config = (scheme.config as any)?.[type === 'Booster' ? 'booster' : type === 'Slab' ? 'slab' : 'crossSell'];
        if (!config) {
            console.log(`[BoosterEngine] No config found for scheme ${scheme.id} type ${type}. Available keys:`, Object.keys(scheme.config || {}));
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

        // NEW: Strict Duplicate Check - Prevent multiple rewards for the same QR + Scheme
        const [existingReward] = await tx.select({ id: mechanicTransactionLogs.id })
            .from(mechanicTransactionLogs)
            .where(and(
                eq(mechanicTransactionLogs.userId, data.userId),
                eq(mechanicTransactionLogs.schemeId, scheme.id),
                eq(mechanicTransactionLogs.qrCode, data.serialNumber),
                inArray(mechanicTransactionLogs.category, ['SCHEME_BOOSTER', 'SCHEME_SLAB', 'SCHEME_CROSSSELL'])
            ))
            .limit(1);

        if (existingReward) {
            console.log(`[BoosterEngine] Reward already processed for Scheme ${scheme.id} on QR ${data.serialNumber}`);
            continue;
        }

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

            // Get current progress - MUST filter by targetIds
            const targetType = config.targetType;
            const l6 = alias(skuEntity, 'l6');
            const l5 = alias(skuEntity, 'l5');
            const l4 = alias(skuEntity, 'l4');

            let progressQuery = tx.select({
                totalPoints: sql<number>`sum(cast(points as integer))`,
                scanCount: sql<number>`count(*)`
            })
            .from(mechanicTransactionLogs)
            .innerJoin(skuVariant, sql`(${mechanicTransactionLogs.sku} = ${skuVariant.variantName} OR EXISTS (SELECT 1 FROM ${skuEntity} WHERE ${skuEntity.id} = ${skuVariant.skuEntityId} AND (${skuEntity.name} = ${mechanicTransactionLogs.sku} OR ${skuEntity.code} = ${mechanicTransactionLogs.sku})))`)
            .innerJoin(l6, eq(skuVariant.skuEntityId, l6.id))
            .$dynamic();

            const conditions = [
                eq(mechanicTransactionLogs.userId, data.userId),
                eq(mechanicTransactionLogs.category, 'QR_SCAN'),
                sql`${mechanicTransactionLogs.createdAt} >= ${scheme.startDate}`, 
                sql`${mechanicTransactionLogs.createdAt} <= ${scheme.endDate}`
            ];

            if (targetType === 'Category') {
                progressQuery.leftJoin(l5, eq(l6.parentEntityId, l5.id))
                             .leftJoin(l4, eq(l5.parentEntityId, l4.id))
                             .where(and(...conditions, inArray(l4.id, config.targetIds)));
            } else if (targetType === 'SubCategory') {
                progressQuery.leftJoin(l5, eq(l6.parentEntityId, l5.id))
                             .where(and(...conditions, inArray(l5.id, config.targetIds)));
            } else if (targetType === 'SKU') {
                progressQuery.where(and(...conditions, inArray(skuVariant.id, config.targetIds)));
            } else {
                progressQuery.where(and(...conditions));
            }

            const [progressRes] = await progressQuery;

            const currentBasisValue = slabConfig.basis === 'SCAN_COUNT' 
                ? Number(progressRes?.scanCount || 0)
                : Number(progressRes?.totalPoints || 0);

            console.log(`[BoosterEngine] Slab Progress for ${scheme.id}: Basis=${slabConfig.basis}, CurrentValue=${currentBasisValue}`);

            // Find matching slab
            const matchingSlab = slabConfig.slabs.find((s: any) => currentBasisValue === Number(s.max));

            if (matchingSlab) {
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
                    remarks = `Slab Reward Completion: ${scheme.name} (Milestone: ${matchingSlab.max})`;
                    metadata = { ...metadata, slabMax: matchingSlab.max, basisValue: currentBasisValue };
                }
            }
        }
        else if (type === 'CrossSell') {
            category = 'SCHEME_CROSSSELL';
            const crossSellConfig = config.crossSellConfig;
            
            // Support both old format (items directly in config) and new format (slabs array)
            const slabs = crossSellConfig.slabs || (crossSellConfig.items ? [{ 
                rewardValue: crossSellConfig.rewardValue, 
                items: crossSellConfig.items 
            }] : []);

            if (!slabs.length) {
                console.log(`[BoosterEngine] CrossSell scheme ${scheme.id} has no valid slabs/items`);
                continue;
            }

            console.log(`[BoosterEngine] Checking CrossSell achievement for scheme ${scheme.id} (${slabs.length} slabs)`);

            // 1. Pre-calculate counts for all target items in this scheme to avoid redundant queries
            const targetIds = config.targetIds || [];
            const countsMap = new Map<number, number>();
            const targetType = config.targetType;

            for (const id of targetIds) {
                const conditions = [
                    eq(mechanicTransactionLogs.userId, data.userId),
                    eq(mechanicTransactionLogs.category, 'QR_SCAN'),
                    sql`${mechanicTransactionLogs.createdAt} >= ${scheme.startDate}`,
                    sql`${mechanicTransactionLogs.createdAt} <= ${scheme.endDate}`
                ];

                const l6 = alias(skuEntity, 'l6');
                const l5 = alias(skuEntity, 'l5');
                const l4 = alias(skuEntity, 'l4');

                let query = tx.select({ count: sql<number>`count(*)` })
                    .from(mechanicTransactionLogs)
                    .innerJoin(skuVariant, sql`(${mechanicTransactionLogs.sku} = ${skuVariant.variantName} OR EXISTS (SELECT 1 FROM ${skuEntity} WHERE ${skuEntity.id} = ${skuVariant.skuEntityId} AND (${skuEntity.name} = ${mechanicTransactionLogs.sku} OR ${skuEntity.code} = ${mechanicTransactionLogs.sku})))`)
                    .innerJoin(l6, eq(skuVariant.skuEntityId, l6.id))
                    .$dynamic();

                if (targetType === 'Category') {
                    query.leftJoin(l5, eq(l6.parentEntityId, l5.id))
                         .leftJoin(l4, eq(l5.parentEntityId, l4.id))
                         .where(and(...conditions, eq(l4.id, id)));
                } else if (targetType === 'SubCategory') {
                    query.leftJoin(l5, eq(l6.parentEntityId, l5.id))
                         .where(and(...conditions, eq(l5.id, id)));
                } else { // SKU
                    query.where(and(...conditions, eq(skuVariant.id, id)));
                }

                const [res] = await query;
                countsMap.set(id, Number(res?.count || 0));
            }

            // 2. Check each slab in order
            for (let i = 0; i < slabs.length; i++) {
                const slab = slabs[i];
                if (!slab.items?.length) continue;

                // Check if already rewarded for this specific slab
                const [alreadyRewarded] = await tx.select({ id: mechanicTransactionLogs.id })
                    .from(mechanicTransactionLogs)
                    .where(and(
                        eq(mechanicTransactionLogs.userId, data.userId),
                        eq(mechanicTransactionLogs.schemeId, scheme.id),
                        eq(mechanicTransactionLogs.category, 'SCHEME_CROSSSELL'),
                        sql`metadata->>'slabIndex' = ${i.toString()}`
                    ))
                    .limit(1);

                if (alreadyRewarded) continue;

                let allMet = true;
                const itemProgress = [];
                for (const item of slab.items) {
                    const count = countsMap.get(item.id) || 0;
                    itemProgress.push({ id: item.id, count, required: item.minScans });
                    if (count < item.minScans) {
                        allMet = false;
                        break;
                    }
                }

                if (allMet) {
                    console.log(`[BoosterEngine] Cross-Sell Slab ${i + 1} achievement UNLOCKED for scheme ${scheme.id}`);
                    bonusPoints = Number(slab.rewardValue);
                    remarks = `Cross-Sell Reward: ${scheme.name} (Slab ${i + 1} Achievement)`;
                    metadata = { 
                        ...metadata, 
                        slabIndex: i,
                        itemProgress,
                        achievementDate: processingDate
                    };
                    break; // Reward only the highest unrewarded slab reached in this scan
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
