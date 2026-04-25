'use server';

import { db } from '@/db';
import { userTypeEntity, skuPointConfig, skuPointRules, skuVariant, skuEntity, skuLevelMaster, redemptionChannels, retailerTransactions, electricianTransactions, counterSalesTransactions } from '@/db/schema';
import { emitEvent, BUS_EVENTS } from '@/server/rabbitMq/broker';
import { eq, desc, sql as sqlTag, and, inArray } from 'drizzle-orm';

export interface StakeholderType {
    id: string;
    name: string;
    code?: string;
    desc: string;
    status: string;
    maxDailyScans: number;
    requiredKycLevel: string;
    allowedRedemptionChannels: number[];
}

export interface PointsRule {
    id: string;
    stakeholder: string;
    categoryHeader: string;
    categoryItem: string;
    base: string;
    mult: string;
    from: string;
    status: string;
    ruleType: 'Base' | 'Override';
    maxScansPerDay?: number;
    description?: string;
    rawValue?: number;
}

export interface SkuNode {
    id: string;
    label: string;
    code?: string;
    levelName: string;
    children?: SkuNode[];
}

export interface SkuPerformance {
    name: string;
    scans: number;
    category: string;
}

export async function getMastersDataAction() {
    try {
        // 1. Fetch Stakeholders from userTypeEntity
        const stakeholders = await db.select({
            id: userTypeEntity.id,
            typeName: userTypeEntity.typeName,
            isActive: userTypeEntity.isActive,
            maxDailyScans: userTypeEntity.maxDailyScans,
            requiredKycLevel: userTypeEntity.requiredKycLevel,
            allowedRedemptionChannels: userTypeEntity.allowedRedemptionChannels
        }).from(userTypeEntity).orderBy(desc(userTypeEntity.id));

        const stakeholderTypes: StakeholderType[] = stakeholders.map(s => ({
            id: s.id.toString(),
            name: s.typeName,
            desc: s.typeName + ' Role',
            status: s.isActive ? 'Active' : 'Inactive',
            maxDailyScans: s.maxDailyScans || 50,
            requiredKycLevel: s.requiredKycLevel || 'Basic',
            allowedRedemptionChannels: (s.allowedRedemptionChannels as number[]) || []
        }));

        // 2. Fetch Points Config (Base Points)
        // Join with UserType and SkuVariant to get names
        const configs = await db
            .select({
                id: skuPointConfig.id,
                userType: userTypeEntity.typeName,
                variantName: skuVariant.variantName,
                entityName: skuEntity.name,
                points: skuPointConfig.pointsPerUnit,
                validFrom: skuPointConfig.validFrom,
                isActive: skuPointConfig.isActive,
                maxScansPerDay: skuPointConfig.maxScansPerDay
            })
            .from(skuPointConfig)
            .leftJoin(userTypeEntity, eq(skuPointConfig.userTypeId, userTypeEntity.id))
            .leftJoin(skuVariant, eq(skuPointConfig.skuVariantId, skuVariant.id))
            .leftJoin(skuEntity, eq(skuVariant.skuEntityId, skuEntity.id));

        const configRules: PointsRule[] = configs.map(c => ({
            id: `CFG-${c.id}`,
            stakeholder: c.userType || 'All',
            categoryHeader: c.entityName || 'General',
            categoryItem: c.variantName || 'All Variants',
            base: c.points ? `${c.points} Pts` : '0 Pts',
            mult: '1.0x',
            from: c.validFrom ? new Date(c.validFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            status: c.isActive ? 'Active' : 'Inactive',
            ruleType: 'Base',
            maxScansPerDay: c.maxScansPerDay || 5,
            rawValue: Number(c.points)
        }));

        // 3. Fetch Points Rules (Override Rules)
        const rules = await db
            .select({
                id: skuPointRules.id,
                name: skuPointRules.name,
                userType: userTypeEntity.typeName,
                skuEntityName: skuEntity.name,
                skuVariantName: skuVariant.variantName,
                actionType: skuPointRules.actionType,
                actionValue: skuPointRules.actionValue,
                validFrom: skuPointRules.validFrom,
                isActive: skuPointRules.isActive,
                description: skuPointRules.description,
                parentEntityName: sqlTag.raw('parent_entity.name') as any
            })
            .from(skuPointRules)
            .leftJoin(userTypeEntity, eq(skuPointRules.userTypeId, userTypeEntity.id))
            .leftJoin(skuVariant, eq(skuPointRules.skuVariantId, skuVariant.id))
            .leftJoin(skuEntity, eq(skuPointRules.skuEntityId, skuEntity.id))
            .leftJoin(sqlTag.raw('sku_entity parent_entity') as any, eq(skuEntity.parentEntityId, sqlTag.raw('parent_entity.id')));

        console.log(rules.length);
        const overrideRules: PointsRule[] = rules.map(r => {
            let header = 'General';
            let item = 'All SKUs';

            if (r.skuVariantName) {
                header = r.skuEntityName || 'General';
                item = r.skuVariantName;
            } else if (r.skuEntityName) {
                header = (r as any).parentEntityName || 'Category';
                item = r.skuEntityName;
            }

            return {
                id: `RULE-${r.id}`,
                stakeholder: r.userType || 'All',
                categoryHeader: header,
                categoryItem: item,
                base: r.actionType === 'FLAT_OVERRIDE' ? `${r.actionValue} Pts` : '---',
                mult: r.actionType === 'PERCENTAGE_ADD' ? `+${r.actionValue}%` : r.actionType === 'FIXED_ADD' ? `+${r.actionValue} Pts` : '---',
                from: r.validFrom ? new Date(r.validFrom).toISOString().split('T')[0] : '---',
                status: r.isActive ? 'Active' : 'Inactive',
                ruleType: 'Override',
                description: r.description || ''
            };
        });

        // Combine
        const pointsMatrix = [...configRules, ...overrideRules];

        // 4. Fetch SKU Hierarchy (skuEntity joined with skuLevelMaster)
        const skuEntities = await db
            .select({
                id: skuEntity.id,
                name: skuEntity.name,
                code: skuEntity.code,
                parentEntityId: skuEntity.parentEntityId,
                levelName: skuLevelMaster.levelName
            })
            .from(skuEntity)
            .leftJoin(skuLevelMaster, eq(skuEntity.levelId, skuLevelMaster.id));

        // Build tree recursively or via map
        const buildSkuTree = (items: any[], parentId: number | null = null): SkuNode[] => {
            return items
                .filter(item => item.parentEntityId === parentId)
                .map(item => ({
                    id: item.id.toString(),
                    label: item.name,
                    code: item.code,
                    levelName: item.levelName || 'Unknown',
                    children: buildSkuTree(items, item.id)
                }));
        };

        const skuHierarchy = buildSkuTree(skuEntities);

        // Fetch redemption channels for UI
        const redemptionChannelsRows = await db.select({ id: redemptionChannels.id, name: redemptionChannels.name, isActive: redemptionChannels.isActive }).from(redemptionChannels).orderBy(desc(redemptionChannels.id));
        const redemptionChannelsList = redemptionChannelsRows.map(r => ({ id: Number(r.id), name: r.name, isActive: Boolean(r.isActive) }));

        // 5. Fetch SKU Performance (Aggregate scans from all transaction tables)
        const q1 = db.select({ sku: retailerTransactions.sku }).from(retailerTransactions);
        const q2 = db.select({ sku: electricianTransactions.sku }).from(electricianTransactions);
        const q3 = db.select({ sku: counterSalesTransactions.sku }).from(counterSalesTransactions);

        const unionSq = q1.unionAll(q2).unionAll(q3).as('t');

        const performanceData = await db
            .select({
                skuCode: unionSq.sku,
                count: sqlTag`count(*)`.mapWith(Number)
            })
            .from(unionSq)
            .groupBy(unionSq.sku)
            .orderBy(desc(sqlTag`count(*)`))
            .limit(5);

        // Join with skuEntity to get names (assuming t.sku matches skuEntity.code)
        const topSkus = await Promise.all(performanceData.map(async (p) => {
            const entity = await db.select({
                name: skuEntity.name,
                category: skuLevelMaster.levelName
            })
                .from(skuEntity)
                .leftJoin(skuLevelMaster, eq(skuEntity.levelId, skuLevelMaster.id))
                .where(eq(skuEntity.code, p.skuCode))
                .limit(1);

            return {
                name: entity[0]?.name || p.skuCode,
                scans: p.count,
                category: entity[0]?.category || 'General'
            };
        }));

        return {
            stakeholderTypes,
            pointsMatrix,
            skuHierarchy,
            topSkus,
            redemptionChannels: redemptionChannelsList
        };

    } catch (error) {
        console.error("Error fetching masters data:", error);
        // Returning empty or mock on error to prevent UI crash
        return {
            stakeholderTypes: [],
            pointsMatrix: [],
            skuHierarchy: [],
            topSkus: []
        };
    }
}

export async function updateStakeholderConfigAction(data: {
    id: number;
    maxDailyScans: number;
    requiredKycLevel: string;
    allowedRedemptionChannels: number[];
}) {
    try {
        await db.update(userTypeEntity)
            .set({
                maxDailyScans: data.maxDailyScans,
                requiredKycLevel: data.requiredKycLevel,
                allowedRedemptionChannels: data.allowedRedemptionChannels
            })
            .where(eq(userTypeEntity.id, data.id));

        await emitEvent(BUS_EVENTS.MEMBER_MASTER_CONFIG_UPDATE, {
            entityId: data.id.toString(),
            metadata: data
        });
        return { success: true };

    } catch (error) {
        console.error("Error updating stakeholder config:", error);
        return { success: false, error: "Failed to update configuration" };
    }
}

export async function upsertPointsMatrixRuleAction(data: {
    id?: number;
    name: string;
    clientId: number;
    userTypeId?: number;
    skuEntityId?: number;
    skuVariantId?: number;
    actionType: string;
    actionValue: number;
    description?: string;
    isActive: boolean;
    validFrom?: string;
    validTo?: string;
}) {
    try {
        if (data.id) {
            await db.update(skuPointRules)
                .set({
                    name: data.name,
                    userTypeId: data.userTypeId,
                    skuEntityId: data.skuEntityId,
                    skuVariantId: data.skuVariantId,
                    actionType: data.actionType as any,
                    actionValue: data.actionValue.toString(),
                    description: data.description,
                    isActive: data.isActive,
                    validFrom: data.validFrom ? new Date(data.validFrom).toISOString() : null,
                    validTo: data.validTo ? new Date(data.validTo).toISOString() : null
                })
                .where(eq(skuPointRules.id, data.id));

            await emitEvent(BUS_EVENTS.SKU_RULE_MODIFY, {
                entityId: data.id.toString(),
                metadata: data
            });
        } else {
            const result = await db.insert(skuPointRules).values({
                name: data.name,
                clientId: data.clientId,
                userTypeId: data.userTypeId,
                skuEntityId: data.skuEntityId,
                skuVariantId: data.skuVariantId,
                actionType: data.actionType as any,
                actionValue: data.actionValue.toString(),
                description: data.description,
                isActive: data.isActive,
                validFrom: data.validFrom ? new Date(data.validFrom).toISOString() : null,
                validTo: data.validTo ? new Date(data.validTo).toISOString() : null
            }).returning();

            await emitEvent(BUS_EVENTS.SKU_RULE_MODIFY, {
                entityId: result[0].id.toString(),
                metadata: data
            });
        }
        return { success: true };
    } catch (error) {
        console.error("Error upserting points matrix rule:", error);
        return { success: false, error: "Failed to save rule" };
    }
}

export async function upsertSkuPointConfigAction(data: {
    id?: number;
    clientId: number;
    userTypeId?: number;
    skuEntityId?: number;
    skuVariantId?: number;
    pointsPerUnit: number;
    maxScansPerDay?: number;
    validFrom?: string;
    validTo?: string;
    isActive: boolean;
}) {
    console.log("calleddd.....")
    try {
        if (data.id) {
            await db.update(skuPointConfig)
                .set({
                    clientId: data.clientId,
                    userTypeId: data.userTypeId,
                    skuVariantId: data.skuVariantId,
                    pointsPerUnit: data.pointsPerUnit.toString(),
                    maxScansPerDay: data.maxScansPerDay,
                    validFrom: data.validFrom ? new Date(data.validFrom).toISOString() : null,
                    validTo: data.validTo ? new Date(data.validTo).toISOString() : null,
                    isActive: data.isActive,
                })
                .where(eq(skuPointConfig.id, data.id));

            await emitEvent(BUS_EVENTS.SKU_POINT_CHANGE, {
                entityId: data.id.toString(),
                metadata: data
            });
        } else {
            if (!data.userTypeId || !data.skuVariantId) {
                return { success: false, error: "User Type and SKU Variant are required." };
            }
            const result = await db.insert(skuPointConfig).values({
                clientId: data.clientId,
                userTypeId: data.userTypeId,
                skuVariantId: data.skuVariantId,
                pointsPerUnit: data.pointsPerUnit.toString(),
                maxScansPerDay: data.maxScansPerDay,
                validFrom: data.validFrom ? new Date(data.validFrom).toISOString() : null,
                validTo: data.validTo ? new Date(data.validTo).toISOString() : null,
                isActive: data.isActive,
            }).returning();

            await emitEvent(BUS_EVENTS.SKU_POINT_CHANGE, {
                entityId: result[0].id.toString(),
                metadata: data
            });
        }
        return { success: true };
    } catch (error) {
        console.error("Error upserting SKU point config:", error);
        return { success: false, error: "Failed to save SKU point config" };
    }
}

export async function updateSkuPointConfigForEntityAction(data: {
    clientId: number;
    userTypeId?: number;
    entityId: number;
    pointsPerUnit: number;
    maxScansPerDay?: number;
    validFrom?: string;
    validTo?: string;
    isActive: boolean;
}) {
    try {
        // Use a recursive CTE in the DB to collect subtree entity ids, then select variant ids under them
        const variantRows = await db.select({ id: sqlTag.raw('t.id') as any }).from(sqlTag.raw(`(
            WITH RECURSIVE subtree AS (
                SELECT id FROM sku_entity WHERE id = ${data.entityId}
                UNION ALL
                SELECT e.id FROM sku_entity e JOIN subtree s ON e.parent_entity_id = s.id
            )
            SELECT v.id FROM sku_variant v WHERE v.sku_entity_id IN (SELECT id FROM subtree)
        ) as t`));

        const variantIds = variantRows.map(v => Number((v as any).id));

        if (variantIds.length === 0) {
            return { success: false, error: 'No SKU variants found under selected entity' };
        }

        // We need a userTypeId to create new configs. If not provided, we can only update existing ones
        // or we need to know which user types to apply to.
        // For now, if userTypeId is provided, we will upsert for all variants in subtree for that userType.

        if (data.userTypeId) {
            for (const variantId of variantIds) {
                // Upsert logic using find/update or insert
                const existing = await db.select()
                    .from(skuPointConfig)
                    .where(and(
                        eq(skuPointConfig.clientId, data.clientId),
                        eq(skuPointConfig.skuVariantId, variantId),
                        eq(skuPointConfig.userTypeId, data.userTypeId)
                    ))
                    .limit(1);

                if (existing.length > 0) {
                    await db.update(skuPointConfig).set({
                        pointsPerUnit: data.pointsPerUnit.toString(),
                        maxScansPerDay: data.maxScansPerDay,
                        validFrom: data.validFrom ? new Date(data.validFrom).toISOString() : null,
                        validTo: data.validTo ? new Date(data.validTo).toISOString() : null,
                        isActive: data.isActive
                    }).where(eq(skuPointConfig.id, existing[0].id));
                } else {
                    await db.insert(skuPointConfig).values({
                        clientId: data.clientId,
                        skuVariantId: variantId,
                        userTypeId: data.userTypeId,
                        pointsPerUnit: data.pointsPerUnit.toString(),
                        maxScansPerDay: data.maxScansPerDay,
                        validFrom: data.validFrom ? new Date(data.validFrom).toISOString() : null,
                        validTo: data.validTo ? new Date(data.validTo).toISOString() : null,
                        isActive: data.isActive
                    });
                }
            }
        } else {
            // If no userTypeId, update ALL existing configs for these variants (across all user types)
            await db.update(skuPointConfig).set({
                pointsPerUnit: data.pointsPerUnit.toString(),
                maxScansPerDay: data.maxScansPerDay,
                validFrom: data.validFrom ? new Date(data.validFrom).toISOString() : null,
                validTo: data.validTo ? new Date(data.validTo).toISOString() : null,
                isActive: data.isActive
            }).where(and(
                eq(skuPointConfig.clientId, data.clientId),
                inArray(skuPointConfig.skuVariantId, variantIds)
            ));
        }

        return { success: true, message: 'Updated SKU point configurations' };
    } catch (error) {
        console.error('Error updating SKU point configs for entity:', error);
        return { success: false, error: 'Failed to update SKU point configs' };
    }
}

export async function deletePointsMatrixRuleAction(id: number) {
    try {
        await db.update(skuPointRules).set({
            isActive: false
        }).where(eq(skuPointRules.id, id));
        await emitEvent(BUS_EVENTS.SKU_RULE_MODIFY, {
            entityId: id.toString(),
            metadata: { id }
        });
        return { success: true };
    } catch (error) {
        console.error("Error deleting points matrix rule:", error);
        return { success: false, error: "Failed to delete rule" };
    }
}
