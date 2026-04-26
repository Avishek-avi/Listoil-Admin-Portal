'use server'

import { db } from "@/db"
import {
    retailerTransactionLogs,
    electricianTransactionLogs,
    counterSalesTransactionLogs,
    redemptions,
    redemptionStatuses,
    users,
    earningTypes
} from "@/db/schema"
import { desc, eq, and, sql, or, ilike, inArray } from "drizzle-orm"
import { redemptionChannels, retailers, electricians, counterSales } from "@/db/schema"
import { auth } from "@/lib/auth"
import { getUserScope } from "@/lib/scope-utils"

export interface ScanRequest {
    id: string;
    user: string;
    initials: string;
    color: string;
    type: 'Scan' | 'Transaction';
    amount: string;
    dateTime: string;
}

export interface RedemptionRequest {
    id: string;
    user: string;
    initials: string;
    color: string;
    points: number;
    value: string;
    dateTime: string;
    redemptionType: string;
}

export interface ProcessStats {
    pendingRequests: number;
    pendingRequestsToday: string;
    approvedToday: number;
    approvedTodayTrend: string;
    rejectedToday: number;
    rejectedTodayTrend: string;
    totalProcessed: string;
    totalProcessedTrend: string;
}

export interface RedemptionStats {
    pendingRedemptions: number;
    pendingRedemptionsToday: string;
    approvedRedemptionsToday: number;
    approvedRedemptionsTodayTrend: string;
    rejectedRedemptionsToday: number;
    rejectedRedemptionsTodayTrend: string;
    totalValueToday: string;
    totalValueTodayTrend: string;
}

function getInitials(name: string) {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
}

const colors = ['blue', 'green', 'purple', 'yellow', 'orange', 'red'];
function getRandomColor(id: number) {
    return colors[id % colors.length];
}

export async function getProcessDataAction() {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");
        const scope = await getUserScope(Number(session.user.id));

        const pendingRetailerConditions = [ilike(retailerTransactionLogs.status, 'pending')];
        const pendingRetailerQuery = db.select({
            id: retailerTransactionLogs.id,
            user: users.name,
            points: retailerTransactionLogs.points,
            createdAt: retailerTransactionLogs.createdAt,
            type: sql<string>`'Transaction'`
        })
            .from(retailerTransactionLogs)
            .leftJoin(users, eq(retailerTransactionLogs.userId, users.id))
            .leftJoin(retailers, eq(users.id, retailers.userId))
            .$dynamic();

        if (scope.type !== 'Global') {
            pendingRetailerConditions.push(scope.type === 'State' ? inArray(retailers.state, scope.entityNames) : inArray(retailers.city, scope.entityNames));
        }

        const pendingRetailer = await pendingRetailerQuery.where(and(...pendingRetailerConditions)).limit(20);

        const pendingElectricianConditions = [ilike(electricianTransactionLogs.status, 'pending')];
        const pendingElectricianQuery = db.select({
            id: electricianTransactionLogs.id,
            user: users.name,
            points: electricianTransactionLogs.points,
            createdAt: electricianTransactionLogs.createdAt,
            type: sql<string>`'Scan'`
        })
            .from(electricianTransactionLogs)
            .leftJoin(users, eq(electricianTransactionLogs.userId, users.id))
            .leftJoin(electricians, eq(users.id, electricians.userId))
            .$dynamic();

        if (scope.type !== 'Global') {
            pendingElectricianConditions.push(scope.type === 'State' ? inArray(electricians.state, scope.entityNames) : inArray(electricians.city, scope.entityNames));
        }

        const pendingElectrician = await pendingElectricianQuery.where(and(...pendingElectricianConditions)).limit(20);

        const pendingCounterSalesConditions = [ilike(counterSalesTransactionLogs.status, 'pending')];
        const pendingCounterSalesQuery = db.select({
            id: counterSalesTransactionLogs.id,
            user: users.name,
            points: counterSalesTransactionLogs.points,
            createdAt: counterSalesTransactionLogs.createdAt,
            type: sql<string>`'Transaction'`
        })
            .from(counterSalesTransactionLogs)
            .leftJoin(users, eq(counterSalesTransactionLogs.userId, users.id))
            .leftJoin(counterSales, eq(users.id, counterSales.userId))
            .$dynamic();

        if (scope.type !== 'Global') {
            pendingCounterSalesConditions.push(scope.type === 'State' ? inArray(counterSales.state, scope.entityNames) : inArray(counterSales.city, scope.entityNames));
        }

        const pendingCounterSales = await pendingCounterSalesQuery.where(and(...pendingCounterSalesConditions)).limit(20);

        const scanRequests: ScanRequest[] = [...pendingRetailer, ...pendingElectrician, ...pendingCounterSales]
            .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
            .map(r => ({
                id: `#REQ-${r.id}`,
                user: r.user || 'Unknown',
                initials: getInitials(r.user || 'Unknown'),
                color: getRandomColor(r.id),
                type: r.type as any,
                amount: `₹${Number(r.points).toLocaleString()}`,
                dateTime: r.createdAt ? new Date(r.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '---'
            }));

        // 2. Fetch Pending Redemption Requests (Scoped)
        const pendingRedemptionQuery = db.select({
            id: redemptions.id,
            user: users.name,
            points: redemptions.pointsRedeemed,
            createdAt: redemptions.createdAt,
            status: redemptionStatuses.name,
            redemptionType: redemptionChannels.name
        })
            .from(redemptions)
            .leftJoin(users, eq(redemptions.userId, users.id))
            .leftJoin(redemptionStatuses, eq(redemptions.status, redemptionStatuses.id))
            .leftJoin(redemptionChannels, eq(redemptions.channelId, redemptionChannels.id))
            .leftJoin(retailers, eq(users.id, retailers.userId))
            .leftJoin(electricians, eq(users.id, electricians.userId))
            .leftJoin(counterSales, eq(users.id, counterSales.userId))
            .where(ilike(redemptionStatuses.name, 'pending'))
            .$dynamic();

        if (scope.type !== 'Global') {
            pendingRedemptionQuery.where(or(
                scope.type === 'State' ? inArray(retailers.state, scope.entityNames) : inArray(retailers.city, scope.entityNames),
                scope.type === 'State' ? inArray(electricians.state, scope.entityNames) : inArray(electricians.city, scope.entityNames),
                scope.type === 'State' ? inArray(counterSales.state, scope.entityNames) : inArray(counterSales.city, scope.entityNames)
            ));
        }

        const pendingRedemptionRequestsData = await pendingRedemptionQuery.limit(50);

        const redemptionRequests: RedemptionRequest[] = pendingRedemptionRequestsData.map(r => ({
            id: `#RED-${r.id}`,
            user: r.user || 'Unknown',
            initials: getInitials(r.user || 'Unknown'),
            color: getRandomColor(r.id),
            points: r.points,
            value: `₹${r.points.toLocaleString()}`,
            dateTime: r.createdAt ? new Date(r.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '---',
            redemptionType: r.redemptionType || 'Unknown'
        }));

        // 3. Stats (Real counts - Scoped)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();

        // Base queries for stats
        const getScopedCount = (table: any, condition: any, userTable: any) => {
            const conditions = [condition];
            let q = db.select({ count: sql<number>`count(*)` }).from(table).$dynamic();
            if (scope.type !== 'Global') {
                q.leftJoin(userTable, eq(table.userId, userTable.userId));
                conditions.push(scope.type === 'State' ? inArray(userTable.state, scope.entityNames) : inArray(userTable.city, scope.entityNames));
            }
            return q.where(and(...conditions));
        };

        const [retailerPendingCount] = await getScopedCount(retailerTransactionLogs, ilike(retailerTransactionLogs.status, 'pending'), retailers);
        const [electricianPendingCount] = await getScopedCount(electricianTransactionLogs, ilike(electricianTransactionLogs.status, 'pending'), electricians);
        const [csPendingCount] = await getScopedCount(counterSalesTransactionLogs, ilike(counterSalesTransactionLogs.status, 'pending'), counterSales);

        let redemptionPendingQuery = db.select({ count: sql<number>`count(*)` }).from(redemptions).leftJoin(redemptionStatuses, eq(redemptions.status, redemptionStatuses.id)).where(ilike(redemptionStatuses.name, 'pending')).$dynamic();
        if (scope.type !== 'Global') {
            redemptionPendingQuery.leftJoin(retailers, eq(redemptions.userId, retailers.userId))
                .leftJoin(electricians, eq(redemptions.userId, electricians.userId))
                .leftJoin(counterSales, eq(redemptions.userId, counterSales.userId))
                .where(or(
                    scope.type === 'State' ? inArray(retailers.state, scope.entityNames) : inArray(retailers.city, scope.entityNames),
                    scope.type === 'State' ? inArray(electricians.state, scope.entityNames) : inArray(electricians.city, scope.entityNames),
                    scope.type === 'State' ? inArray(counterSales.state, scope.entityNames) : inArray(counterSales.city, scope.entityNames)
                ));
        }
        const [redemptionPendingCount] = await redemptionPendingQuery;

        // Today's stats for Scan
        const [retailerApprovedToday] = await getScopedCount(retailerTransactionLogs, and(ilike(retailerTransactionLogs.status, 'approved'), sql`${retailerTransactionLogs.createdAt} >= ${todayStr}`), retailers);
        const [electricianApprovedToday] = await getScopedCount(electricianTransactionLogs, and(ilike(electricianTransactionLogs.status, 'approved'), sql`${electricianTransactionLogs.createdAt} >= ${todayStr}`), electricians);
        const [csApprovedToday] = await getScopedCount(counterSalesTransactionLogs, and(ilike(counterSalesTransactionLogs.status, 'approved'), sql`${counterSalesTransactionLogs.createdAt} >= ${todayStr}`), counterSales);

        const [retailerRejectedToday] = await getScopedCount(retailerTransactionLogs, and(ilike(retailerTransactionLogs.status, 'rejected'), sql`${retailerTransactionLogs.createdAt} >= ${todayStr}`), retailers);
        const [electricianRejectedToday] = await getScopedCount(electricianTransactionLogs, and(ilike(electricianTransactionLogs.status, 'rejected'), sql`${electricianTransactionLogs.createdAt} >= ${todayStr}`), electricians);
        const [csRejectedToday] = await getScopedCount(counterSalesTransactionLogs, and(ilike(counterSalesTransactionLogs.status, 'rejected'), sql`${counterSalesTransactionLogs.createdAt} >= ${todayStr}`), counterSales);

        // Total Processed (All time approved)
        const [retailerTotal] = await getScopedCount(retailerTransactionLogs, ilike(retailerTransactionLogs.status, 'approved'), retailers);
        const [electricianTotal] = await getScopedCount(electricianTransactionLogs, ilike(electricianTransactionLogs.status, 'approved'), electricians);
        const [csTotal] = await getScopedCount(counterSalesTransactionLogs, ilike(counterSalesTransactionLogs.status, 'approved'), counterSales);

        const scanStats: ProcessStats = {
            pendingRequests: Number(retailerPendingCount?.[0]?.count || 0) + Number(electricianPendingCount?.[0]?.count || 0) + Number(csPendingCount?.[0]?.count || 0),
            pendingRequestsToday: '+0',
            approvedToday: Number(retailerApprovedToday?.[0]?.count || 0) + Number(electricianApprovedToday?.[0]?.count || 0) + Number(csApprovedToday?.[0]?.count || 0),
            approvedTodayTrend: '+0%',
            rejectedToday: Number(retailerRejectedToday?.[0]?.count || 0) + Number(electricianRejectedToday?.[0]?.count || 0) + Number(csRejectedToday?.[0]?.count || 0),
            rejectedTodayTrend: '0',
            totalProcessed: (Number(retailerTotal?.[0]?.count || 0) + Number(electricianTotal?.[0]?.count || 0) + Number(csTotal?.[0]?.count || 0)).toLocaleString(),
            totalProcessedTrend: '+0'
        };

        let redemptionApprovedTodayQuery = db.select({ count: sql<number>`count(*)` }).from(redemptions).leftJoin(redemptionStatuses, eq(redemptions.status, redemptionStatuses.id)).where(and(ilike(redemptionStatuses.name, 'approved'), sql`${redemptions.createdAt} >= ${todayStr}`)).$dynamic();
        let redemptionRejectedTodayQuery = db.select({ count: sql<number>`count(*)` }).from(redemptions).leftJoin(redemptionStatuses, eq(redemptions.status, redemptionStatuses.id)).where(and(ilike(redemptionStatuses.name, 'rejected'), sql`${redemptions.createdAt} >= ${todayStr}`)).$dynamic();
        let redemptionTotalValueTodayQuery = db.select({ sum: sql<number>`sum(${redemptions.pointsRedeemed})` }).from(redemptions).where(and(sql`${redemptions.createdAt} >= ${todayStr}`)).$dynamic();

        if (scope.type !== 'Global') {
            const scopeFilter = or(
                scope.type === 'State' ? inArray(retailers.state, scope.entityNames) : inArray(retailers.city, scope.entityNames),
                scope.type === 'State' ? inArray(electricians.state, scope.entityNames) : inArray(electricians.city, scope.entityNames),
                scope.type === 'State' ? inArray(counterSales.state, scope.entityNames) : inArray(counterSales.city, scope.entityNames)
            );
            [redemptionApprovedTodayQuery, redemptionRejectedTodayQuery, redemptionTotalValueTodayQuery].forEach(q => {
                q.leftJoin(retailers, eq(redemptions.userId, retailers.userId))
                 .leftJoin(electricians, eq(redemptions.userId, electricians.userId))
                 .leftJoin(counterSales, eq(redemptions.userId, counterSales.userId))
                 .where(scopeFilter);
            });
        }

        const [redemptionApprovedToday] = await redemptionApprovedTodayQuery;
        const [redemptionRejectedToday] = await redemptionRejectedTodayQuery;
        const [redemptionTotalValueToday] = await redemptionTotalValueTodayQuery;

        const redemptionStats: RedemptionStats = {
            pendingRedemptions: Number(redemptionPendingCount.count),
            pendingRedemptionsToday: '+0',
            approvedRedemptionsToday: Number(redemptionApprovedToday.count),
            approvedRedemptionsTodayTrend: '+0%',
            rejectedRedemptionsToday: Number(redemptionRejectedToday.count),
            rejectedRedemptionsTodayTrend: '0',
            totalValueToday: `₹${(Number(redemptionTotalValueToday.sum) || 0).toLocaleString()}`,
            totalValueTodayTrend: '+0%'
        };

        return {
            scanRequests,
            redemptionRequests,
            scanStats,
            redemptionStats
        };
    } catch (error) {
        console.error("Error in getProcessDataAction:", error);
        return {
            scanRequests: [],
            redemptionRequests: [],
            scanStats: {
                pendingRequests: 0,
                pendingRequestsToday: '0',
                approvedToday: 0,
                approvedTodayTrend: '0%',
                rejectedToday: 0,
                rejectedTodayTrend: '0',
                totalProcessed: '0',
                totalProcessedTrend: '0'
            },
            redemptionStats: {
                pendingRedemptions: 0,
                pendingRedemptionsToday: '0',
                approvedRedemptionsToday: 0,
                approvedRedemptionsTodayTrend: '0%',
                rejectedRedemptionsToday: 0,
                rejectedRedemptionsTodayTrend: '0',
                totalValueToday: '₹0',
                totalValueTodayTrend: '0%'
            }
        };
    }
}
