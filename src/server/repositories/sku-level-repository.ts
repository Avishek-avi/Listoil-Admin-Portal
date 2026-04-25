
import { db } from "@/db/index";
import { skuEntity, skuLevelMaster, skuVariant } from "../../db/schema";
import { eq, and } from "drizzle-orm";

class SkuLevelRepository {
    // Fetch L1 values
    async fetchL1() {
        return await db
            .select({
                id: skuEntity.id,
                name: skuEntity.name,
                isActive: skuEntity.isActive,
            })
            .from(skuEntity)
            .innerJoin(
                skuLevelMaster,
                and(
                    eq(skuEntity.levelId, skuLevelMaster.id),
                    eq(skuLevelMaster.levelNo, 1)
                )
            )
            .where(eq(skuEntity.isActive, true));
    }

    // Fetch L2 values (optional parent L1)
    async fetchL2(l1Id?: number) {
        let whereConditions = [
            eq(skuLevelMaster.levelNo, 2),
            eq(skuEntity.isActive, true)
        ];

        if (l1Id) {
            whereConditions.push(eq(skuEntity.parentEntityId, l1Id));
        }

        return await db
            .select({
                id: skuEntity.id,
                name: skuEntity.name,
                l1Id: skuEntity.parentEntityId,
                isActive: skuEntity.isActive,
            })
            .from(skuEntity)
            .innerJoin(
                skuLevelMaster,
                eq(skuEntity.levelId, skuLevelMaster.id)
            )
            .where(and(...whereConditions));
    }

    // Fetch L3 values (optional parent L2)
    async fetchL3(l1Id?: number, l2Id?: number) {
        let whereConditions = [
            eq(skuLevelMaster.levelNo, 3),
            eq(skuEntity.isActive, true)
        ];

        if (l2Id) {
            whereConditions.push(eq(skuEntity.parentEntityId, l2Id));
        }

        return await db
            .select({
                id: skuEntity.id,
                name: skuEntity.name,
                l2Id: skuEntity.parentEntityId,
                isActive: skuEntity.isActive,
            })
            .from(skuEntity)
            .innerJoin(
                skuLevelMaster,
                eq(skuEntity.levelId, skuLevelMaster.id)
            )
            .where(and(...whereConditions));
    }

    // Fetch L4 values (optional parent L3)
    async fetchL4(l1Id?: number, l2Id?: number, l3Id?: number) {
        let whereConditions = [
            eq(skuLevelMaster.levelNo, 4),
            eq(skuEntity.isActive, true)
        ];

        if (l3Id) {
            whereConditions.push(eq(skuEntity.parentEntityId, l3Id));
        }

        return await db
            .select({
                id: skuEntity.id,
                name: skuEntity.name,
                l3Id: skuEntity.parentEntityId,
                isActive: skuEntity.isActive,
            })
            .from(skuEntity)
            .innerJoin(
                skuLevelMaster,
                eq(skuEntity.levelId, skuLevelMaster.id)
            )
            .where(and(...whereConditions));
    }

    // Fetch L5 values (optional parent L4)
    async fetchL5(l1Id?: number, l2Id?: number, l3Id?: number, l4Id?: number) {
        let whereConditions = [
            eq(skuLevelMaster.levelNo, 5),
            eq(skuEntity.isActive, true)
        ];

        if (l4Id) {
            whereConditions.push(eq(skuEntity.parentEntityId, l4Id));
        }

        return await db
            .select({
                id: skuEntity.id,
                name: skuEntity.name,
                l4Id: skuEntity.parentEntityId,
                isActive: skuEntity.isActive,
            })
            .from(skuEntity)
            .innerJoin(
                skuLevelMaster,
                eq(skuEntity.levelId, skuLevelMaster.id)
            )
            .where(and(...whereConditions));
    }

    // Fetch L6 values (optional parent L5)
    async fetchL6(l1Id?: number, l2Id?: number, l3Id?: number, l4Id?: number, l5Id?: number) {
        let whereConditions = [
            eq(skuLevelMaster.levelNo, 6),
            eq(skuEntity.isActive, true)
        ];

        if (l5Id) {
            whereConditions.push(eq(skuEntity.parentEntityId, l5Id));
        }

        return await db
            .select({
                id: skuEntity.id,
                name: skuEntity.name,
                l5Id: skuEntity.parentEntityId,
                isActive: skuEntity.isActive,
            })
            .from(skuEntity)
            .innerJoin(
                skuLevelMaster,
                eq(skuEntity.levelId, skuLevelMaster.id)
            )
            .where(and(...whereConditions));
    }

    // Fetch Variants (optional parent L6 or generic entity)
    async fetchVariants(skuEntityId?: number) {
        let whereConditions = [
            eq(skuVariant.isActive, true)
        ];

        if (skuEntityId) {
            whereConditions.push(eq(skuVariant.skuEntityId, skuEntityId));
        }

        return await db
            .select({
                id: skuVariant.id,
                name: skuVariant.variantName,
                skuEntityId: skuVariant.skuEntityId,
                packSize: skuVariant.packSize,
                mrp: skuVariant.mrp,
                isActive: skuVariant.isActive,
            })
            .from(skuVariant)
            .where(and(...whereConditions));
    }

    async doesVariantExist(variantName: string): Promise<boolean> {
        const result = await db
            .select({ id: skuVariant.id })
            .from(skuVariant)
            .where(eq(skuVariant.variantName, variantName))
            .limit(1);

        return result.length > 0;
    }
}

export const skuLevelRepository = new SkuLevelRepository();
