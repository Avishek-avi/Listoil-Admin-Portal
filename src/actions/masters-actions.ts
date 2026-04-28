'use server';

import { db } from '@/db';
import { userTypeEntity, skuPointConfig, skuPointRules, skuVariant, skuEntity, skuLevelMaster, redemptionChannels, retailerTransactions, mechanicTransactions, counterSalesTransactions, users, approvalStatuses, pincodeMaster } from '@/db/schema';
import { emitEvent, BUS_EVENTS } from '@/server/rabbitMq/broker';
import { eq, desc, sql, sql as sqlTag, and, inArray, or, ilike } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

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

        const pointsMatrix = [...configRules, ...overrideRules];

        // 4. Fetch SKU Hierarchy
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

        // Fetch redemption channels
        const redemptionChannelsRows = await db.select({ id: redemptionChannels.id, name: redemptionChannels.name, isActive: redemptionChannels.isActive }).from(redemptionChannels).orderBy(desc(redemptionChannels.id));
        const redemptionChannelsList = redemptionChannelsRows.map(r => ({ id: Number(r.id), name: r.name, isActive: Boolean(r.isActive) }));

        // 5. SKU Performance
        const q1 = db.select({ sku: retailerTransactions.sku }).from(retailerTransactions);
        const q2 = db.select({ sku: mechanicTransactions.sku }).from(mechanicTransactions);
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

        // 6. Stakeholder Statistics (Real counts)
        const statsResult = await db.select({
            roleId: users.roleId,
            typeName: userTypeEntity.typeName,
            count: sqlTag`count(*)`
        })
            .from(users)
            .leftJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
            .groupBy(users.roleId, userTypeEntity.typeName);

        const totalCount = statsResult.reduce((acc, s) => acc + Number(s.count), 0);
        const stakeholderStats = statsResult.map(s => ({
            label: `Total ${s.typeName}s`,
            value: Number(s.count).toLocaleString(),
            percent: totalCount > 0 ? Math.round((Number(s.count) / totalCount) * 100) : 0
        }));

        // Growth and Pending Stats
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const [newUsersCount] = await db.select({ count: sqlTag`count(*)` }).from(users).where(sqlTag`${users.createdAt} >= ${weekAgo.toISOString()}`);
        
        const [pendingKycCount] = await db.select({ count: sqlTag`count(*)` })
            .from(users)
            .innerJoin(sqlTag.raw('approval_statuses') as any, eq(users.approvalStatusId, sqlTag.raw('approval_statuses.id')))
            .where(sqlTag.raw("approval_statuses.name = 'KYC_PENDING'"));

        const dynamicMessages = [
            `${Number(newUsersCount.count).toLocaleString()} new members added this week`,
            `${Number(pendingKycCount.count).toLocaleString()} members pending KYC verification`
        ];

        return {
            stakeholderTypes,
            pointsMatrix,
            skuHierarchy,
            topSkus,
            redemptionChannels: redemptionChannelsList,
            stakeholderStats,
            dynamicMessages
        };

    } catch (error) {
        console.error("Error fetching masters data:", error);
        return {
            stakeholderTypes: [],
            pointsMatrix: [],
            skuHierarchy: [],
            topSkus: [],
            stakeholderStats: [],
            dynamicMessages: []
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

        if (data.userTypeId) {
            for (const variantId of variantIds) {
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
export async function getPincodeMasterAction(page: number = 1, limit: number = 50, search: string = '') {
    try {
        const conditions = [];
        if (search) {
            conditions.push(or(
                ilike(pincodeMaster.pincode, `%${search}%`),
                ilike(pincodeMaster.city, `%${search}%`),
                ilike(pincodeMaster.state, `%${search}%`),
                ilike(pincodeMaster.zone, `%${search}%`)
            ));
        }

        const query = db.select().from(pincodeMaster);
        if (conditions.length > 0) {
            // @ts-ignore
            query.where(and(...conditions));
        }

        const list = await query
            .limit(limit)
            .offset((page - 1) * limit)
            .orderBy(desc(pincodeMaster.id));

        const [totalResult] = await db.select({ count: sqlTag`count(*)` }).from(pincodeMaster);
        
        return {
            list,
            total: Number(totalResult.count)
        };
    } catch (error) {
        console.error("Error fetching pincode master:", error);
        return { list: [], total: 0 };
    }
}

export async function getProductMasterAction(page: number = 1, limit: number = 50, search: string = '') {
    try {
        const e6 = alias(skuEntity, 'e6');
        const e5 = alias(skuEntity, 'e5');
        const e4 = alias(skuEntity, 'e4');
        const e3 = alias(skuEntity, 'e3');

        const conditions = [];
        if (search) {
            conditions.push(or(
                ilike(skuVariant.variantName, `%${search}%`),
                ilike(e6.name, `%${search}%`),
                ilike(e4.name, `%${search}%`),
                ilike(e3.name, `%${search}%`)
            ));
        }

        const query = db.select({
            id: skuVariant.id,
            skuEntityId: e6.id,
            productCode: e6.name,
            productName: skuVariant.variantName,
            packSize: skuVariant.packSize,
            isActive: skuVariant.isActive,
            category: e3.name,
            subCategory: e4.name,
            ratingType: e5.name
        })
        .from(skuVariant)
        .leftJoin(e6, eq(skuVariant.skuEntityId, e6.id))
        .leftJoin(e5, eq(e6.parentEntityId, e5.id))
        .leftJoin(e4, eq(e5.parentEntityId, e4.id))
        .leftJoin(e3, eq(e4.parentEntityId, e3.id));

        if (conditions.length > 0) {
            // @ts-ignore
            query.where(and(...conditions));
        }

        const list = await query
            .limit(limit)
            .offset((page - 1) * limit)
            .orderBy(desc(skuVariant.id));

        const variantIds = list.map(v => v.id);
        const points = variantIds.length > 0 ? await db.select().from(skuPointConfig).where(inArray(skuPointConfig.skuVariantId, variantIds)) : [];

        const enrichedList = list.map(v => ({
            ...v,
            points: points.filter(p => p.skuVariantId === v.id).map(p => ({
                userTypeId: p.userTypeId,
                value: p.pointsPerUnit
            }))
        }));

        const [totalResult] = await db.select({ count: sql`count(*)` }).from(skuVariant);
        
        return {
            list: enrichedList,
            total: Number(totalResult.count)
        };
    } catch (error) {
        console.error("Error fetching product master:", error);
        return { list: [], total: 0 };
    }
}
export async function updateProductMasterAction(data: {
    variantId: number;
    skuEntityId: number;
    productCode: string;
    productName: string;
    packSize: string;
    points: number;
    isActive: boolean;
}) {
    try {
        await db.transaction(async (tx) => {
            // 1. Update SKU Entity (Product Code)
            await tx.update(skuEntity)
                .set({ name: data.productCode })
                .where(eq(skuEntity.id, data.skuEntityId));

            // 2. Update Variant
            await tx.update(skuVariant)
                .set({
                    variantName: data.productName,
                    packSize: data.packSize,
                    isActive: data.isActive
                })
                .where(eq(skuVariant.id, data.variantId));

            // 3. Update Points for Mechanic (userTypeId 3)
            const [existingConfig] = await tx.select()
                .from(skuPointConfig)
                .where(and(
                    eq(skuPointConfig.skuVariantId, data.variantId),
                    eq(skuPointConfig.userTypeId, 3)
                ));

            if (existingConfig) {
                await tx.update(skuPointConfig)
                    .set({ pointsPerUnit: data.points.toString() })
                    .where(eq(skuPointConfig.id, existingConfig.id));
            } else {
                await tx.insert(skuPointConfig)
                    .values({
                        clientId: 1,
                        skuVariantId: data.variantId,
                        userTypeId: 3,
                        pointsPerUnit: data.points.toString(),
                        isActive: true
                    });
            }
        });
        return { success: true, message: "Product updated successfully" };
    } catch (error: any) {
        console.error("Error updating product:", error);
        return { success: false, message: error.message || "Failed to update product" };
    }
}
export async function getHierarchyOptionsAction() {
    try {
        const categories = await db.select({ name: skuEntity.name }).from(skuEntity).where(and(eq(skuEntity.levelId, 3), sql`name IS NOT NULL`));
        const subCategories = await db.select({ name: skuEntity.name }).from(skuEntity).where(and(eq(skuEntity.levelId, 4), sql`name IS NOT NULL`));
        const ratingTypes = await db.select({ name: skuEntity.name }).from(skuEntity).where(and(eq(skuEntity.levelId, 5), sql`name IS NOT NULL`));

        return {
            categories: Array.from(new Set(categories.map(c => c.name.trim()))).filter(Boolean).sort(),
            subCategories: Array.from(new Set(subCategories.map(c => c.name.trim()))).filter(Boolean).sort(),
            ratingTypes: Array.from(new Set(ratingTypes.map(c => c.name.trim()))).filter(Boolean).sort(),
        };
    } catch (error) {
        console.error("Error fetching hierarchy options:", error);
        return { categories: [], subCategories: [], ratingTypes: [] };
    }
}

export async function createProductAction(data: {
    category: string;
    subCategory: string;
    ratingType: string;
    productCode: string;
    productName: string;
    packSize: string;
    points: number;
}) {
    try {
        const result = await db.transaction(async (tx) => {
            // 1. Get/Create L1 (Vertical: Lubricants)
            let [l1] = await tx.select().from(skuEntity).where(and(eq(skuEntity.levelId, 1), eq(skuEntity.name, 'Lubricants')));
            if (!l1) {
                [l1] = await tx.insert(skuEntity).values({ levelId: 1, name: 'Lubricants', isActive: true }).returning();
            }

            // 2. Get/Create L2 (Range: Engine Oil)
            let [l2] = await tx.select().from(skuEntity).where(and(eq(skuEntity.levelId, 2), eq(skuEntity.name, 'Engine Oil'), eq(skuEntity.parentEntityId, l1.id)));
            if (!l2) {
                [l2] = await tx.insert(skuEntity).values({ levelId: 2, name: 'Engine Oil', parentEntityId: l1.id, isActive: true }).returning();
            }

            // 3. Get/Create L3 (Category)
            let [l3] = await tx.select().from(skuEntity).where(and(eq(skuEntity.levelId, 3), ilike(skuEntity.name, data.category), eq(skuEntity.parentEntityId, l2.id)));
            if (!l3) {
                [l3] = await tx.insert(skuEntity).values({ levelId: 3, name: data.category, parentEntityId: l2.id, isActive: true }).returning();
            }

            // 4. Get/Create L4 (Sub-Category)
            let [l4] = await tx.select().from(skuEntity).where(and(eq(skuEntity.levelId, 4), ilike(skuEntity.name, data.subCategory), eq(skuEntity.parentEntityId, l3.id)));
            if (!l4) {
                [l4] = await tx.insert(skuEntity).values({ levelId: 4, name: data.subCategory, parentEntityId: l3.id, isActive: true }).returning();
            }

            // 5. Get/Create L5 (Rating Type)
            let [l5] = await tx.select().from(skuEntity).where(and(eq(skuEntity.levelId, 5), ilike(skuEntity.name, data.ratingType), eq(skuEntity.parentEntityId, l4.id)));
            if (!l5) {
                [l5] = await tx.insert(skuEntity).values({ levelId: 5, name: data.ratingType, parentEntityId: l4.id, isActive: true }).returning();
            }

            // 6. CHECK FOR GLOBAL SKU CODE UNIQUENESS
            const [existingSku] = await tx.select().from(skuEntity).where(and(eq(skuEntity.levelId, 6), ilike(skuEntity.name, data.productCode)));
            if (existingSku) {
                throw new Error(`Product Code "${data.productCode}" already exists in the system. Codes must be unique.`);
            }

            // 7. Create L6 (Product Code)
            const [l6] = await tx.insert(skuEntity).values({ 
                levelId: 6, 
                name: data.productCode, 
                parentEntityId: l5.id, 
                isActive: true 
            }).returning();

            // 7. Create Variant
            const [variant] = await tx.insert(skuVariant).values({
                skuEntityId: l6.id,
                variantName: data.productName,
                packSize: data.packSize,
                isActive: true
            }).returning();

            // 8. Create Points Config for Mechanic (3)
            await tx.insert(skuPointConfig).values({
                clientId: 1,
                skuVariantId: variant.id,
                userTypeId: 3,
                pointsPerUnit: data.points.toString(),
                isActive: true
            });

            return { success: true, message: "Product created successfully", variantId: variant.id };
        });

        return result;
    } catch (error: any) {
        console.error("Error creating product:", error);
        return { success: false, message: error.message || "Failed to create product" };
    }
}
