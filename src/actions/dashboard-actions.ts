'use server'

import { db } from "@/db"
import {
    users,
    counterSalesTransactionLogs,
    retailerTransactions,
    electricianTransactionLogs,
    counterSales,
    approvalStatuses,
    redemptions,
    userAmazonOrders,
    redemptionApprovals,
    physicalRewardsRedemptions,
    retailers,
    electricians
} from "@/db/schema"
import { count, sum, sql, desc, eq, and, gte, lte } from "drizzle-orm"

export async function getDashboardDataAction(dateRange?: { from: string, to: string }) {
    try {
        // 1. Total Members
        const [userCount] = await db.select({ count: count() }).from(users);

        // 2. Active Members (not suspended)
        const [activeUserCount] = await db.select({ count: count() })
            .from(users)
            .where(eq(users.isSuspended, false));

        // 3. Blocked Members
        const [blockedUserCount] = await db.select({ count: count() })
            .from(users)
            .where(eq(users.isSuspended, true));

        // 4. Total Points Issued (Sum from all 3 transaction logs)
        const [csPoints] = await db.select({ value: sum(counterSalesTransactionLogs.points) }).from(counterSalesTransactionLogs);
        const [retPoints] = await db.select({ value: sum(retailerTransactions.points) }).from(retailerTransactions);
        const [elecPoints] = await db.select({ value: sum(electricianTransactionLogs.points) }).from(electricianTransactionLogs);

        const totalPointsIssued = (Number(csPoints?.value) || 0) + (Number(retPoints?.value) || 0) + (Number(elecPoints?.value) || 0);

        // 5. Points Redeemed
        const [physRedeem] = await db.select({ value: sum(physicalRewardsRedemptions.pointsDeducted) }).from(physicalRewardsRedemptions);
        const [amzRedeem] = await db.select({ value: sum(userAmazonOrders.pointsDeducted) }).from(userAmazonOrders);
        const totalRedeemed = (Number(physRedeem?.value) || 0) + (Number(amzRedeem?.value) || 0);

        // 6. Total Scans
        const [csCount] = await db.select({ count: count() }).from(counterSales);
        const [retCount] = await db.select({ count: count() }).from(retailerTransactions);
        const [elecCount] = await db.select({ count: count() }).from(electricianTransactionLogs);
        const totalScans = (csCount?.count || 0) + (retCount?.count || 0) + (elecCount?.count || 0);

        // 7. KYC Status
        const kycStats = await db.select({
            status: approvalStatuses.name,
            count: count()
        })
            .from(users)
            .leftJoin(approvalStatuses, eq(users.approvalStatusId, approvalStatuses.id))
            .groupBy(approvalStatuses.name);

        const kycApproved = kycStats.find(s => s.status === 'KYC_APPROVED' || s.status === 'ACTIVE')?.count || 0;
        const kycPending = kycStats.find(s => s.status === 'KYC_PENDING' || s.status === 'PENDING')?.count || 0;

        // 8. Pending Approvals
        const [pendingApprovals] = await db.select({ count: count() })
            .from(redemptionApprovals)
            .where(eq(redemptionApprovals.approvalStatus, 'PENDING'));

        // 8.5 Segment Specific Stats
        const [retPointsVal] = await db.select({ value: sum(retailerTransactions.points) }).from(retailerTransactions);
        const [retActive] = await db.select({ count: count() }).from(retailers).leftJoin(users, eq(retailers.userId, users.id)).where(eq(users.isSuspended, false));
        const [retKyc] = await db.select({ count: count() }).from(retailers).where(eq(retailers.isKycVerified, true));
        const [retTotal] = await db.select({ count: count() }).from(retailers);

        const [elecPointsVal] = await db.select({ value: sum(electricianTransactionLogs.points) }).from(electricianTransactionLogs);
        const [elecActive] = await db.select({ count: count() }).from(electricians).leftJoin(users, eq(electricians.userId, users.id)).where(eq(users.isSuspended, false));
        const [elecKyc] = await db.select({ count: count() }).from(electricians).where(eq(electricians.isKycVerified, true));
        const [elecTotal] = await db.select({ count: count() }).from(electricians);


        // 9. Recent Transactions
        const csRecent = await db.select({
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

        const retRecent = await db.select({
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

        const elecRecent = await db.select({
            id: electricianTransactionLogs.id,
            userId: electricianTransactionLogs.userId,
            points: electricianTransactionLogs.points,
            createdAt: electricianTransactionLogs.createdAt,
            type: sql<string>`'Electrician'`,
            user: users.name
        })
            .from(electricianTransactionLogs)
            .leftJoin(users, eq(electricianTransactionLogs.userId, users.id))
            .orderBy(desc(electricianTransactionLogs.createdAt))
            .limit(5);

        const allRecent = [...(csRecent || []), ...(retRecent || []), ...(elecRecent || [])]
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


        // 10. Top Performers (Combined)
        let topPerformers: any[] = [];
        try {
            const topPerformersData = await db.execute(sql`
                SELECT u.name, COALESCE(SUM(points), 0) as total_points
                FROM (
                    SELECT user_id, points FROM counter_sales_transaction_logs
                    UNION ALL
                    SELECT user_id, points FROM retailer_transactions
                    UNION ALL
                    SELECT user_id, points FROM electrician_transaction_logs
                ) as t
                JOIN users u ON u.id = t.user_id
                GROUP BY u.id, u.name
                ORDER BY total_points DESC
                LIMIT 5
            `);

            topPerformers = (topPerformersData.rows || []).map((p: any, i: number) => ({
                name: p.name || 'Unknown',
                pts: `${Math.round(Number(p.total_points) || 0)} pts`,
                change: '+0%',
                rank: i + 1,
                initial: (p.name || 'U').charAt(0),
                bg: ['bg-yellow-100', 'bg-gray-100', 'bg-orange-100'][i] || 'bg-blue-100',
                text: ['text-yellow-800', 'text-gray-800', 'text-orange-800'][i] || 'text-blue-800'
            }));
        } catch (e) {
            console.error("Top performers query error:", e);
        }

        // 11. Chart Data (Last 7 Days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        const safeExecute = async (query: any) => {
            try {
                const res = await db.execute(query);
                return res.rows || [];
            } catch (e) {
                console.error("Query error:", e);
                return [];
            }
        };

        const memberGrowth = await safeExecute(sql`
            SELECT day::text, count(*) as count FROM (
                SELECT date_trunc('day', created_at)::date as day
                FROM users
            ) t
            WHERE day >= (now() - interval '7 days')::date
            GROUP BY 1 ORDER BY 1
        `);

        const pointsEarned = await safeExecute(sql`
            SELECT day::text, sum(points) as points FROM (
                SELECT date_trunc('day', created_at)::date as day, points FROM counter_sales_transaction_logs
                UNION ALL
                SELECT date_trunc('day', created_at)::date as day, points FROM retailer_transactions
                UNION ALL
                SELECT date_trunc('day', created_at)::date as day, points FROM electrician_transaction_logs
            ) as t
            WHERE day >= (now() - interval '7 days')::date
            GROUP BY 1 ORDER BY 1
        `);

        const pointsRedeemed = await safeExecute(sql`
            SELECT day::text, sum(points) as points FROM (
                SELECT date_trunc('day', created_at)::date as day, points_deducted as points FROM physical_rewards_redemptions
                UNION ALL
                SELECT date_trunc('day', created_at)::date as day, points_deducted as points FROM user_amazon_orders
            ) as t
            WHERE day >= (now() - interval '7 days')::date
            GROUP BY 1 ORDER BY 1
        `);

        const mapToDays = (rows: any[], key: string) => {
            const map = new Map();
            rows.forEach(r => {
                let dayStr = r.day;
                if (dayStr instanceof Date) dayStr = dayStr.toISOString().split('T')[0];
                if (dayStr && typeof dayStr === 'string' && dayStr.includes('T')) dayStr = dayStr.split('T')[0];
                if (dayStr) map.set(dayStr, Number(r[key]) || 0);
            });
            return last7Days.map(day => map.get(day) || 0);
        };

        return {
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
            topPerformers: topPerformers,
            pendingApprovalsCount: Number(pendingApprovals?.count) || 0,
            segments: {
                retailer: {
                    points: Number(retPointsVal?.value) || 0,
                    active: Number(retActive?.count) || 0,
                    kycCompliance: Number(retTotal?.count) ? Math.round((Number(retKyc?.count) / Number(retTotal?.count)) * 100) : 0,
                    total: Number(retTotal?.count) || 0
                },
                electrician: {
                    points: Number(elecPointsVal?.value) || 0,
                    active: Number(elecActive?.count) || 0,
                    kycCompliance: Number(elecTotal?.count) ? Math.round((Number(elecKyc?.count) / Number(elecTotal?.count)) * 100) : 0,
                    total: Number(elecTotal?.count) || 0
                }
            },
            charts: {
                memberGrowth: mapToDays(memberGrowth, 'count'),
                pointsEarned: mapToDays(pointsEarned, 'points'),
                pointsRedeemed: mapToDays(pointsRedeemed, 'points')
            }
        }
    } catch (error) {
        console.error("Dashboard error:", error);
        // Fallback data instead of throwing to keep the UI alive
        return {
            error: true,
            stats: { totalMembers: 0, activeMembers: 0, blockedMembers: 0, totalPointsIssued: 0, pointsRedeemed: 0, totalScans: 0, kycApproved: 0, kycPending: 0 },
            recentActivity: [],
            topPerformers: [],
            pendingApprovalsCount: 0,
            segments: { 
                retailer: { points: 0, active: 0, kycCompliance: 0, total: 0 },
                electrician: { points: 0, active: 0, kycCompliance: 0, total: 0 }
            },
            charts: { memberGrowth: [], pointsEarned: [], pointsRedeemed: [] }
        };
    }
}


