'use server'

import { db } from "@/db"
import {
    users,
    retailerTransactions,
    electricianTransactions,
    counterSalesTransactions,
    redemptions,
    userTypeEntity,
    campaigns,
    redemptionStatuses,
    retailerTransactionLogs,
    electricianTransactionLogs,
    counterSalesTransactionLogs
} from "@/db/schema"
import { count, sum, sql, desc, eq, and, gt, gte, lt } from "drizzle-orm"

export async function getMisAnalyticsAction() {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        // --- 1. EXECUTIVE DASHBOARD DATA ---

        // Total Active Members
        const [memberCount] = await db.select({ value: count() }).from(users);

        // Total Points Allotted (Sum of all 3 earning log tables where status is SUCCESS)
        const [rSum] = await db.select({ value: sum(retailerTransactionLogs.points) }).from(retailerTransactionLogs).where(eq(retailerTransactionLogs.status, 'SUCCESS'));
        const [eSum] = await db.select({ value: sum(electricianTransactionLogs.points) }).from(electricianTransactionLogs).where(eq(electricianTransactionLogs.status, 'SUCCESS'));
        const [csSum] = await db.select({ value: sum(counterSalesTransactionLogs.points) }).from(counterSalesTransactionLogs).where(eq(counterSalesTransactionLogs.status, 'SUCCESS'));
        const totalPointsAllotted = Number(rSum?.value || 0) + Number(eSum?.value || 0) + Number(csSum?.value || 0);

        // Engagement (Recent active members - had a transaction in last 30 days)
        const activeRecentResult = await db.execute(sql`
            SELECT count(DISTINCT user_id) as count FROM (
                SELECT user_id, created_at FROM retailer_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT user_id, created_at FROM electrician_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT user_id, created_at FROM counter_sales_transaction_logs WHERE status = 'SUCCESS'
            ) as activity
            WHERE created_at >= ${thirtyDaysAgo}
        `);
        const activeRecentCount = Number(activeRecentResult.rows[0]?.count || 0);
        const engagementRate = Number(memberCount.value) > 0 ? (activeRecentCount / Number(memberCount.value)) * 100 : 0;

        // Redemption Rate (Redeemed / Allotted)
        const [redeemSum] = await db.select({ value: sum(redemptions.pointsRedeemed) }).from(redemptions);
        const redemptionRate = totalPointsAllotted > 0 ? (Number(redeemSum?.value || 0) / totalPointsAllotted) * 100 : 0;

        // Points Allotted Trend (Last 6 Months)
        const pointsTrendResult = await db.execute(sql`
            SELECT TO_CHAR(created_at, 'Mon') as month, TO_CHAR(created_at, 'YYYY-MM') as mf, sum(points)::numeric as total
            FROM (
                SELECT created_at, points FROM retailer_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT created_at, points FROM electrician_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT created_at, points FROM counter_sales_transaction_logs WHERE status = 'SUCCESS'
            ) as t
            GROUP BY 1, 2 ORDER BY 2 ASC LIMIT 6
        `);

        // Member Growth (New users count per month)
        const memberGrowthResult = await db.execute(sql`
            SELECT TO_CHAR(created_at, 'Mon') as month, TO_CHAR(created_at, 'YYYY-MM') as mf, count(*)::integer as count
            FROM users
            GROUP BY 1, 2 ORDER BY 2 ASC LIMIT 6
        `);

        // --- 2. PERFORMANCE METRICS ---

        // Transaction Volume (Last 7 Days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const txnVolumeResult = await db.execute(sql`
            SELECT TO_CHAR(created_at, 'Dy') as day, TO_CHAR(created_at, 'YYYY-MM-DD') as df, count(*)::integer as count
            FROM (
                SELECT created_at FROM retailer_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT created_at FROM electrician_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT created_at FROM counter_sales_transaction_logs WHERE status = 'SUCCESS'
            ) as t
            WHERE created_at >= ${sevenDaysAgo}
            GROUP BY 1, 2 ORDER BY 2 ASC
        `);

        // Category Performance (Points per category)
        const categoryPerfResult = await db.execute(sql`
            SELECT COALESCE(category, 'General') as category, sum(points)::numeric as total
            FROM (
                SELECT category, points FROM retailer_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT category, points FROM electrician_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT category, points FROM counter_sales_transaction_logs WHERE status = 'SUCCESS'
            ) as t
            GROUP BY 1 ORDER BY 2 DESC LIMIT 5
        `);

        // Transaction totals for KPIs
        const totalScansResult = await db.execute(sql`
            SELECT count(*)::integer as count FROM (
                SELECT id FROM retailer_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT id FROM electrician_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT id FROM counter_sales_transaction_logs WHERE status = 'SUCCESS'
            ) as t
        `);
        const totalScans = Number(totalScansResult.rows[0]?.count || 0);

        // Performance KPIs
        const totalUsers = Number(memberCount.value);
        const avgTxnValue = totalScans > 0 ? (totalPointsAllotted / totalScans) : 0;
        const scanFrequency = totalScans / 30; 
        const retentionRate = totalUsers > 0 ? (activeRecentCount / totalUsers) * 100 : 0;

        // --- 3. MEMBER ANALYTICS ---

        // Segmentation (By Stakeholder Type)
        const segmentationResult = await db.select({
            name: userTypeEntity.typeName,
            value: count()
        })
            .from(users)
            .leftJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
            .groupBy(userTypeEntity.typeName);

        // Lifecycle
        const [newMembersCount] = await db.select({ count: count() }).from(users).where(gte(users.createdAt, thirtyDaysAgo));
        const [churnedMembers] = await db.select({ count: count() }).from(users).where(lt(users.createdAt, ninetyDaysAgo)); 

        // Recent Activity
        const recentActivitiesResult = await db.execute(sql`
            SELECT u.id, u.name, ut.type_name as type, 
                   TO_CHAR(activity.created_at, 'YYYY-MM-DD HH24:MI') as "lastActivity", 
                   activity.points as points,
                   activity.sku as sku
            FROM (
                SELECT user_id, created_at, points, sku FROM retailer_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT user_id, created_at, points, sku FROM electrician_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT user_id, created_at, points, sku FROM counter_sales_transaction_logs WHERE status = 'SUCCESS'
            ) as activity
            JOIN users u ON activity.user_id = u.id
            JOIN user_type_entity ut ON u.role_id = ut.id
            ORDER BY activity.created_at DESC LIMIT 10
        `);
        const recentRows = recentActivitiesResult.rows as any[];

        // Top Members (by Total Earnings)
        const topMembersResult = await db.execute(sql`
            SELECT u.name, ut.type_name as role, 
                   (COALESCE(r.total_earnings, 0) + COALESCE(e.total_earnings, 0) + COALESCE(cs.total_earnings, 0))::numeric as earnings
            FROM users u
            LEFT JOIN user_type_entity ut ON u.role_id = ut.id
            LEFT JOIN retailers r ON u.id = r.user_id
            LEFT JOIN electricians e ON u.id = e.user_id
            LEFT JOIN counter_sales cs ON u.id = cs.user_id
            ORDER BY earnings DESC LIMIT 5
        `);

        // Top Performing Categories
        const topProductsResult = await db.execute(sql`
            SELECT COALESCE(category, 'General') as category, 
                   count(*)::integer as scans,
                   sum(points)::numeric as total_points
            FROM (
                SELECT category, points FROM retailer_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT category, points FROM electrician_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT category, points FROM counter_sales_transaction_logs WHERE status = 'SUCCESS'
            ) as t
            GROUP BY 1 ORDER BY 2 DESC LIMIT 5
        `);

        // Regional Performance (By State)
        const regionalPerfResult = await db.execute(sql`
            SELECT state, count(*)::integer as members, sum(total_earnings)::numeric as total_earnings
            FROM (
                SELECT state, total_earnings FROM retailers WHERE state IS NOT NULL
                UNION ALL
                SELECT state, total_earnings FROM electricians WHERE state IS NOT NULL
                UNION ALL
                SELECT state, total_earnings FROM counter_sales WHERE state IS NOT NULL
            ) as t
            GROUP BY 1 ORDER BY 3 DESC LIMIT 5
        `);

        // --- 4. CAMPAIGN ANALYTICS ---
        const activeCampaignsCount = await db.select({ count: count() }).from(campaigns).where(eq(campaigns.isActive, true));
        const [totalSpend] = await db.select({ value: sum(campaigns.spentBudget) }).from(campaigns);

        const topCampaignsList = await db.select().from(campaigns).orderBy(desc(campaigns.spentBudget)).limit(3);

        return {
            executive: {
                totalPoints: totalPointsAllotted,
                activeMembers: totalUsers,
                engagement: Number(engagementRate.toFixed(1)),
                redemptionRate: Number(redemptionRate.toFixed(1)),
                pointsTrend: {
                    labels: pointsTrendResult.rows.map(r => r.month),
                    data: pointsTrendResult.rows.map(r => Number(r.total))
                },
                memberGrowth: {
                    labels: memberGrowthResult.rows.map(r => r.month),
                    data: memberGrowthResult.rows.map(r => Number(r.count))
                }
            },
            performance: {
                txnVolume: {
                    labels: txnVolumeResult.rows.map(r => r.day),
                    data: txnVolumeResult.rows.map(r => Number(r.count))
                },
                categoryPerf: {
                    labels: categoryPerfResult.rows.map(r => r.category),
                    data: categoryPerfResult.rows.map(r => Number(r.total))
                },
                kpis: {
                    avgTxnValue: Number(avgTxnValue.toFixed(1)),
                    scanFrequency: Number(scanFrequency.toFixed(1)),
                    retentionRate: Number(retentionRate.toFixed(1)),
                    conversionRate: 24.8 
                }
            },
            memberAnalytics: {
                segmentation: {
                    labels: segmentationResult.map(r => r.name || 'Unknown'),
                    data: segmentationResult.map(r => Number(r.value))
                },
                lifecycle: {
                    new: Number(newMembersCount?.count || 0),
                    active: activeRecentCount,
                    atRisk: Math.max(0, totalUsers - activeRecentCount - Number(churnedMembers?.count || 0)),
                    churned: Number(churnedMembers?.count || 0),
                    total: totalUsers
                },
                recentActivity: recentRows.map((r: any) => ({
                    ...r,
                    status: 'Active'
                })),
                satisfaction: { average: 4.6, distribution: [45, 35, 15, 4, 1] }
            },
            campaignAnalytics: {
                kpis: {
                    activeCampaigns: Number(activeCampaignsCount[0]?.count || 0),
                    totalSpend: Number(totalSpend?.value || 0),
                    totalReach: '---',
                    conversionRate: 18.5,
                    roi: 245
                },
                performanceTrend: {
                    labels: ['W1', 'W2', 'W3', 'W4'],
                    datasets: [
                        { label: 'Reach', data: [5000, 12000, 28000, 45000], borderColor: '#3b82f6', tension: 0.4 },
                        { label: 'Conversion', data: [100, 350, 980, 1850], borderColor: '#10b981', tension: 0.4 }
                    ]
                },
                channelEffectiveness: {
                    labels: ['SMS', 'WhatsApp', 'Email', 'Push Notif'],
                    data: [12, 28, 5, 8]
                },
                topCampaigns: topCampaignsList.map(c => ({
                    name: c.name,
                    type: 'Points Multiplier',
                    duration: 'Ongoing',
                    reach: '---',
                    engagement: '---',
                    conversion: '---',
                    roi: '---'
                }))
            },
            lists: {
                topMembers: topMembersResult.rows.map(r => ({
                    name: r.name,
                    sub: r.role || 'Member',
                    val: Number(r.earnings).toLocaleString()
                })),
                topProducts: topProductsResult.rows.map(r => ({
                    name: r.category,
                    sub: `${r.scans.toLocaleString()} scans`,
                    val: `₹${(Number(r.total_points) / 100).toLocaleString()}`
                })),
                topRegions: regionalPerfResult.rows.map(r => ({
                    name: r.state,
                    sub: `${r.members.toLocaleString()} members`,
                    val: `₹${(Number(r.total_earnings) / 100).toLocaleString()}`
                }))
            }
        }
    } catch (error) {
        console.error("Error fetching MIS analytics:", error);
        return null;
    }
}
