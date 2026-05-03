'use server'

import { db } from "@/db"
import {
    users,
    counterSalesTransactionLogs,
    retailerTransactions,
    mechanicTransactionLogs,
    counterSales,
    approvalStatuses,
    redemptions,
    userAmazonOrders,
    redemptionApprovals,
    physicalRewardsRedemptions,
    retailers,
    mechanics,
    userTypeEntity
} from "@/db/schema"

import { count, sum, sql, desc, eq, and, gte, lte, inArray, or } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { getUserScope } from "@/lib/scope-utils"

const STAKEHOLDER_ROLES = [2, 3]; // Retailer, Mechanic
const ADMIN_ROLES = [1, 9, 10, 11]; // Evolve Admin, Support Admin, Client Admin, Admin

export async function getDashboardDataAction(filters?: { 
    growthRange?: string, 
    transactionRange?: string,
    state?: string,
    city?: string
}) {
    try {
        const growthRange = filters?.growthRange || '7d';
        const transactionRange = filters?.transactionRange || '7d';
        const stateOverride = filters?.state;
        const cityOverride = filters?.city;

        const session = await auth();
        console.log("[Dashboard] User ID:", session?.user?.id, "Role:", session?.user?.role);

        if (!session?.user?.id) throw new Error("Unauthorized");
        const userId = Number(session.user.id);
        const userScope = await getUserScope(userId);
        const isAdmin = ADMIN_ROLES.includes(Number((session.user as any).roleId || session.user.role)) || userScope.permissions.includes('all');

        // Apply overrides if Admin
        let currentScopeType = userScope.type;
        let currentEntityNames = userScope.entityNames || [];

        if (isAdmin) {
            if (cityOverride) {
                currentScopeType = 'City';
                currentEntityNames = [cityOverride];
            } else if (stateOverride) {
                currentScopeType = 'State';
                currentEntityNames = [stateOverride];
            }
        }

        const lowerNames = currentEntityNames.map(n => n.toLowerCase());
        const scope = { ...userScope, type: currentScopeType, entityNames: currentEntityNames };

        console.log("[Dashboard] Effective Scope Type:", scope.type, "Entities:", scope.entityNames?.length);

        // Helper to get scope filtering condition
        const getScopeCondition = (table: any) => {
            if (scope.type === 'Global') return sql`1=1`;
            if (lowerNames.length === 0) {
                console.warn("[Dashboard] Scoped user with no entities assigned!");
                return sql`1=0`;
            }
            const field = scope.type === 'State' ? table.state : table.city;
            return inArray(sql`LOWER(${field})`, lowerNames);
        };

        // 1. Total Members (Scoped) - Retailers and Mechanics only
        let userCountQuery = db.select({ count: count() }).from(users).where(inArray(users.roleId, STAKEHOLDER_ROLES));
        if (scope.type !== 'Global') {
            userCountQuery = db.select({ count: count() })
                .from(users)
                .leftJoin(retailers, eq(users.id, retailers.userId))
                .leftJoin(mechanics, eq(users.id, mechanics.userId))
                .leftJoin(counterSales, eq(users.id, counterSales.userId))
                .where(or(
                    inArray(sql`LOWER(${retailers.state})`, lowerNames),
                    inArray(sql`LOWER(${mechanics.state})`, lowerNames),
                    inArray(sql`LOWER(${counterSales.state})`, lowerNames)
                )) as any;
            if (scope.type === 'City') {
                userCountQuery = db.select({ count: count() })
                    .from(users)
                    .leftJoin(retailers, eq(users.id, retailers.userId))
                    .leftJoin(mechanics, eq(users.id, mechanics.userId))
                    .leftJoin(counterSales, eq(users.id, counterSales.userId))
                    .where(or(
                        inArray(sql`LOWER(${retailers.city})`, lowerNames),
                        inArray(sql`LOWER(${mechanics.city})`, lowerNames),
                        inArray(sql`LOWER(${counterSales.city})`, lowerNames)
                    )) as any;
            }
        }
        const [userCount] = await userCountQuery;

        // 2. Active Members (not suspended) - Scoped - Stakeholders only
        let activeUserQuery = db.select({ count: count() }).from(users).where(and(eq(users.isSuspended, false), inArray(users.roleId, STAKEHOLDER_ROLES)));
        if (scope.type !== 'Global') {
            activeUserQuery = db.select({ count: count() })
                .from(users)
                .leftJoin(retailers, eq(users.id, retailers.userId))
                .leftJoin(mechanics, eq(users.id, mechanics.userId))
                .leftJoin(counterSales, eq(users.id, counterSales.userId))
                .where(and(
                    eq(users.isSuspended, false),
                    or(
                        inArray(sql`LOWER(${retailers.state})`, lowerNames),
                        inArray(sql`LOWER(${mechanics.state})`, lowerNames),
                        inArray(sql`LOWER(${counterSales.state})`, lowerNames)
                    )
                )) as any;
            if (scope.type === 'City') {
                activeUserQuery = db.select({ count: count() })
                    .from(users)
                    .leftJoin(retailers, eq(users.id, retailers.userId))
                    .leftJoin(mechanics, eq(users.id, mechanics.userId))
                    .leftJoin(counterSales, eq(users.id, counterSales.userId))
                    .where(and(
                        eq(users.isSuspended, false),
                        or(
                            inArray(sql`LOWER(${retailers.city})`, lowerNames),
                            inArray(sql`LOWER(${mechanics.city})`, lowerNames),
                            inArray(sql`LOWER(${counterSales.city})`, lowerNames)
                        )
                    )) as any;
            }
        }
        const [activeUserCount] = await activeUserQuery;

        // 3. Blocked Members (Suspended) - Scoped - Stakeholders only
        let blockedUserQuery = db.select({ count: count() }).from(users).where(and(eq(users.isSuspended, true), inArray(users.roleId, STAKEHOLDER_ROLES)));
        if (scope.type !== 'Global') {
            blockedUserQuery = db.select({ count: count() })
                .from(users)
                .leftJoin(retailers, eq(users.id, retailers.userId))
                .leftJoin(mechanics, eq(users.id, mechanics.userId))
                .leftJoin(counterSales, eq(users.id, counterSales.userId))
                .where(and(
                    eq(users.isSuspended, true),
                    or(
                        inArray(sql`LOWER(${retailers.state})`, lowerNames),
                        inArray(sql`LOWER(${mechanics.state})`, lowerNames),
                        inArray(sql`LOWER(${counterSales.state})`, lowerNames)
                    )
                )) as any;
            if (scope.type === 'City') {
                blockedUserQuery = db.select({ count: count() })
                    .from(users)
                    .leftJoin(retailers, eq(users.id, retailers.userId))
                    .leftJoin(mechanics, eq(users.id, mechanics.userId))
                    .leftJoin(counterSales, eq(users.id, counterSales.userId))
                    .where(and(
                        eq(users.isSuspended, true),
                        or(
                            inArray(sql`LOWER(${retailers.city})`, lowerNames),
                            inArray(sql`LOWER(${mechanics.city})`, lowerNames),
                            inArray(sql`LOWER(${counterSales.city})`, lowerNames)
                        )
                    )) as any;
            }
        }
        const [blockedUserCount] = await blockedUserQuery;

        // 4. Total Points Issued (Sum from all 3 transaction logs) - Scoped
        const csPointsQuery = db.select({ value: sum(counterSalesTransactionLogs.points) }).from(counterSalesTransactionLogs);
        const retPointsQuery = db.select({ value: sum(retailerTransactions.points) }).from(retailerTransactions);
        const mechPointsQuery = db.select({ value: sum(mechanicTransactionLogs.points) }).from(mechanicTransactionLogs);

        if (scope.type !== 'Global') {
            csPointsQuery.leftJoin(counterSales, eq(counterSalesTransactionLogs.userId, counterSales.userId))
                .where(inArray(sql`LOWER(${scope.type === 'State' ? counterSales.state : counterSales.city})`, lowerNames));
            retPointsQuery.leftJoin(retailers, eq(retailerTransactions.userId, retailers.userId))
                .where(inArray(sql`LOWER(${scope.type === 'State' ? retailers.state : retailers.city})`, lowerNames));
            mechPointsQuery.leftJoin(mechanics, eq(mechanicTransactionLogs.userId, mechanics.userId))
                .where(inArray(sql`LOWER(${scope.type === 'State' ? mechanics.state : mechanics.city})`, lowerNames));
        }

        const [csPoints] = await csPointsQuery;
        const [retPoints] = await retPointsQuery;
        const [mechPoints] = await mechPointsQuery;

        const totalPointsIssued = (Number(csPoints?.value) || 0) + (Number(retPoints?.value) || 0) + (Number(mechPoints?.value) || 0);

        // 4.5 KYC Counts (using boolean flags for accuracy)
        const [kycApprovedCount] = await db.select({ count: count() })
            .from(users)
            .leftJoin(retailers, eq(users.id, retailers.userId))
            .leftJoin(mechanics, eq(users.id, mechanics.userId))
            .leftJoin(counterSales, eq(users.id, counterSales.userId))
            .where(and(
                inArray(users.roleId, STAKEHOLDER_ROLES),
                getScopeCondition(retailers), // This will work because the helper handles it
                or(
                    eq(retailers.isKycVerified, true),
                    eq(mechanics.isKycVerified, true),
                    eq(counterSales.isKycVerified, true)
                )
            ));

        const [kycPendingCount] = await db.select({ count: count() })
            .from(users)
            .leftJoin(retailers, eq(users.id, retailers.userId))
            .leftJoin(mechanics, eq(users.id, mechanics.userId))
            .leftJoin(counterSales, eq(users.id, counterSales.userId))
            .where(and(
                inArray(users.roleId, STAKEHOLDER_ROLES),
                getScopeCondition(retailers),
                or(
                    eq(retailers.isKycVerified, false),
                    eq(mechanics.isKycVerified, false),
                    eq(counterSales.isKycVerified, false)
                ),
                // Exclude blocked/suspended if needed, but usually we show all pending
                or(eq(users.approvalStatusId, 15), eq(users.approvalStatusId, 32)) 
            ));

        const kycApproved = Number(kycApprovedCount?.count) || 0;
        const kycPending = Number(kycPendingCount?.count) || 0;

        // Segment Specific Stats - Scoped
        let retActiveQueryBuilder = db.select({ count: count() }).from(retailers).leftJoin(users, eq(retailers.userId, users.id)).$dynamic();
        let retKycQueryBuilder = db.select({ count: count() }).from(retailers).$dynamic();
        let retTotalQueryBuilder = db.select({ count: count() }).from(retailers).$dynamic();

        const [retActive] = await retActiveQueryBuilder.where(and(getScopeCondition(retailers), eq(users.isSuspended, false)));
        const [retKyc] = await retKycQueryBuilder.where(and(getScopeCondition(retailers), eq(retailers.isKycVerified, true)));
        const [retTotal] = await retTotalQueryBuilder.where(getScopeCondition(retailers));

        let mechActiveQueryBuilder = db.select({ count: count() }).from(mechanics).leftJoin(users, eq(mechanics.userId, users.id)).$dynamic();
        let mechKycQueryBuilder = db.select({ count: count() }).from(mechanics).$dynamic();
        let mechTotalQueryBuilder = db.select({ count: count() }).from(mechanics).$dynamic();

        const [mechActive] = await mechActiveQueryBuilder.where(and(getScopeCondition(mechanics), eq(users.isSuspended, false)));
        const [mechKyc] = await mechKycQueryBuilder.where(and(getScopeCondition(mechanics), eq(mechanics.isKycVerified, true)));
        const [mechTotal] = await mechTotalQueryBuilder.where(getScopeCondition(mechanics));

        // Rename for consistency with return object
        const retPointsVal = retPoints;
        const mechPointsVal = mechPoints;

        // 5. Points Redeemed (Scoped)
        const physRedeemQuery = db.select({ value: sum(physicalRewardsRedemptions.pointsDeducted) }).from(physicalRewardsRedemptions);
        const amzRedeemQuery = db.select({ value: sum(userAmazonOrders.pointsDeducted) }).from(userAmazonOrders);

        if (scope.type !== 'Global') {
            physRedeemQuery.leftJoin(users, eq(physicalRewardsRedemptions.userId, users.id))
                .leftJoin(retailers, eq(users.id, retailers.userId))
                .leftJoin(mechanics, eq(users.id, mechanics.userId))
                .leftJoin(counterSales, eq(users.id, counterSales.userId))
                .where(or(
                    inArray(sql`LOWER(${scope.type === 'State' ? retailers.state : retailers.city})`, lowerNames),
                    inArray(sql`LOWER(${scope.type === 'State' ? mechanics.state : mechanics.city})`, lowerNames),
                    inArray(sql`LOWER(${scope.type === 'State' ? counterSales.state : counterSales.city})`, lowerNames)
                ));
            amzRedeemQuery.leftJoin(users, eq(userAmazonOrders.userId, users.id))
                .leftJoin(retailers, eq(users.id, retailers.userId))
                .leftJoin(mechanics, eq(users.id, mechanics.userId))
                .leftJoin(counterSales, eq(users.id, counterSales.userId))
                .where(or(
                    inArray(sql`LOWER(${scope.type === 'State' ? retailers.state : retailers.city})`, lowerNames),
                    inArray(sql`LOWER(${scope.type === 'State' ? mechanics.state : mechanics.city})`, lowerNames),
                    inArray(sql`LOWER(${scope.type === 'State' ? counterSales.state : counterSales.city})`, lowerNames)
                ));
        }

        const [physRedeem] = await physRedeemQuery;
        const [amzRedeem] = await amzRedeemQuery;
        const totalRedeemed = (Number(physRedeem?.value) || 0) + (Number(amzRedeem?.value) || 0);

        // 6. Total Scans (Scoped)
        const csCountQuery = db.select({ count: count() }).from(counterSales);
        const retCountQuery = db.select({ count: count() }).from(retailerTransactions);
        const mechCountQuery = db.select({ count: count() }).from(mechanicTransactionLogs);

        const [csCount] = await csCountQuery.where(getScopeCondition(counterSales));

        if (scope.type !== 'Global') {
            retCountQuery.leftJoin(retailers, eq(retailerTransactions.userId, retailers.userId))
                .where(inArray(sql`LOWER(${scope.type === 'State' ? retailers.state : retailers.city})`, lowerNames));
            mechCountQuery.leftJoin(mechanics, eq(mechanicTransactionLogs.userId, mechanics.userId))
                .where(inArray(sql`LOWER(${scope.type === 'State' ? mechanics.state : mechanics.city})`, lowerNames));
        }

        const [retCount] = await retCountQuery;
        const [mechCount] = await mechCountQuery;
        const totalScans = (csCount?.count || 0) + (retCount?.count || 0) + (mechCount?.count || 0);

        console.log("[Dashboard] Primary KPI Counts - Members:", userCount?.count, "Points:", totalPointsIssued, "Scans:", totalScans);

        // KYC stats already calculated above

        // 8. Pending Approvals (Scoped)
        // Redemptions
        let pendingRedemptionsQuery = db.select({
            id: redemptionApprovals.approvalId,
            type: sql<string>`'Redemption'`,
            label: sql<string>`'Redemption Request'`,
            subLabel: users.name,
            createdAt: redemptionApprovals.createdAt
        })
            .from(redemptionApprovals)
            .leftJoin(users, eq(redemptionApprovals.userId, users.id))
            .where(eq(redemptionApprovals.approvalStatus, 'PENDING'))
            .$dynamic();
        // Scoped Pending Redemptions calculation
        let pendingRedemptionValueQuery = db.select({ value: sum(redemptionApprovals.requestedPoints) })
            .from(redemptionApprovals)
            .where(eq(redemptionApprovals.approvalStatus, 'PENDING'))
            .$dynamic();

        if (scope.type !== 'Global') {
            pendingRedemptionValueQuery = pendingRedemptionValueQuery
                .leftJoin(users, eq(redemptionApprovals.userId, users.id))
                .leftJoin(retailers, eq(users.id, retailers.userId))
                .leftJoin(mechanics, eq(users.id, mechanics.userId))
                .leftJoin(counterSales, eq(users.id, counterSales.userId))
                .where(and(
                    eq(redemptionApprovals.approvalStatus, 'PENDING'),
                    or(
                        inArray(sql`LOWER(${scope.type === 'State' ? retailers.state : retailers.city})`, lowerNames),
                        inArray(sql`LOWER(${scope.type === 'State' ? mechanics.state : mechanics.city})`, lowerNames),
                        inArray(sql`LOWER(${scope.type === 'State' ? counterSales.state : counterSales.city})`, lowerNames)
                    )
                )) as any;
        }
        const [pendingRedemptionValue] = await pendingRedemptionValueQuery;

        // Count of pending redemptions (Scoped)
        let pendingRedemptionsCountQuery = db.select({ count: count() })
            .from(redemptionApprovals)
            .where(eq(redemptionApprovals.approvalStatus, 'PENDING'))
            .$dynamic();

        if (scope.type !== 'Global') {
            pendingRedemptionsCountQuery = pendingRedemptionsCountQuery
                .leftJoin(users, eq(redemptionApprovals.userId, users.id))
                .leftJoin(retailers, eq(users.id, retailers.userId))
                .leftJoin(mechanics, eq(users.id, mechanics.userId))
                .leftJoin(counterSales, eq(users.id, counterSales.userId))
                .where(and(
                    eq(redemptionApprovals.approvalStatus, 'PENDING'),
                    or(
                        inArray(sql`LOWER(${scope.type === 'State' ? retailers.state : retailers.city})`, lowerNames),
                        inArray(sql`LOWER(${scope.type === 'State' ? mechanics.state : mechanics.city})`, lowerNames),
                        inArray(sql`LOWER(${scope.type === 'State' ? counterSales.state : counterSales.city})`, lowerNames)
                    )
                )) as any;
        }
        const [pendingRedemptions] = await pendingRedemptionsCountQuery;

        // KYC
        let pendingKycQuery = db.select({
            id: users.id,
            type: sql<string>`'KYC'`,
            label: sql<string>`CONCAT(user_type_entity.type_name, ' KYC Approval')`,
            subLabel: users.name,
            createdAt: users.createdAt
        })
            .from(users)
            .leftJoin(approvalStatuses, eq(users.approvalStatusId, approvalStatuses.id))
            .leftJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
            .where(and(

                inArray(users.roleId, STAKEHOLDER_ROLES),
                or(
                    eq(approvalStatuses.name, 'KYC_PENDING'),
                    eq(approvalStatuses.name, 'PENDING'),
                    eq(approvalStatuses.name, 'SR_APPROVED')
                )
            ))
            .$dynamic();

        if (scope.type !== 'Global') {
            pendingRedemptionsQuery = pendingRedemptionsQuery
                .leftJoin(retailers, eq(users.id, retailers.userId))
                .leftJoin(mechanics, eq(users.id, mechanics.userId))
                .leftJoin(counterSales, eq(users.id, counterSales.userId))
                .where(and(
                    eq(redemptionApprovals.approvalStatus, 'PENDING'),
                    or(
                        inArray(sql`LOWER(${scope.type === 'State' ? retailers.state : retailers.city})`, lowerNames),
                        inArray(sql`LOWER(${scope.type === 'State' ? mechanics.state : mechanics.city})`, lowerNames),
                        inArray(sql`LOWER(${scope.type === 'State' ? counterSales.state : counterSales.city})`, lowerNames)
                    )
                )) as any;

            pendingKycQuery = pendingKycQuery
                .leftJoin(retailers, eq(users.id, retailers.userId))
                .leftJoin(mechanics, eq(users.id, mechanics.userId))
                .leftJoin(counterSales, eq(users.id, counterSales.userId))
                .where(and(
                    inArray(users.roleId, STAKEHOLDER_ROLES),
                    or(
                        eq(approvalStatuses.name, 'KYC_PENDING'),
                        eq(approvalStatuses.name, 'PENDING'),
                        eq(approvalStatuses.name, 'SR_APPROVED')
                    ),
                    or(
                        inArray(sql`LOWER(${scope.type === 'State' ? retailers.state : retailers.city})`, lowerNames),
                        inArray(sql`LOWER(${scope.type === 'State' ? mechanics.state : mechanics.city})`, lowerNames),
                        inArray(sql`LOWER(${scope.type === 'State' ? counterSales.state : counterSales.city})`, lowerNames)
                    )
                )) as any;
        }

        const redemptionsList = await pendingRedemptionsQuery.limit(10);
        const kycList = await pendingKycQuery.limit(10);

        const pendingItems = [...(redemptionsList || []), ...(kycList || [])]
            .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime())
            .slice(0, 10);

        const totalPendingCount = pendingItems.length;


        // 8.5 Admin User Counts
        const [adminCount] = await db.select({ count: count() }).from(users).where(inArray(users.roleId, ADMIN_ROLES));
        const [activeAdminCount] = await db.select({ count: count() }).from(users).where(and(inArray(users.roleId, ADMIN_ROLES), eq(users.isSuspended, false)));


        // 9. Recent Transactions (Scoped)
        const csRecentQuery = db.select({
            id: counterSalesTransactionLogs.id,
            userId: counterSalesTransactionLogs.userId,
            points: counterSalesTransactionLogs.points,
            createdAt: counterSalesTransactionLogs.createdAt,
            type: sql<string>`'Counter Staff'`,
            user: users.name
        })
            .from(counterSalesTransactionLogs)
            .leftJoin(users, eq(counterSalesTransactionLogs.userId, users.id))
            .orderBy(desc(counterSalesTransactionLogs.createdAt))
            .limit(5);

        const retRecentQuery = db.select({
            id: retailerTransactions.id,
            userId: retailerTransactions.userId,
            points: retailerTransactions.points,
            createdAt: retailerTransactions.createdAt,
            type: sql<string>`'Retailer'`,
            user: users.name
        })
            .from(retailerTransactions)
            .leftJoin(users, eq(retailerTransactions.userId, users.id))
            .orderBy(desc(retailerTransactions.createdAt))
            .limit(5);

        const mechRecentQuery = db.select({
            id: mechanicTransactionLogs.id,
            userId: mechanicTransactionLogs.userId,
            points: mechanicTransactionLogs.points,
            createdAt: mechanicTransactionLogs.createdAt,
            type: sql<string>`'Mechanic'`,
            user: users.name
        })
            .from(mechanicTransactionLogs)
            .leftJoin(users, eq(mechanicTransactionLogs.userId, users.id))
            .orderBy(desc(mechanicTransactionLogs.createdAt))
            .limit(5);

        if (scope.type !== 'Global') {
            csRecentQuery.leftJoin(counterSales, eq(counterSalesTransactionLogs.userId, counterSales.userId))
                .where(inArray(sql`LOWER(${scope.type === 'State' ? counterSales.state : counterSales.city})`, lowerNames));
            retRecentQuery.leftJoin(retailers, eq(retailerTransactions.userId, retailers.userId))
                .where(inArray(sql`LOWER(${scope.type === 'State' ? retailers.state : retailers.city})`, lowerNames));
            mechRecentQuery.leftJoin(mechanics, eq(mechanicTransactionLogs.userId, mechanics.userId))
                .where(inArray(sql`LOWER(${scope.type === 'State' ? mechanics.state : mechanics.city})`, lowerNames));
        }

        const csRecent = await csRecentQuery;
        const retRecent = await retRecentQuery;
        const mechRecent = await mechRecentQuery;

        const allRecent = [...(csRecent || []), ...(retRecent || []), ...(mechRecent || [])]
            .filter(t => t && t.createdAt)
            .sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
                return dateB - dateA;
            })
            .slice(0, 5)
            .map(t => ({
                id: `#TXN-${t.id}`,
                member: t.user || 'Unknown',
                type: t.type,
                points: Number(t.points) > 0 ? `+${t.points}` : `${t.points}`,
                time: t.createdAt ? new Date(t.createdAt as string).toLocaleDateString() : '---',
                typeClass: 'badge-success',
                ptClass: 'text-green-600'
            }));


        // 10. Top Performers (Segmented & Scoped)
        const getTopPerformers = async (roleId: number) => {
            try {
                const table = roleId === 2 ? retailers : mechanics;
                const scopeCond = getScopeCondition(table);
                
                const topData = await db.select({
                    name: users.name,
                    points: sql<number>`SUM(${roleId === 2 ? retailerTransactions.points : mechanicTransactionLogs.points})`
                })
                .from(table)
                .innerJoin(users, eq(table.userId, users.id))
                .innerJoin(roleId === 2 ? retailerTransactions : mechanicTransactionLogs, eq(table.userId, roleId === 2 ? retailerTransactions.userId : mechanicTransactionLogs.userId))
                .where(scopeCond)
                .groupBy(users.id, users.name)
                .orderBy(sql`2 DESC`)
                .limit(5);

                return topData.map((p, i) => ({
                    name: p.name || 'Unknown',
                    id: roleId === 2 ? `RET-${Math.floor(2000 + Math.random() * 2000)}` : `MCH-${Math.floor(5000 + Math.random() * 2000)}`,
                    location: 'Mumbai', // Mock for now, join with locationEntity if needed
                    val: roleId === 2 ? (Number(p.points) * 100) : Number(p.points),
                    pts: `${Math.round(Number(p.points) || 0)} pts`,
                    bg: i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700',
                }));
            } catch (e) {
                console.error(`Top performers error for role ${roleId}:`, e);
                return [];
            }
        };

        const topRetailers = await getTopPerformers(2);
        const topMechanics = await getTopPerformers(3);

        // 11. Chart Data Generation Helper
        const getRangeDays = (range: string) => {
            let days = 7;
            if (range === '30d') days = 30;
            if (range === '90d') days = 90;
            if (range === '365d') days = 365;

            return Array.from({ length: days }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (days - 1 - i));
                return d.toISOString().split('T')[0];
            });
        };

        const growthDays = getRangeDays(growthRange);
        const transactionDays = getRangeDays(transactionRange);

        const safeExecute = async (query: any) => {
            try {
                const res = await db.execute(query);
                return res.rows || [];
            } catch (e) {
                console.error("Query error:", e);
                return [];
            }
        };

        const growthInterval = growthRange === '30d' ? '30 days' : growthRange === '90d' ? '90 days' : growthRange === '365d' ? '1 year' : '7 days';
        const transInterval = transactionRange === '30d' ? '30 days' : transactionRange === '90d' ? '90 days' : transactionRange === '365d' ? '1 year' : '7 days';

        const locationTable = scope.type === 'State' ? 'state' : 'city';
        const locationIn = lowerNames.map(n => `'${n.replace(/'/g, "''")}'`).join(',');
        const hasScope = scope.type !== 'Global' && lowerNames.length > 0;

        const memberGrowthRetailer = await safeExecute(sql.raw(`
            SELECT day::text, count(*) as count FROM (
                SELECT date_trunc('day', u.created_at)::date as day
                FROM users u
                ${hasScope ? `JOIN retailers r ON u.id = r.user_id` : ''}
                WHERE u.role_id = 2
                ${hasScope ? `AND LOWER(r.${locationTable}) IN (${locationIn})` : ''}
            ) t
            WHERE day >= (now() - interval '${growthInterval}')::date
            GROUP BY 1 ORDER BY 1
        `));

        const memberGrowthMechanic = await safeExecute(sql.raw(`
            SELECT day::text, count(*) as count FROM (
                SELECT date_trunc('day', u.created_at)::date as day
                FROM users u
                ${hasScope ? `JOIN mechanics m ON u.id = m.user_id` : ''}
                WHERE u.role_id = 3
                ${hasScope ? `AND LOWER(m.${locationTable}) IN (${locationIn})` : ''}
            ) t
            WHERE day >= (now() - interval '${growthInterval}')::date
            GROUP BY 1 ORDER BY 1
        `));

        const pointsRetailer = await safeExecute(sql.raw(`
            SELECT day::text, sum(points) as points FROM (
                SELECT date_trunc('day', l.created_at)::date as day, l.points 
                FROM counter_sales_transaction_logs l
                ${hasScope ? `JOIN counter_sales cs ON l.user_id = cs.user_id` : ''}
                ${hasScope ? `WHERE LOWER(cs.${locationTable}) IN (${locationIn})` : ''}
                
                UNION ALL
                
                SELECT date_trunc('day', rt.created_at)::date as day, rt.points 
                FROM retailer_transactions rt
                ${hasScope ? `JOIN retailers r ON rt.user_id = r.user_id` : ''}
                ${hasScope ? `WHERE LOWER(r.${locationTable}) IN (${locationIn})` : ''}
            ) as t
            WHERE day >= (now() - interval '${transInterval}')::date
            GROUP BY 1 ORDER BY 1
        `));

        const pointsMechanic = await safeExecute(sql.raw(`
            SELECT day::text, sum(points) as points FROM (
                SELECT date_trunc('day', mtl.created_at)::date as day, mtl.points 
                FROM mechanic_transaction_logs mtl
                ${hasScope ? `JOIN mechanics m ON mtl.user_id = m.user_id` : ''}
                ${hasScope ? `WHERE LOWER(m.${locationTable}) IN (${locationIn})` : ''}
            ) as t
            WHERE day >= (now() - interval '${transInterval}')::date
            GROUP BY 1 ORDER BY 1
        `));

        const pointsRedeemed = await safeExecute(sql.raw(`
            SELECT day::text, sum(points) as points FROM (
                SELECT date_trunc('day', prr.created_at)::date as day, prr.points_deducted as points 
                FROM physical_rewards_redemptions prr
                ${hasScope ? `
                JOIN (
                    SELECT user_id, state, city FROM retailers
                    UNION ALL
                    SELECT user_id, state, city FROM mechanics
                    UNION ALL
                    SELECT user_id, state, city FROM counter_sales
                ) loc ON prr.user_id = loc.user_id
                WHERE LOWER(loc.${locationTable}) IN (${locationIn})
                ` : ''}
                
                UNION ALL
                
                SELECT date_trunc('day', uao.created_at)::date as day, uao.points_deducted as points 
                FROM user_amazon_orders uao
                ${hasScope ? `
                JOIN (
                    SELECT user_id, state, city FROM retailers
                    UNION ALL
                    SELECT user_id, state, city FROM mechanics
                    UNION ALL
                    SELECT user_id, state, city FROM counter_sales
                ) loc ON uao.user_id = loc.user_id
                WHERE LOWER(loc.${locationTable}) IN (${locationIn})
                ` : ''}
            ) as t
            WHERE day >= (now() - interval '${transInterval}')::date
            GROUP BY 1 ORDER BY 1
        `));

        const mapToDays = (rows: any[], key: string, dayList: string[]) => {
            const map = new Map();
            rows.forEach(r => {
                let dayStr = r.day;
                if (dayStr instanceof Date) dayStr = dayStr.toISOString().split('T')[0];
                if (dayStr && typeof dayStr === 'string' && dayStr.includes('T')) dayStr = dayStr.split('T')[0];
                if (dayStr) map.set(dayStr, Number(r[key]) || 0);
            });
            return dayList.map(day => map.get(day) || 0);
        };

        // 9.5 Segment-Specific KYC & Status Breakdowns (Scoped)
        const getSegmentKyc = async (roleId: number) => {
            const table = roleId === 2 ? retailers : mechanics;
            const scopeCond = getScopeCondition(table);
            
            const [approved] = await db.select({ count: count() }).from(table).where(and(scopeCond, eq(table.isKycVerified, true)));
            const [pending] = await db.select({ count: count() }).from(table).where(and(scopeCond, eq(table.isKycVerified, false)));
            
            // For blocked, we join with users
            const [blocked] = await db.select({ count: count() })
                .from(table)
                .leftJoin(users, eq(table.userId, users.id))
                .where(and(scopeCond, eq(users.isSuspended, true)));
            
            return {
                approved: Number(approved?.count) || 0,
                pending: Number(pending?.count) || 0,
                blocked: Number(blocked?.count) || 0
            };
        };

        const retKycBreakdown = await getSegmentKyc(2);
        const mechKycBreakdown = await getSegmentKyc(3);

        // Mechanic scans in last 30 days
        const [mechRecentScans] = await db.select({ count: count() })
            .from(mechanicTransactionLogs)
            .leftJoin(mechanics, eq(mechanicTransactionLogs.userId, mechanics.userId))
            .where(and(
                getScopeCondition(mechanics),
                gte(mechanicTransactionLogs.createdAt, sql`now() - interval '30 days'`)
            ));

        const rawResult = {
            stats: {
                totalMembers: Number(userCount?.count) || 0,
                activeMembers: Number(activeUserCount?.count) || 0,
                blockedMembers: Number(blockedUserCount?.count) || 0,
                totalPointsIssued: totalPointsIssued,
                pointsRedeemed: totalRedeemed,
                totalScans: totalScans,
                kycApproved: Number(kycApproved) || 0,
                kycPending: Number(kycPending) || 0
            },
            recentActivity: allRecent,
            topPerformers: {
                retailers: topRetailers,
                mechanics: topMechanics
            },
            pendingApprovalsCount: totalPendingCount,
            pendingApprovals: {
                kyc: {
                    count: kycPending,
                    mechanics: Number(mechKycBreakdown.pending),
                    retailers: Number(retKycBreakdown.pending)
                },
                redemptions: {
                    count: Number(pendingRedemptions?.count) || 0,
                    value: Number(pendingRedemptionValue?.value) || 0 
                },
                failures: 0,
                fraud: 0
            },

            adminStats: {
                totalAdmins: Number(adminCount?.count) || 0,
                activeAdmins: Number(activeAdminCount?.count) || 0
            },
            segments: {
                retailer: {
                    points: Number(retPointsVal?.value) || 0,
                    active: Number(retActive?.count) || 0,
                    kycCompliance: Number(retTotal?.count) ? Math.round((Number(retKyc?.count) / Number(retTotal?.count)) * 100) : 0,
                    total: Number(retTotal?.count) || 0,
                    kyc: retKycBreakdown,
                    invoiceValue: Number(retPointsVal?.value) * 100 // Updated factor for more realistic value (1% loyalty assumption)
                },
                mechanic: {
                    points: Number(mechPointsVal?.value) || 0,
                    active: Number(mechActive?.count) || 0,
                    kycCompliance: Number(mechTotal?.count) ? Math.round((Number(mechKyc?.count) / Number(mechTotal?.count)) * 100) : 0,
                    total: Number(mechTotal?.count) || 0,
                    kyc: mechKycBreakdown,
                    qrScans30d: Number(mechRecentScans?.count) || 0
                }
            },
            charts: {
                memberGrowth: {
                    retailer: mapToDays(memberGrowthRetailer, 'count', growthDays),
                    mechanic: mapToDays(memberGrowthMechanic, 'count', growthDays),
                    labels: growthDays.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
                },
                pointsTransactions: {
                    retailer: mapToDays(pointsRetailer, 'points', transactionDays),
                    mechanic: mapToDays(pointsMechanic, 'points', transactionDays),
                    redeemed: mapToDays(pointsRedeemed, 'points', transactionDays),
                    labels: transactionDays.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
                }
            }
        }

        return JSON.parse(JSON.stringify(rawResult));

    } catch (error) {
        console.error("Dashboard error:", error);
        return {
            error: true,
            errorMessage: error instanceof Error ? error.message : String(error),
            stats: { totalMembers: 0, activeMembers: 0, blockedMembers: 0, totalPointsIssued: 0, pointsRedeemed: 0, totalScans: 0, kycApproved: 0, kycPending: 0 },
            recentActivity: [],
            topPerformers: { retailers: [], mechanics: [] },
            pendingApprovalsCount: 0,
            pendingApprovals: { kyc: { count: 0, mechanics: 0, retailers: 0 }, redemptions: { count: 0, value: 0 }, failures: 0, fraud: 0 },
            segments: {
                retailer: { points: 0, active: 0, kycCompliance: 0, total: 0, kyc: { approved: 0, pending: 0, blocked: 0 }, invoiceValue: 0 },
                mechanic: { points: 0, active: 0, kycCompliance: 0, total: 0, kyc: { approved: 0, pending: 0, blocked: 0 }, qrScans30d: 0 }
            },
            charts: { 
                memberGrowth: { retailer: [], mechanic: [], labels: [] }, 
                pointsTransactions: { retailer: [], mechanic: [], redeemed: [], labels: [] } 
            }
        };
    }
}

export async function getDashboardLocationsAction() {
    try {
        const { pincodeMaster } = await import("@/db/schema");
        
        const statesResult = await db.selectDistinct({ state: pincodeMaster.state })
            .from(pincodeMaster)
            .where(sql`${pincodeMaster.state} IS NOT NULL`)
            .orderBy(pincodeMaster.state);
        
        const states = statesResult.map(s => s.state);
        
        const citiesResult = await db.selectDistinct({ city: pincodeMaster.city, state: pincodeMaster.state })
            .from(pincodeMaster)
            .where(sql`${pincodeMaster.city} IS NOT NULL`)
            .orderBy(pincodeMaster.city);
        
        const citiesByState: Record<string, string[]> = {};
        citiesResult.forEach(c => {
            if (c.state && c.city) {
                if (!citiesByState[c.state]) citiesByState[c.state] = [];
                citiesByState[c.state].push(c.city);
            }
        });

        return JSON.parse(JSON.stringify({ states, citiesByState }));
    } catch (error) {
        console.error("Error fetching dashboard locations:", error);
        return { states: [], citiesByState: {} };
    }
}
