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
import { desc, eq, and, sql, or, ilike } from "drizzle-orm"
import { redemptionChannels } from "@/db/schema"

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
        // 1. Fetch Pending Scan/Transaction Requests
        // We'll combine from all three stakeholder transaction logs where status is 'pending'
        const pendingRetailer = await db.select({
            id: retailerTransactionLogs.id,
            user: users.name,
            points: retailerTransactionLogs.points,
            createdAt: retailerTransactionLogs.createdAt,
            type: sql<string>`'Transaction'` // Defaulting to Transaction for now
        })
            .from(retailerTransactionLogs)
            .leftJoin(users, eq(retailerTransactionLogs.userId, users.id))
            .where(ilike(retailerTransactionLogs.status, 'pending'))
            .limit(20);

        const pendingElectrician = await db.select({
            id: electricianTransactionLogs.id,
            user: users.name,
            points: electricianTransactionLogs.points,
            createdAt: electricianTransactionLogs.createdAt,
            type: sql<string>`'Scan'`
        })
            .from(electricianTransactionLogs)
            .leftJoin(users, eq(electricianTransactionLogs.userId, users.id))
            .where(ilike(electricianTransactionLogs.status, 'pending'))
            .limit(20);

        const pendingCounterSales = await db.select({
            id: counterSalesTransactionLogs.id,
            user: users.name,
            points: counterSalesTransactionLogs.points,
            createdAt: counterSalesTransactionLogs.createdAt,
            type: sql<string>`'Transaction'`
        })
            .from(counterSalesTransactionLogs)
            .leftJoin(users, eq(counterSalesTransactionLogs.userId, users.id))
            .where(ilike(counterSalesTransactionLogs.status, 'pending'))
            .limit(20);

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

        // 2. Fetch Pending Redemption Requests
        const pendingRedemptionRequests = await db.select({
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
            .where(ilike(redemptionStatuses.name, 'pending'))
            .limit(50);

        const redemptionRequests: RedemptionRequest[] = pendingRedemptionRequests.map(r => ({
            id: `#RED-${r.id}`,
            user: r.user || 'Unknown',
            initials: getInitials(r.user || 'Unknown'),
            color: getRandomColor(r.id),
            points: r.points,
            value: `₹${r.points.toLocaleString()}`,
            dateTime: r.createdAt ? new Date(r.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '---',
            redemptionType: r.redemptionType || 'Unknown'
        }));

        // 3. Stats (Real counts)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();

        const [retailerPendingCount] = await db.select({ count: sql<number>`count(*)` }).from(retailerTransactionLogs).where(ilike(retailerTransactionLogs.status, 'pending'));
        const [electricianPendingCount] = await db.select({ count: sql<number>`count(*)` }).from(electricianTransactionLogs).where(ilike(electricianTransactionLogs.status, 'pending'));
        const [csPendingCount] = await db.select({ count: sql<number>`count(*)` }).from(counterSalesTransactionLogs).where(ilike(counterSalesTransactionLogs.status, 'pending'));

        const [redemptionPendingCount] = await db.select({ count: sql<number>`count(*)` }).from(redemptions).leftJoin(redemptionStatuses, eq(redemptions.status, redemptionStatuses.id)).where(ilike(redemptionStatuses.name, 'pending'));

        // Today's stats for Scan
        const [retailerApprovedToday] = await db.select({ count: sql<number>`count(*)` }).from(retailerTransactionLogs).where(and(ilike(retailerTransactionLogs.status, 'approved'), sql`${retailerTransactionLogs.createdAt} >= ${todayStr}`));
        const [electricianApprovedToday] = await db.select({ count: sql<number>`count(*)` }).from(electricianTransactionLogs).where(and(ilike(electricianTransactionLogs.status, 'approved'), sql`${electricianTransactionLogs.createdAt} >= ${todayStr}`));
        const [csApprovedToday] = await db.select({ count: sql<number>`count(*)` }).from(counterSalesTransactionLogs).where(and(ilike(counterSalesTransactionLogs.status, 'approved'), sql`${counterSalesTransactionLogs.createdAt} >= ${todayStr}`));

        const [retailerRejectedToday] = await db.select({ count: sql<number>`count(*)` }).from(retailerTransactionLogs).where(and(ilike(retailerTransactionLogs.status, 'rejected'), sql`${retailerTransactionLogs.createdAt} >= ${todayStr}`));
        const [electricianRejectedToday] = await db.select({ count: sql<number>`count(*)` }).from(electricianTransactionLogs).where(and(ilike(electricianTransactionLogs.status, 'rejected'), sql`${electricianTransactionLogs.createdAt} >= ${todayStr}`));
        const [csRejectedToday] = await db.select({ count: sql<number>`count(*)` }).from(counterSalesTransactionLogs).where(and(ilike(counterSalesTransactionLogs.status, 'rejected'), sql`${counterSalesTransactionLogs.createdAt} >= ${todayStr}`));

        const scanStats: ProcessStats = {
            pendingRequests: Number(retailerPendingCount.count) + Number(electricianPendingCount.count) + Number(csPendingCount.count),
            pendingRequestsToday: '+0',
            approvedToday: Number(retailerApprovedToday.count) + Number(electricianApprovedToday.count) + Number(csApprovedToday.count),
            approvedTodayTrend: '+0%',
            rejectedToday: Number(retailerRejectedToday.count) + Number(electricianRejectedToday.count) + Number(csRejectedToday.count),
            rejectedTodayTrend: '0',
            totalProcessed: '1,842',
            totalProcessedTrend: '+0'
        };

        const [redemptionApprovedToday] = await db.select({ count: sql<number>`count(*)` }).from(redemptions).leftJoin(redemptionStatuses, eq(redemptions.status, redemptionStatuses.id)).where(and(ilike(redemptionStatuses.name, 'approved'), sql`${redemptions.createdAt} >= ${todayStr}`));
        const [redemptionRejectedToday] = await db.select({ count: sql<number>`count(*)` }).from(redemptions).leftJoin(redemptionStatuses, eq(redemptions.status, redemptionStatuses.id)).where(and(ilike(redemptionStatuses.name, 'rejected'), sql`${redemptions.createdAt} >= ${todayStr}`));
        const [redemptionTotalValueToday] = await db.select({ sum: sql<number>`sum(${redemptions.pointsRedeemed})` }).from(redemptions).where(and(sql`${redemptions.createdAt} >= ${todayStr}`));

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
