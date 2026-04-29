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
    // Fetch all Sales Heads
    const salesHeads = await db.select({
        id: users.id,
        name: users.name,
        role: userTypeEntity.typeName
    })
    .from(users)
    .innerJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
    .where(eq(userTypeEntity.typeName, 'SALES HEAD'));

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
    .where(and(
        eq(userTypeEntity.typeName, 'TSM'),
        eq(userScopeMapping.isActive, true)
    ));

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
    .where(and(
        eq(userTypeEntity.typeName, 'SR'),
        eq(userScopeMapping.isActive, true)
    ));

    // Fetch all Mechanics and Retailers
    const allMechs = await db.select({
        userId: mechanics.userId,
        name: mechanics.name,
        city: mechanics.city,
        attachedRetailerId: mechanics.attachedRetailerId
    }).from(mechanics);

    const allRets = await db.select({
        userId: retailers.userId,
        name: retailers.name,
        city: retailers.city
    }).from(retailers);

    // Track matched SRs to find orphans
    const matchedSrIds = new Set<number>();

    // Map SRs to TSMs
    const tsmHierarchy = tsms.map(tsm => {
        const tsmSrs = srs.filter(sr => sr.parentStateId === tsm.scopeEntityId);
        tsmSrs.forEach(sr => matchedSrIds.add(sr.id));

        return {
            id: tsm.id,
            name: tsm.name || 'Unknown',
            role: 'TSM',
            scopeType: tsm.scopeType || 'State',
            scopeName: tsm.scopeName || 'Unknown',
            children: tsmSrs.map(sr => {
                // Get retailers for this SR's city
                const srRetailers = allRets.filter(r => r.city === sr.scopeName);
                
                return {
                    id: sr.id,
                    name: sr.name || 'Unknown',
                    role: 'SR',
                    scopeType: sr.scopeType || 'City',
                    scopeName: sr.scopeName || 'Unknown',
                    children: srRetailers.map(ret => ({
                        id: ret.userId,
                        name: ret.name || 'Unknown Retailer',
                        role: 'Retailer',
                        scopeType: 'City',
                        scopeName: ret.city || 'Unknown',
                        children: allMechs
                            .filter(m => m.attachedRetailerId === ret.userId)
                            .map(m => ({
                                id: m.userId,
                                name: m.name || 'Unknown Mechanic',
                                role: 'Mechanic',
                                scopeType: 'City',
                                scopeName: m.city || 'Unknown'
                            }))
                    }))
                };
            })
        };
    });

    // Add orphaned SRs (not under any TSM)
    const orphanedSrs = srs.filter(sr => !matchedSrIds.has(sr.id));
    if (orphanedSrs.length > 0) {
        // Group by state
        const stateGroups: Record<string, typeof orphanedSrs> = {};
        orphanedSrs.forEach(sr => {
            const state = sr.parentStateId ? `State ID: ${sr.parentStateId}` : 'No State';
            if (!stateGroups[state]) stateGroups[state] = [];
            stateGroups[state].push(sr);
        });

        Object.entries(stateGroups).forEach(([stateLabel, group]) => {
            tsmHierarchy.push({
                id: -(Math.floor(Math.random() * 1000000)), // Virtual ID
                name: `Unassigned SRs (${stateLabel})`,
                role: 'TSM',
                scopeType: 'State',
                scopeName: 'N/A',
                children: group.map(sr => {
                    const srRetailers = allRets.filter(r => r.city === sr.scopeName);
                    return {
                        id: sr.id,
                        name: sr.name || 'Unknown',
                        role: 'SR',
                        scopeType: sr.scopeType || 'City',
                        scopeName: sr.scopeName || 'Unknown',
                        children: srRetailers.map(ret => ({
                            id: ret.userId,
                            name: ret.name || 'Unknown Retailer',
                            role: 'Retailer',
                            scopeType: 'City',
                            scopeName: ret.city || 'Unknown',
                            children: allMechs
                                .filter(m => m.attachedRetailerId === ret.userId)
                                .map(m => ({
                                    id: m.userId,
                                    name: m.name || 'Unknown Mechanic',
                                    role: 'Mechanic',
                                    scopeType: 'City',
                                    scopeName: m.city || 'Unknown'
                                }))
                        }))
                    };
                })
            });
        });
    }

    // Now wrap TSM hierarchy under Sales Heads
    if (salesHeads.length > 0) {
        return salesHeads.map(sh => ({
            id: sh.id,
            name: sh.name || 'Unknown',
            role: 'SALES HEAD',
            scopeType: 'National',
            scopeName: 'All India',
            children: tsmHierarchy
        }));
    }

    return tsmHierarchy;
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
        inArray(locationEntity.parentEntityId, stateIds),
        eq(userScopeMapping.isActive, true)
    ));

    // Fetch all Mechanics and Retailers in these states
    const allMechs = await db.select({
        userId: mechanics.userId,
        name: mechanics.name,
        city: mechanics.city,
        attachedRetailerId: mechanics.attachedRetailerId
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
            children: allRets
                .filter(ret => ret.city === sr.scopeName)
                .map(ret => ({
                    id: ret.userId,
                    name: ret.name || 'Unknown Retailer',
                    role: 'Retailer',
                    scopeType: 'City',
                    scopeName: ret.city || 'Unknown',
                    children: allMechs
                        .filter(m => m.attachedRetailerId === ret.userId)
                        .map(m => ({
                            id: m.userId,
                            name: m.name || 'Unknown Mechanic',
                            role: 'Mechanic',
                            scopeType: 'City',
                            scopeName: m.city || 'Unknown'
                        }))
                }))
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

    // Fetch Retailers in these cities
    const rets = await db.select({
        id: retailers.id,
        userId: retailers.userId,
        name: retailers.name,
        city: retailers.city
    })
    .from(retailers)
    .where(inArray(retailers.city, cities));

    // Fetch Mechanics mapped to these retailers
    const retIds = rets.map(r => r.userId);
    const mechs = retIds.length > 0 ? await db.select({
        id: mechanics.id,
        userId: mechanics.userId,
        name: mechanics.name,
        city: mechanics.city,
        attachedRetailerId: mechanics.attachedRetailerId
    })
    .from(mechanics)
    .where(inArray(mechanics.attachedRetailerId, retIds)) : [];

    return [{
        id: srId,
        name: srName,
        role: 'SR',
        scopeType: 'City',
        scopeName: cities.join(', '),
        children: rets.map(ret => ({
            id: ret.userId,
            name: ret.name || 'Unknown Retailer',
            role: 'Retailer',
            scopeType: 'City',
            scopeName: ret.city || 'Unknown',
            children: mechs
                .filter(m => m.attachedRetailerId === ret.userId)
                .map(m => ({
                    id: m.userId,
                    name: m.name || 'Unknown Mechanic',
                    role: 'Mechanic',
                    scopeType: 'City',
                    scopeName: m.city || 'Unknown'
                }))
        }))
    }];
}
