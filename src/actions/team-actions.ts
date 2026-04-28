'use server'

import { db } from "@/db"
import { users, userTypeEntity, userScopeMapping, locationEntity, mechanics, retailers } from "@/db/schema"
import { eq, and, inArray, sql, or } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { getUserScope } from "@/lib/scope-utils"

export interface TeamMember {
    id: number;
    name: string;
    role: string;
    scopeType: string;
    scopeName: string;
    children?: TeamMember[];
}

export async function getTeamHierarchyAction(): Promise<TeamMember[]> {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");
        
        const userId = Number(session.user.id);
        const userScope = await getUserScope(userId);
        
        const isAdmin = userScope.permissions.includes('all');
        const role = userScope.role.toUpperCase();

        if (isAdmin) {
            // 1. National Admin View: Fetch all TSMs and their SRs
            return await getFullHierarchy();
        } else if (role === 'TSM') {
            // 2. TSM View: Fetch only SRs mapped to their states
            const stateIds = userScope.entityIds;
            return await getTSMHierarchy(stateIds, userId, userScope.entityNames);
        } else if (role === 'SR') {
            // 3. SR View: Fetch users/retailers mapped to their cities
            const cities = userScope.entityNames;
            return await getSRHierarchy(cities, userId, session.user.name || 'Me');
        }

        return [];
    } catch (error) {
        console.error("Error in getTeamHierarchyAction:", error);
        throw error;
    }
}

async function getFullHierarchy(): Promise<TeamMember[]> {
    // Fetch all TSMs
    const tsms = await db.select({
        id: users.id,
        name: users.name,
        role: userTypeEntity.typeName,
        scopeType: userScopeMapping.scopeType,
        scopeEntityId: userScopeMapping.scopeEntityId,
        scopeName: locationEntity.name
    })
    .from(users)
    .innerJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
    .innerJoin(userScopeMapping, eq(users.id, userScopeMapping.userId))
    .innerJoin(locationEntity, eq(userScopeMapping.scopeEntityId, locationEntity.id))
    .where(eq(userTypeEntity.typeName, 'TSM'));

    // Fetch all SRs
    const srs = await db.select({
        id: users.id,
        name: users.name,
        role: userTypeEntity.typeName,
        scopeType: userScopeMapping.scopeType,
        scopeEntityId: userScopeMapping.scopeEntityId,
        scopeName: locationEntity.name,
        parentStateId: locationEntity.parentEntityId
    })
    .from(users)
    .innerJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
    .innerJoin(userScopeMapping, eq(users.id, userScopeMapping.userId))
    .innerJoin(locationEntity, eq(userScopeMapping.scopeEntityId, locationEntity.id))
    .where(eq(userTypeEntity.typeName, 'SR'));

    // Fetch all Mechanics and Retailers
    const allMechs = await db.select({
        userId: mechanics.userId,
        name: mechanics.name,
        city: mechanics.city
    }).from(mechanics);

    const allRets = await db.select({
        userId: retailers.userId,
        name: retailers.name,
        city: retailers.city
    }).from(retailers);

    // Map SRs to TSMs
    return tsms.map(tsm => ({
        id: tsm.id,
        name: tsm.name || 'Unknown',
        role: 'TSM',
        scopeType: tsm.scopeType || 'State',
        scopeName: tsm.scopeName || 'Unknown',
        children: srs
            .filter(sr => sr.parentStateId === tsm.scopeEntityId)
            .map(sr => ({
                id: sr.id,
                name: sr.name || 'Unknown',
                role: 'SR',
                scopeType: sr.scopeType || 'City',
                scopeName: sr.scopeName || 'Unknown',
                children: [
                    ...allMechs
                        .filter(m => m.city === sr.scopeName)
                        .map(m => ({
                            id: m.userId,
                            name: m.name || 'Unknown Mechanic',
                            role: 'Mechanic',
                            scopeType: 'City',
                            scopeName: m.city || 'Unknown'
                        })),
                    ...allRets
                        .filter(r => r.city === sr.scopeName)
                        .map(r => ({
                            id: r.userId,
                            name: r.name || 'Unknown Retailer',
                            role: 'Retailer',
                            scopeType: 'City',
                            scopeName: r.city || 'Unknown'
                        }))
                ]
            }))
    }));
}

async function getTSMHierarchy(stateIds: number[], tsmId: number, stateNames: string[]): Promise<TeamMember[]> {
    // Fetch SRs under these state IDs
    const srs = await db.select({
        id: users.id,
        name: users.name,
        role: userTypeEntity.typeName,
        scopeType: userScopeMapping.scopeType,
        scopeName: locationEntity.name,
        parentStateId: locationEntity.parentEntityId
    })
    .from(users)
    .innerJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
    .innerJoin(userScopeMapping, eq(users.id, userScopeMapping.userId))
    .innerJoin(locationEntity, eq(userScopeMapping.scopeEntityId, locationEntity.id))
    .where(and(
        eq(userTypeEntity.typeName, 'SR'),
        inArray(locationEntity.parentEntityId, stateIds)
    ));

    // Fetch all Mechanics and Retailers in these states
    const allMechs = await db.select({
        userId: mechanics.userId,
        name: mechanics.name,
        city: mechanics.city
    }).from(mechanics)
    .where(inArray(mechanics.state, stateNames));

    const allRets = await db.select({
        userId: retailers.userId,
        name: retailers.name,
        city: retailers.city
    }).from(retailers)
    .where(inArray(retailers.state, stateNames));

    return [{
        id: tsmId,
        name: 'My Territory',
        role: 'TSM',
        scopeType: 'State',
        scopeName: stateNames.join(', '),
        children: srs.map(sr => ({
            id: sr.id,
            name: sr.name || 'Unknown',
            role: 'SR',
            scopeType: sr.scopeType || 'City',
            scopeName: sr.scopeName || 'Unknown',
            children: [
                ...allMechs
                    .filter(m => m.city === sr.scopeName)
                    .map(m => ({
                        id: m.userId,
                        name: m.name || 'Unknown Mechanic',
                        role: 'Mechanic',
                        scopeType: 'City',
                        scopeName: m.city || 'Unknown'
                    })),
                ...allRets
                    .filter(r => r.city === sr.scopeName)
                    .map(r => ({
                        id: r.userId,
                        name: r.name || 'Unknown Retailer',
                        role: 'Retailer',
                        scopeType: 'City',
                        scopeName: r.city || 'Unknown'
                    }))
            ]
        }))
    }];
}
async function getSRHierarchy(cities: string[], srId: number, srName: string): Promise<TeamMember[]> {
    if (cities.length === 0) {
        return [{
            id: srId,
            name: srName,
            role: 'SR',
            scopeType: 'City',
            scopeName: 'None',
            children: []
        }];
    }

    // Fetch Mechanics in these cities
    const mechs = await db.select({
        id: mechanics.id,
        userId: mechanics.userId,
        name: mechanics.name,
        city: mechanics.city
    })
    .from(mechanics)
    .where(inArray(mechanics.city, cities));

    // Fetch Retailers in these cities
    const rets = await db.select({
        id: retailers.id,
        userId: retailers.userId,
        name: retailers.name,
        city: retailers.city
    })
    .from(retailers)
    .where(inArray(retailers.city, cities));

    return [{
        id: srId,
        name: srName,
        role: 'SR',
        scopeType: 'City',
        scopeName: cities.join(', '),
        children: [
            ...mechs.map(m => ({
                id: m.userId,
                name: m.name || 'Unknown Mechanic',
                role: 'Mechanic',
                scopeType: 'City',
                scopeName: m.city || 'Unknown'
            })),
            ...rets.map(r => ({
                id: r.userId,
                name: r.name || 'Unknown Retailer',
                role: 'Retailer',
                scopeType: 'City',
                scopeName: r.city || 'Unknown'
            }))
        ]
    }];
}
