'use server'

import { db } from '@/db';
import { schemes, schemeTypes, skuEntity, skuVariant, userTypeEntity, pincodeMaster, auditLogs, users } from '@/db/schema';
import { eq, and, sql, desc, ilike, inArray } from 'drizzle-orm';
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
