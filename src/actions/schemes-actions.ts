'use server'

import { db } from '@/db';
import { schemes, schemeTypes, skuEntity, skuVariant, userTypeEntity, pincodeMaster } from '@/db/schema';
import { eq, and, sql, desc, ilike } from 'drizzle-orm';
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

        // 2. Fetch SKUs
        const skus = await db.select({ id: skuVariant.id, name: skuVariant.variantName, entityId: skuVariant.skuEntityId })
            .from(skuVariant);

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

export async function createBoosterSchemeAction(data: {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    targetType: 'Category' | 'SubCategory' | 'SKU';
    targetIds: number[];
    rewardType: 'Fixed' | 'Percentage';
    rewardValue: number;
    audienceIds: number[];
    geoScope: {
        zones: string[];
        states: string[];
        cities: string[];
    };
}) {
    try {
        const session = await auth();
        if (!session) throw new Error("Unauthorized");

        // Get or create "Booster" scheme type
        let [type] = await db.select().from(schemeTypes).where(ilike(schemeTypes.name, 'Booster'));
        if (!type) {
            [type] = await db.insert(schemeTypes).values({ name: 'Booster', description: 'Points Top-up Scheme' }).returning();
        }

        const result = await db.insert(schemes).values({
            name: data.name,
            schemeType: type.id,
            description: data.description,
            startDate: data.startDate,
            endDate: data.endDate,
            config: {
                booster: {
                    targetType: data.targetType,
                    targetIds: data.targetIds,
                    rewardType: data.rewardType,
                    rewardValue: data.rewardValue,
                    audienceIds: data.audienceIds,
                    geoScope: data.geoScope
                }
            }
        }).returning();

        revalidatePath('/schemes');
        return { success: true, id: result[0].id };
    } catch (error: any) {
        console.error("Error creating booster scheme:", error);
        return { success: false, error: error.message };
    }
}
