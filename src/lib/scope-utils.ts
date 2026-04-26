import { db } from "@/db";
import { userScopeMapping, locationEntity, users, userTypeEntity } from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

export interface UserScope {
    type: 'State' | 'City' | 'Global';
    entityIds: number[];
    entityNames: string[];
    role: string;
    levelId: number;
    permissions: string[];
}

/**
 * Retrieves the geographical scope and permissions for a given user.
 */
export async function getUserScope(userId: number): Promise<UserScope> {
    try {
        // 1. Get user role and level
        const [user] = await db.select({
            roleName: userTypeEntity.typeName,
            levelId: userTypeEntity.levelId
        })
        .from(users)
        .innerJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
        .where(eq(users.id, userId));

        if (!user) return { type: 'Global', entityIds: [], entityNames: [], role: 'Guest', levelId: 99, permissions: [] };

        const role = user.roleName || 'Guest';
        const levelId = user.levelId || 99;

        // Define permissions based on role and level
        let permissions: string[] = [];
        const normalizedRole = role.toUpperCase();

        if (normalizedRole === 'TSM' || normalizedRole.includes('STATE MANAGER')) {
            permissions = ['dashboard.view', 'members.view', 'tickets.manage', 'mis.view'];
        } else if (normalizedRole === 'SR' || normalizedRole.includes('REPRESENTATIVE')) {
            permissions = ['dashboard.view', 'members.view', 'tickets.manage', 'mis.view'];
        } else if (levelId < 5 || normalizedRole.includes('ADMIN')) {
            permissions = ['all'];
        } else if (normalizedRole.includes('SUPPORT') || normalizedRole.includes('CALL CENTER')) {
            permissions = ['members.view', 'tickets.manage', 'process.manage'];
        } else if (normalizedRole === 'CRM' || normalizedRole.includes('MARKETING')) {
            permissions = ['members.view', 'mis.view', 'communication.manage'];
        } else if (normalizedRole.includes('MANAGER')) {
            permissions = ['dashboard.view', 'members.view', 'mis.view', 'process.manage'];
        }

        // Admin has global scope
        if (permissions.includes('all')) {
            return { type: 'Global', entityIds: [], entityNames: [], role, levelId, permissions };
        }

        // 2. Fetch scope mappings with entity names
        const mappings = await db.select({
            type: userScopeMapping.scopeType,
            entityId: userScopeMapping.scopeEntityId,
            name: locationEntity.name
        })
        .from(userScopeMapping)
        .innerJoin(locationEntity, eq(userScopeMapping.scopeEntityId, locationEntity.id))
        .where(and(eq(userScopeMapping.userId, userId), eq(userScopeMapping.isActive, true)));

        if (mappings.length === 0) {
            // Default to Global if no mapping but role is recognized? 
            // Or restrict to empty if mapping is required for TSM/SR.
            // For now, if TSM/SR has no mapping, they see nothing.
            const scopeType = role === 'TSM' ? 'State' : (role === 'SR' ? 'City' : 'Global');
            return { 
                type: scopeType as any, 
                entityIds: [], 
                entityNames: [], 
                role, 
                levelId, 
                permissions 
            };
        }

        return {
            type: mappings[0].type as any,
            entityIds: mappings.map(m => m.entityId!),
            entityNames: mappings.map(m => m.name!),
            role,
            levelId,
            permissions
        };
    } catch (error) {
        console.error("Error in getUserScope:", error);
        return { type: 'Global', entityIds: [], entityNames: [], role: 'Error', levelId: 99, permissions: [] };
    }
}
