'use server'

import { db } from "@/db"
import { users, userTypeEntity, userScopeMapping, locationEntity, mechanics, retailers, distributors } from "@/db/schema"
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

        const result = await (async () => {
            if (isAdmin) {
                return await getFullHierarchy();
            } else if (role === 'TSM') {
                const stateIds = userScope.entityIds;
                return await getTSMHierarchy(stateIds, userId, userScope.entityNames);
            } else if (role === 'SR') {
                const cities = userScope.entityNames;
                return await getSRHierarchy(cities, userId, session.user.name || 'Me');
            }
            return [];
        })();

        return JSON.parse(JSON.stringify(result));
    } catch (error) {
        console.error("Error in getTeamHierarchyAction:", error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
}

async function getFullHierarchy(): Promise<TeamMember[]> {
    const salesHeads = await db.select({
        id: users.id,
        name: users.name,
        role: userTypeEntity.typeName
    })
    .from(users)
    .innerJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
    .where(eq(userTypeEntity.typeName, 'SALES HEAD'));

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

    const allMechs = await db.select({
        userId: mechanics.userId,
        name: mechanics.name,
        city: mechanics.city,
        attachedRetailerId: mechanics.attachedRetailerId
    }).from(mechanics);

    const allRets = await db.select({
        userId: retailers.userId,
        name: retailers.name,
        city: retailers.city,
        attachedDistributorId: (retailers as any).attachedDistributorId
    }).from(retailers);

    const matchedSrIds = new Set<number>();

    const allDistributors = await db.select({
        id: users.id,
        name: users.name,
        city: distributors.city
    })
    .from(users)
    .innerJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
    .innerJoin(distributors, eq(users.id, distributors.userId))
    .where(or(eq(userTypeEntity.typeName, 'Distributor'), eq(userTypeEntity.typeName, 'DISTRIBUTOR')));

    // Map SRs to TSMs
    const tsmHierarchy: TeamMember[] = tsms.map(tsm => {
        const tsmSrs = srs.filter(sr => sr.parentStateId === tsm.scopeEntityId);
        tsmSrs.forEach(sr => matchedSrIds.add(sr.id));

        return {
            id: tsm.id,
            name: tsm.name || 'Unknown',
            role: 'TSM',
            scopeType: tsm.scopeType || 'State',
            scopeName: tsm.scopeName || 'Unknown',
            children: tsmSrs.map(sr => {
                const srDistributors = allDistributors.filter(d => d.city?.toLowerCase() === sr.scopeName?.toLowerCase());
                
                return {
                    id: sr.id,
                    name: sr.name || 'Unknown',
                    role: 'SR',
                    scopeType: sr.scopeType || 'City',
                    scopeName: sr.scopeName || 'Unknown',
                    children: [
                        ...srDistributors.map(dist => ({
                            id: dist.id,
                            name: dist.name || 'Unknown Distributor',
                            role: 'Distributor',
                            scopeType: 'City',
                            scopeName: dist.city || 'Unknown',
                            children: allRets
                                .filter(ret => (ret as any).attachedDistributorId === dist.id)
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
                                })) as TeamMember[]
                        } as TeamMember)),
                        ...(allRets.some(ret => !(ret as any).attachedDistributorId && ret.city?.toLowerCase() === sr.scopeName?.toLowerCase()) || 
                            allMechs.some(m => !m.attachedRetailerId && m.city?.toLowerCase() === sr.scopeName?.toLowerCase()) ? [{
                            id: -(sr.id + 1000000), 
                            name: 'Direct Retailers',
                            role: 'Distributor',
                            scopeType: 'City',
                            scopeName: sr.scopeName || 'Unknown',
                            children: [
                                ...allRets
                                    .filter(ret => !(ret as any).attachedDistributorId && ret.city?.toLowerCase() === sr.scopeName?.toLowerCase())
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
                                    })),
                                ...(allMechs.some(m => !m.attachedRetailerId && m.city?.toLowerCase() === sr.scopeName?.toLowerCase()) ? [{
                                    id: -(sr.id + 2000000), 
                                    name: 'Direct Mechanic',
                                    role: 'Retailer',
                                    scopeType: 'City',
                                    scopeName: sr.scopeName || 'Unknown',
                                    children: allMechs
                                        .filter(m => !m.attachedRetailerId && m.city?.toLowerCase() === sr.scopeName?.toLowerCase())
                                        .map(m => ({
                                            id: m.userId,
                                            name: m.name || 'Unknown Mechanic',
                                            role: 'Mechanic',
                                            scopeType: 'City',
                                            scopeName: m.city || 'Unknown'
                                        }))
                                }] : [])
                            ]
                        }] : [])
                    ]
                };
            })
        };
    });

    const orphanedSrs = srs.filter(sr => !matchedSrIds.has(sr.id));
    if (orphanedSrs.length > 0) {
        const stateGroups: Record<string, typeof orphanedSrs> = {};
        orphanedSrs.forEach(sr => {
            const state = sr.parentStateId ? `State ID: ${sr.parentStateId}` : 'No State';
            if (!stateGroups[state]) stateGroups[state] = [];
            stateGroups[state].push(sr);
        });

        Object.entries(stateGroups).forEach(([stateLabel, group]) => {
            tsmHierarchy.push({
                id: -(Math.floor(Math.random() * 1000000)),
                name: `Unassigned SRs (${stateLabel})`,
                role: 'TSM',
                scopeType: 'State',
                scopeName: 'N/A',
                children: group.map(sr => {
                    const srRetailers = allRets.filter(r => r.city?.toLowerCase() === sr.scopeName?.toLowerCase());
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
                                } as TeamMember))
                        } as TeamMember))
                    } as TeamMember;
                })
            } as TeamMember);
        });
    }

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

    const lowerStateNames = stateNames.map(s => s.toLowerCase());

    const allMechs = await db.select({
        userId: mechanics.userId,
        name: mechanics.name,
        city: mechanics.city,
        attachedRetailerId: mechanics.attachedRetailerId
    }).from(mechanics)
    .where(inArray(sql`LOWER(${mechanics.state})`, lowerStateNames));

    const allRets = await db.select({
        userId: retailers.userId,
        name: retailers.name,
        city: retailers.city,
        attachedDistributorId: (retailers as any).attachedDistributorId
    }).from(retailers)
    .where(inArray(sql`LOWER(${retailers.state})`, lowerStateNames));

    const allDistributors = await db.select({
        id: users.id,
        name: users.name,
        city: distributors.city
    })
    .from(users)
    .innerJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
    .innerJoin(userScopeMapping, eq(users.id, userScopeMapping.userId))
    .innerJoin(locationEntity, eq(userScopeMapping.scopeEntityId, locationEntity.id))
    .innerJoin(distributors, eq(users.id, distributors.userId))
    .where(and(
        or(eq(userTypeEntity.typeName, 'Distributor'), eq(userTypeEntity.typeName, 'DISTRIBUTOR')),
        inArray(locationEntity.parentEntityId, stateIds),
        eq(userScopeMapping.isActive, true)
    ));

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
                ...allDistributors
                    .filter(d => d.city?.toLowerCase() === sr.scopeName?.toLowerCase())
                    .map(dist => ({
                        id: dist.id,
                        name: dist.name || 'Unknown Distributor',
                        role: 'Distributor',
                        scopeType: 'City',
                        scopeName: dist.city || 'Unknown',
                        children: allRets
                            .filter(ret => (ret as any).attachedDistributorId === dist.id)
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
                    })),
                ...(allRets.some(ret => !(ret as any).attachedDistributorId && ret.city?.toLowerCase() === sr.scopeName?.toLowerCase()) ||
                    allMechs.some(m => !m.attachedRetailerId && m.city?.toLowerCase() === sr.scopeName?.toLowerCase()) ? [{
                    id: -(sr.id + 1000000), 
                    name: 'Direct Retailers',
                    role: 'Distributor',
                    scopeType: 'City',
                    scopeName: sr.scopeName || 'Unknown',
                    children: [
                        ...allRets
                            .filter(ret => !(ret as any).attachedDistributorId && ret.city?.toLowerCase() === sr.scopeName?.toLowerCase())
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
                            })),
                        ...(allMechs.some(m => !m.attachedRetailerId && m.city?.toLowerCase() === sr.scopeName?.toLowerCase()) ? [{
                            id: -(sr.id + 2000000), 
                            name: 'Direct Mechanic',
                            role: 'Retailer',
                            scopeType: 'City',
                            scopeName: sr.scopeName || 'Unknown',
                            children: allMechs
                                .filter(m => !m.attachedRetailerId && m.city?.toLowerCase() === sr.scopeName?.toLowerCase())
                                .map(m => ({
                                    id: m.userId,
                                    name: m.name || 'Unknown Mechanic',
                                    role: 'Mechanic',
                                    scopeType: 'City',
                                    scopeName: m.city || 'Unknown'
                                }))
                        }] : [])
                    ]
                }] : [])
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

    const lowerCities = cities.map(c => c.toLowerCase());
    const rets = await db.select({
        id: retailers.id,
        userId: retailers.userId,
        name: retailers.name,
        city: retailers.city,
        attachedDistributorId: (retailers as any).attachedDistributorId
    })
    .from(retailers)
    .where(inArray(sql`LOWER(${retailers.city})`, lowerCities));

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

    const allDistributors = await db.select({
        id: users.id,
        name: users.name,
        city: distributors.city
    })
    .from(users)
    .innerJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
    .innerJoin(userScopeMapping, eq(users.id, userScopeMapping.userId))
    .innerJoin(locationEntity, eq(userScopeMapping.scopeEntityId, locationEntity.id))
    .innerJoin(distributors, eq(users.id, distributors.userId))
    .where(and(
        or(eq(userTypeEntity.typeName, 'Distributor'), eq(userTypeEntity.typeName, 'DISTRIBUTOR')),
        inArray(sql`LOWER(${locationEntity.name})`, lowerCities),
        eq(userScopeMapping.isActive, true)
    ));

    return [{
        id: srId,
        name: srName,
        role: 'SR',
        scopeType: 'City',
        scopeName: cities.join(', '),
        children: [
            ...allDistributors.map(dist => ({
                id: dist.id,
                name: dist.name || 'Unknown Distributor',
                role: 'Distributor',
                scopeType: 'City',
                scopeName: dist.city || 'Unknown',
                children: rets
                    .filter(ret => (ret as any).attachedDistributorId === dist.id)
                    .map(ret => ({
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
            })),
            ...(rets.some(ret => !(ret as any).attachedDistributorId) || mechs.some(m => !m.attachedRetailerId) ? [{
                id: -(srId + 1000000), 
                name: 'Direct Retailers',
                role: 'Distributor',
                scopeType: 'City',
                scopeName: cities.join(', '),
                children: [
                    ...rets
                        .filter(ret => !(ret as any).attachedDistributorId)
                        .map(ret => ({
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
                        })),
                    ...(mechs.some(m => !m.attachedRetailerId) ? [{
                        id: -(srId + 2000000), 
                        name: 'Direct Mechanic',
                        role: 'Retailer',
                        scopeType: 'City',
                        scopeName: cities.join(', '),
                        children: mechs
                            .filter(m => !m.attachedRetailerId)
                            .map(m => ({
                                id: m.userId,
                                name: m.name || 'Unknown Mechanic',
                                role: 'Mechanic',
                                scopeType: 'City',
                                scopeName: m.city || 'Unknown'
                            }))
                    }] : [])
                ]
            }] : [])
        ]
    }];
}
