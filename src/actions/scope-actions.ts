'use server'

import { db } from "@/db"
import { locationEntity, locationLevelMaster, userScopeMapping } from "@/db/schema"
import { eq, and, inArray } from "drizzle-orm"

export async function getStatesAction() {
    try {
        const stateLevel = await db.select()
            .from(locationLevelMaster)
            .where(eq(locationLevelMaster.levelName, 'State'))
            .limit(1);

        if (stateLevel.length === 0) return [];

        return await db.select({
            id: locationEntity.id,
            name: locationEntity.name,
        })
        .from(locationEntity)
        .where(eq(locationEntity.levelId, stateLevel[0].id));
    } catch (error) {
        console.error("Error fetching states:", error);
        return [];
    }
}

export async function getCitiesAction() {
    try {
        const cityLevel = await db.select()
            .from(locationLevelMaster)
            .where(eq(locationLevelMaster.levelName, 'City'))
            .limit(1);

        if (cityLevel.length === 0) return [];

        return await db.select({
            id: locationEntity.id,
            name: locationEntity.name,
        })
        .from(locationEntity)
        .where(eq(locationEntity.levelId, cityLevel[0].id));
    } catch (error) {
        console.error("Error fetching cities:", error);
        return [];
    }
}

export async function getUserScopesAction(userId: number) {
    try {
        return await db.select({
            id: userScopeMapping.id,
            scopeType: userScopeMapping.scopeType,
            scopeEntityId: userScopeMapping.scopeEntityId,
        })
        .from(userScopeMapping)
        .where(and(eq(userScopeMapping.userId, userId), eq(userScopeMapping.isActive, true)));
    } catch (error) {
        console.error("Error fetching user scopes:", error);
        return [];
    }
}

export async function updateUserScopesAction(userId: number, scopes: { type: 'State' | 'City', entityIds: number[] }) {
    try {
        // 1. Deactivate existing scopes
        await db.update(userScopeMapping)
            .set({ isActive: false })
            .where(eq(userScopeMapping.userId, userId));

        // 2. Insert new scopes
        if (scopes.entityIds.length > 0) {
            const values = scopes.entityIds.map(id => ({
                userId,
                scopeType: scopes.type,
                scopeEntityId: id,
                scopeLevelId: 0, // We can determine this if needed, but entityId is unique enough
                isActive: true
            }));
            await db.insert(userScopeMapping).values(values);
        }

        return { success: true };
    } catch (error) {
        console.error("Error updating user scopes:", error);
        return { success: false, error: "Failed to update scopes" };
    }
}
