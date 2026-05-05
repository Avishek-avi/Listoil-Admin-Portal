'use server'

import { db } from '@/db';
import { schemes, schemeTypes, skuEntity, skuVariant, userTypeEntity, pincodeMaster, auditLogs, users, mechanicTransactionLogs } from '@/db/schema';
import { eq, and, sql, desc, ilike, inArray, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export interface Scheme {
    id: number;
    name: string;
    schemeType: string;
    description: string | null;
    startDate: string;
    endDate: string;
    isActive: boolean;
    config: any;
    createdAt: string;
}

export async function getSchemesAction() {
    try {
        const result = await db.select({
            id: schemes.id,
            name: schemes.name,
            schemeType: schemeTypes.name,
            description: schemes.description,
            startDate: schemes.startDate,
            endDate: schemes.endDate,
            isActive: schemes.isActive,
            config: schemes.config,
            budget: schemes.budget,
            spentBudget: schemes.spentBudget,
            createdAt: schemes.createdAt
        })
        .from(schemes)
        .leftJoin(schemeTypes, eq(schemes.schemeType, schemeTypes.id))
        .orderBy(desc(schemes.createdAt));

        return JSON.parse(JSON.stringify(result));
    } catch (error) {
        console.error("Error fetching schemes:", error);
        return [];
    }
}

export async function getSchemeMasterDataAction() {
    try {
        // 1. Fetch SKU Hierarchy (Categories, Subcategories)
        const categories = await db.select({ id: skuEntity.id, name: skuEntity.name })
            .from(skuEntity)
            .where(eq(skuEntity.levelId, 11)); // L3 = Category

        const subCategories = await db.select({ id: skuEntity.id, name: skuEntity.name, parentId: skuEntity.parentEntityId })
            .from(skuEntity)
            .where(eq(skuEntity.levelId, 12)); // L4 = Subcategory

        // 2. Fetch SKUs with hierarchy (L6 -> L5 -> L4)
        const l6 = alias(skuEntity, 'l6');
        const l5 = alias(skuEntity, 'l5');
        const l4 = alias(skuEntity, 'l4');

        const skus = await db.select({ 
            id: skuVariant.id, 
            name: skuVariant.variantName, 
            entityId: skuVariant.skuEntityId, // L6 ID
            subCategoryId: l5.parentEntityId, // L4 ID (Sub-category)
            categoryId: l4.parentEntityId     // L3 ID (Category)
        })
        .from(skuVariant)
        .leftJoin(l6, eq(skuVariant.skuEntityId, l6.id))
        .leftJoin(l5, eq(l6.parentEntityId, l5.id))
        .leftJoin(l4, eq(l5.parentEntityId, l4.id));

        // 3. Fetch User Types
        const userTypes = await db.select({ id: userTypeEntity.id, name: userTypeEntity.typeName })
            .from(userTypeEntity)
            .where(eq(userTypeEntity.isActive, true));

        // 4. Fetch Geographical Data
        const zones = await db.select({ name: pincodeMaster.zone }).from(pincodeMaster).groupBy(pincodeMaster.zone);
        const states = await db.select({ name: pincodeMaster.state, zone: pincodeMaster.zone }).from(pincodeMaster).groupBy(pincodeMaster.state, pincodeMaster.zone);
        const cities = await db.select({ name: pincodeMaster.city, state: pincodeMaster.state }).from(pincodeMaster).groupBy(pincodeMaster.city, pincodeMaster.state);

        const rawResult = {
            categories,
            subCategories,
            skus,
            userTypes,
            geography: {
                zones: zones.map(z => z.name).filter(Boolean),
                states: states.map(s => ({ name: s.name, zone: s.zone })).filter(s => s.name),
                cities: cities.map(c => ({ name: c.name, state: c.state })).filter(c => c.name)
            }
        };
        return JSON.parse(JSON.stringify(rawResult));
    } catch (error) {
        console.error("Error fetching scheme master data:", error);
        return {
            categories: [],
            subCategories: [],
            skus: [],
            userTypes: [],
            geography: { zones: [], states: [], cities: [] }
        };
    }
}

export async function createSchemeAction(type: string, data: any) {
    try {
        const session = await auth();
        if (!session) throw new Error("Unauthorized");

        // Get scheme type
        const [schemeType] = await db.select().from(schemeTypes).where(ilike(schemeTypes.name, type)).limit(1);
        if (!schemeType) throw new Error(`Invalid scheme type: ${type}`);

        const config: any = {};
        if (type === 'Booster') {
            config.booster = {
                targetType: data.targetType,
                targetIds: data.targetIds,
                rewardType: data.rewardType,
                rewardValue: data.rewardValue,
                audienceIds: data.audienceIds,
                geoScope: data.geoScope,
                maxUsers: data.maxUsers || 0
            };
        } else if (type === 'Slab') {
            config.slab = {
                targetType: data.targetType,
                targetIds: data.targetIds,
                slabConfig: data.slabConfig,
                audienceIds: data.audienceIds,
                geoScope: data.geoScope,
                maxUsers: data.maxUsers || 0
            };
        } else if (type === 'CrossSell') {
            config.crossSell = {
                targetType: data.targetType,
                targetIds: data.targetIds,
                crossSellConfig: data.crossSellConfig,
                audienceIds: data.audienceIds,
                geoScope: data.geoScope,
                maxUsers: data.maxUsers || 0
            };
        }

        const [result] = await db.insert(schemes).values({
            name: data.name,
            schemeType: schemeType.id,
            description: data.description,
            startDate: data.startDate,
            endDate: data.endDate,
            budget: data.maxBudget || 0,
            targetType: data.targetType,
            targetIds: data.targetIds,
            config: config
        }).returning();

        // Add Audit Log
        await db.insert(auditLogs).values({
            tableName: 'schemes',
            recordId: result.id,
            operation: 'INSERT',
            action: `CREATE_${type.toUpperCase()}_SCHEME`,
            changedBy: Number(session.user.id),
            newState: data,
            changeSource: 'ADMIN_PORTAL'
        });

        revalidatePath('/schemes');
        return { success: true, id: result.id };
    } catch (error: any) {
        console.error(`Error creating ${type} scheme:`, error);
        return { success: false, error: error.message };
    }
}

export async function updateSchemeAction(id: number, type: string, data: any) {
    try {
        const session = await auth();
        if (!session) throw new Error("Unauthorized");

        return await db.transaction(async (tx) => {
            const [oldScheme] = await tx.select().from(schemes).where(eq(schemes.id, id)).limit(1);
            if (!oldScheme) throw new Error("Scheme not found");

            const config: any = {};
            if (type === 'Booster') {
                config.booster = {
                    targetType: data.targetType,
                    targetIds: data.targetIds,
                    rewardType: data.rewardType,
                    rewardValue: data.rewardValue,
                    audienceIds: data.audienceIds,
                    geoScope: data.geoScope,
                    maxUsers: data.maxUsers || 0
                };
            } else if (type === 'Slab') {
                config.slab = {
                    targetType: data.targetType,
                    targetIds: data.targetIds,
                    slabConfig: data.slabConfig,
                    audienceIds: data.audienceIds,
                    geoScope: data.geoScope,
                    maxUsers: data.maxUsers || 0
                };
            } else if (type === 'CrossSell') {
                config.crossSell = {
                    targetType: data.targetType,
                    targetIds: data.targetIds,
                    crossSellConfig: data.crossSellConfig,
                    audienceIds: data.audienceIds,
                    geoScope: data.geoScope,
                    maxUsers: data.maxUsers || 0
                };
            }

            await tx.update(schemes).set({
                name: data.name,
                description: data.description,
                startDate: data.startDate,
                endDate: data.endDate,
                budget: data.maxBudget || 0,
                targetType: data.targetType,
                targetIds: data.targetIds,
                config: config
            }).where(eq(schemes.id, id));

            // Add Audit Log
            const logEntry = {
                tableName: 'schemes',
                recordId: Number(id),
                operation: 'UPDATE',
                action: `UPDATE_${type.toUpperCase()}_SCHEME`,
                changedBy: Number(session.user.id),
                oldState: oldScheme,
                newState: data,
                changeSource: 'ADMIN_PORTAL'
            };
            
            console.log("[SchemesAction] Inserting audit log:", logEntry);
            await tx.insert(auditLogs).values(logEntry);

            revalidatePath('/schemes');
            console.log("[SchemesAction] Update successful for scheme", id);
            return { success: true };
        });
    } catch (error: any) {
        console.error(`[SchemesAction] Error updating ${type} scheme:`, error);
        return { success: false, error: error.message };
    }
}

export async function getSchemeAuditLogsAction() {
    try {
        console.log("[SchemesAction] Fetching audit logs for 'schemes' table...");
        const logs = await db.select()
            .from(auditLogs)
            .where(eq(auditLogs.tableName, 'schemes'))
            .orderBy(desc(auditLogs.createdAt));

        console.log(`[SchemesAction] Found ${logs.length} raw logs`);

        // Fetch users for these logs
        const userIds = [...new Set(logs.map(l => l.changedBy).filter(Boolean) as number[])];
        const logUsers = userIds.length > 0 
            ? await db.select().from(users).where(inArray(users.id, userIds))
            : [];
        
        const userMap = new Map(logUsers.map(u => [u.id, u]));

        const enrichedLogs = logs.map(log => ({
            id: log.id,
            operation: log.operation,
            action: log.action,
            recordId: log.recordId,
            oldState: log.oldState,
            newState: log.newState,
            createdAt: log.createdAt,
            userName: log.changedBy ? userMap.get(log.changedBy)?.name : 'System',
            userEmail: log.changedBy ? userMap.get(log.changedBy)?.email : 'N/A'
        }));

        console.log(`[SchemesAction] Returning ${enrichedLogs.length} enriched logs`);
        return { success: true, data: enrichedLogs };
    } catch (error: any) {
        console.error("[SchemesAction] Error fetching logs:", error);
        return { success: false, error: error.message };
    }
}

export async function getSchemeDashboardStatsAction() {
    try {
        const allSchemes = await db.select({
            id: schemes.id,
            isActive: schemes.isActive,
            startDate: schemes.startDate,
            endDate: schemes.endDate,
            budget: schemes.budget,
            spentBudget: schemes.spentBudget,
            config: schemes.config
        }).from(schemes);

        const liveSchemes = allSchemes.filter(s => 
            s.isActive && 
            new Date(s.startDate) <= new Date() && 
            new Date(s.endDate) >= new Date()
        );

        // Recalculate total spent from logs for 100% accuracy
        const [spentResult] = await db.select({
            total: sql<number>`sum(cast(points as integer))`
        })
        .from(mechanicTransactionLogs)
        .where(and(
            sql`scheme_id IS NOT NULL`,
            eq(mechanicTransactionLogs.status, 'approved')
        ));

        const totalSpent = Number(spentResult?.total || 0);
        const totalBudget = allSchemes.reduce((acc, s) => acc + (Number(s.budget) || 0), 0);

        // Calculate eligible users (rough estimate based on user types)
        const audienceIds = new Set<number>();
        liveSchemes.forEach(s => {
            const config = s.config?.booster || s.config?.slab || s.config?.crossSell;
            if (config?.audienceIds) {
                config.audienceIds.forEach((id: any) => audienceIds.add(Number(id)));
            }
        });

        let eligibleUsersCount = 0;
        if (audienceIds.size > 0) {
            const result = await db.select({ count: sql<number>`count(*)` })
                .from(users)
                .where(inArray(users.roleId, Array.from(audienceIds)));
            eligibleUsersCount = Number(result[0]?.count || 0);
        } else if (liveSchemes.length > 0) {
            const result = await db.select({ count: sql<number>`count(*)` })
                .from(users)
                .innerJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
                .where(or(eq(userTypeEntity.typeName, 'Mechanic'), eq(userTypeEntity.typeName, 'Retailer')));
            eligibleUsersCount = Number(result[0]?.count || 0);
        }

        return {
            liveSchemesCount: liveSchemes.length,
            totalBudget,
            totalSpent,
            eligibleUsersCount,
            efficiency: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
        };
    } catch (error) {
        console.error("Error in getSchemeDashboardStatsAction:", error);
        return {
            liveSchemesCount: 0,
            totalBudget: 0,
            totalSpent: 0,
            eligibleUsersCount: 0,
            efficiency: 0
        };
    }
}

export async function getSchemeParticipationReportAction(schemeId?: number) {
    try {
        const session = await auth();
        if (!session) throw new Error("Unauthorized");

        // 1. Get Schemes (Filtered if schemeId provided)
        let schemesQuery = db.select({
            id: schemes.id,
            name: schemes.name,
            schemeType: schemeTypes.name,
            startDate: schemes.startDate,
            endDate: schemes.endDate,
            config: schemes.config
        })
        .from(schemes)
        .innerJoin(schemeTypes, eq(schemes.schemeType, schemeTypes.id))
        .where(inArray(sql`LOWER(${schemeTypes.name})`, ['slab', 'crosssell']));

        if (schemeId) {
            schemesQuery = schemesQuery.where(eq(schemes.id, schemeId)) as any;
        }

        const activeSchemes = await schemesQuery;
        console.log(`[ParticipationReport] Found ${activeSchemes.length} active Slab/CrossSell schemes`);

        const reportData: any[] = [];

        for (const scheme of activeSchemes) {
            const type = scheme.schemeType;
            // Handle both Slab and Slab Based, CrossSell and Cross-Sell if they exist in DB
            const configKey = type.toLowerCase().includes('slab') ? 'slab' : 'crossSell';
            const config = (scheme.config as any)?.[configKey];
            
            if (!config) {
                console.log(`[ParticipationReport] No config found for scheme ${scheme.id} (Type: ${type}, Key: ${configKey})`);
                continue;
            }

            const targetType = config.targetType;
            const targetIds = (config.targetIds || []).map((id: any) => Number(id));

            console.log(`[ParticipationReport] Processing scheme: ${scheme.name} (ID: ${scheme.id})`);
            console.log(`[ParticipationReport] Target Type: ${targetType}, Target IDs: ${JSON.stringify(targetIds)}`);

            const l6 = alias(skuEntity, 'l6');
            const l5 = alias(skuEntity, 'l5');
            const l4 = alias(skuEntity, 'l4');

            // Fetch scans for this scheme's period
            // We use sql.raw or explicit dates to ensure proper comparison
            const scans = await db.select({
                userId: mechanicTransactionLogs.userId,
                userName: users.name,
                points: mechanicTransactionLogs.points,
                sku: mechanicTransactionLogs.sku,
                skuVariantId: skuVariant.id,
                subCategoryId: l5.id,
                categoryId: l4.id
            })
            .from(mechanicTransactionLogs)
            .innerJoin(users, eq(mechanicTransactionLogs.userId, users.id))
            .innerJoin(skuVariant, sql`(${mechanicTransactionLogs.sku} = ${skuVariant.variantName} OR EXISTS (SELECT 1 FROM ${skuEntity} WHERE ${skuEntity.id} = ${skuVariant.skuEntityId} AND (${skuEntity.name} = ${mechanicTransactionLogs.sku} OR ${skuEntity.code} = ${mechanicTransactionLogs.sku})))`)
            .innerJoin(l6, eq(skuVariant.skuEntityId, l6.id))
            .leftJoin(l5, eq(l6.parentEntityId, l5.id))
            .leftJoin(l4, eq(l5.parentEntityId, l4.id))
            .where(and(
                eq(mechanicTransactionLogs.category, 'QR_SCAN'),
                sql`CAST(${mechanicTransactionLogs.createdAt} AS DATE) >= CAST(${scheme.startDate} AS DATE)`,
                sql`CAST(${mechanicTransactionLogs.createdAt} AS DATE) <= CAST(${scheme.endDate} AS DATE)`
            ));

            console.log(`[ParticipationReport] Found ${scans.length} total scans in period for scheme ${scheme.id}`);

            const userGroups = new Map<number, any[]>();
            scans.forEach(s => {
                let match = false;
                const sCategoryId = s.categoryId ? Number(s.categoryId) : null;
                const sSubCategoryId = s.subCategoryId ? Number(s.subCategoryId) : null;
                const sSkuVariantId = s.skuVariantId ? Number(s.skuVariantId) : null;

                if (targetType === 'ALL') match = true;
                else if (targetType === 'Category' && sCategoryId && targetIds.includes(sCategoryId)) match = true;
                else if (targetType === 'SubCategory' && sSubCategoryId && targetIds.includes(sSubCategoryId)) match = true;
                else if (targetType === 'SKU' && sSkuVariantId && targetIds.includes(sSkuVariantId)) match = true;

                if (match) {
                    if (!userGroups.has(s.userId)) userGroups.set(s.userId, []);
                    userGroups.get(s.userId)!.push(s);
                }
            });

            console.log(`[ParticipationReport] Found ${userGroups.size} unique participants for scheme ${scheme.id}`);

            for (const [userId, userScans] of userGroups.entries()) {
                const userName = userScans[0].userName;
                
                if (type.toLowerCase().includes('slab')) {
                    const slabConfig = config.slabConfig;
                    if (!slabConfig) continue;

                    const basis = slabConfig.basis;
                    
                    const currentValue = basis === 'SCAN_COUNT' 
                        ? userScans.length 
                        : userScans.reduce((acc, s) => acc + (Number(s.points) || 0), 0);

                    const sortedSlabs = [...(slabConfig.slabs || [])].sort((a, b) => Number(a.min) - Number(b.min));
                    
                    let currentSlab = null;
                    let nextSlab = null;

                    for (let i = 0; i < sortedSlabs.length; i++) {
                        const slab = sortedSlabs[i];
                        if (currentValue >= Number(slab.min)) {
                            currentSlab = slab;
                        } else {
                            nextSlab = slab;
                            break;
                        }
                    }

                    if (currentSlab && !nextSlab) {
                        const idx = sortedSlabs.indexOf(currentSlab);
                        if (idx < sortedSlabs.length - 1) {
                            nextSlab = sortedSlabs[idx + 1];
                        }
                    } else if (!currentSlab && sortedSlabs.length > 0) {
                        nextSlab = sortedSlabs[0];
                    }

                    const totalMax = sortedSlabs.length > 0 ? Math.max(...sortedSlabs.map(s => Number(s.max))) : 1;
                    const progress = (currentValue / totalMax) * 100;
                    const pending = nextSlab ? Math.max(0, Number(nextSlab.min) - currentValue) : Math.max(0, totalMax - currentValue);

                    reportData.push({
                        userId,
                        userName,
                        schemeId: scheme.id,
                        schemeName: scheme.name,
                        schemeType: 'Slab',
                        basis,
                        currentValue,
                        currentSlab: currentSlab ? `${currentSlab.min} - ${currentSlab.max}` : 'None',
                        nextSlab: nextSlab ? `${nextSlab.min} - ${nextSlab.max}` : (currentValue >= totalMax ? 'Max Reached' : `Target: ${totalMax}`),
                        pendingToNext: pending,
                        progress: Math.min(progress, 100).toFixed(1)
                    });
                } 
                else if (type.toLowerCase().includes('crosssell')) {
                    const crossSellConfig = config.crossSellConfig;
                    const slabs = crossSellConfig?.slabs || [];
                    
                    let achievedSlabIdx = -1;
                    
                    const slabDetails = slabs.map((slab: any, idx: number) => {
                        const items = slab.items || [];
                        const itemProgress = items.map((item: any) => {
                            let count = 0;
                            const itemId = Number(item.id);
                            if (targetType === 'Category') {
                                count = userScans.filter(s => Number(s.categoryId) === itemId).length;
                            } else if (targetType === 'SubCategory') {
                                count = userScans.filter(s => Number(s.subCategoryId) === itemId).length;
                            } else {
                                count = userScans.filter(s => Number(s.skuVariantId) === itemId).length;
                            }
                            return { id: itemId, count, required: item.minScans };
                        });

                        const isAchieved = itemProgress.every((p: any) => p.count >= p.required);
                        return { idx, isAchieved, itemProgress };
                    });

                    achievedSlabIdx = slabDetails.map((s: any) => s.isAchieved).lastIndexOf(true);
                    let nextSlabIdx = achievedSlabIdx + 1;

                    if (nextSlabIdx < slabs.length) {
                        const targetSlab = slabDetails[nextSlabIdx];
                        const pendingItems = targetSlab.itemProgress
                            .filter((p: any) => p.count < p.required)
                            .map((p: any) => `${p.required - p.count} more of ID:${p.id}`)
                            .join(', ');

                        const avgProgress = targetSlab.itemProgress.reduce((acc: number, p: any) => acc + (Math.min(p.count / p.required, 1) * 100), 0) / targetSlab.itemProgress.length;

                        reportData.push({
                            userId,
                            userName,
                            schemeId: scheme.id,
                            schemeName: scheme.name,
                            schemeType: 'CrossSell',
                            basis: 'Combination',
                            currentValue: `${achievedSlabIdx + 1} Slabs Achieved`,
                            currentSlab: achievedSlabIdx >= 0 ? `Slab ${achievedSlabIdx + 1}` : 'None',
                            nextSlab: `Slab ${nextSlabIdx + 1}`,
                            pendingToNext: pendingItems || 'None',
                            progress: avgProgress.toFixed(1)
                        });
                    } else if (achievedSlabIdx >= 0) {
                        reportData.push({
                            userId,
                            userName,
                            schemeId: scheme.id,
                            schemeName: scheme.name,
                            schemeType: 'CrossSell',
                            basis: 'Combination',
                            currentValue: `${achievedSlabIdx + 1} Slabs Achieved`,
                            currentSlab: `Slab ${achievedSlabIdx + 1}`,
                            nextSlab: 'Max Achieved',
                            pendingToNext: 0,
                            progress: 100
                        });
                    }
                }
            }
        }

        return { success: true, data: reportData };
    } catch (error: any) {
        console.error("Error in getSchemeParticipationReportAction:", error);
        return { success: false, error: error.message };
    }
}
