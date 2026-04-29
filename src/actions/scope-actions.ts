'use server'

import { db } from "@/db"
import { locationEntity, locationLevelMaster, userScopeMapping, users } from "@/db/schema"
import { eq, and, inArray, ne } from "drizzle-orm"

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
        // Validation: Only one SR allowed per city
        const user = await db.select({ roleId: users.roleId }).from(users).where(eq(users.id, userId)).limit(1);
        const userRoleId = user[0]?.roleId;

        if (userRoleId === 16 && scopes.type === 'City') {
            for (const entityId of scopes.entityIds) {
                const [existingSR] = await db.select({ name: users.name })
                    .from(userScopeMapping)
                    .innerJoin(users, eq(userScopeMapping.userId, users.id))
                    .where(and(
                        eq(userScopeMapping.scopeEntityId, entityId),
                        eq(userScopeMapping.scopeType, 'City'),
                        eq(userScopeMapping.isActive, true),
                        eq(users.roleId, 16),
                        ne(users.id, userId)
                    ))
                    .limit(1);
                
                if (existingSR) {
                    return { success: false, error: `The city is already assigned to SR: ${existingSR.name}. Only one SR is allowed per city.` };
                }
            }
        }

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
                scopeLevelId: scopes.type === 'State' ? 4 : (scopes.type === 'City' ? 5 : 0),
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
