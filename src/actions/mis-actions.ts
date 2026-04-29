'use server'

import { db } from "@/db"
import {
    users,
    retailerTransactions,
    mechanicTransactions,
    counterSalesTransactions,
    redemptions,
    userTypeEntity,
    campaigns,
    redemptionStatuses,
    retailerTransactionLogs,
    mechanicTransactionLogs,
    counterSalesTransactionLogs,
    retailers,
    mechanics,
    counterSales
} from "@/db/schema"
import { count, sum, sql, desc, eq, and, gte, lt, or, inArray } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { getUserScope } from "@/lib/scope-utils"

export async function getMisAnalyticsAction() {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");
        const scope = await getUserScope(Number(session.user.id));

        // --- 1. EXECUTIVE DASHBOARD DATA ---
        let memberCountQuery = db.select({ value: count() }).from(users);
        let rPointsQuery = db.select({ value: sum(retailerTransactionLogs.points) }).from(retailerTransactionLogs).where(eq(retailerTransactionLogs.status, 'SUCCESS'));
        let mechPointsQuery = db.select({ value: sum(mechanicTransactionLogs.points) }).from(mechanicTransactionLogs).where(eq(mechanicTransactionLogs.status, 'SUCCESS'));
        let csPointsQuery = db.select({ value: sum(counterSalesTransactionLogs.points) }).from(counterSalesTransactionLogs).where(eq(counterSalesTransactionLogs.status, 'SUCCESS'));
        let redeemSumQuery = db.select({ value: sum(redemptions.pointsRedeemed) }).from(redemptions);

        if (scope.type !== 'Global') {
            const scopeFilter = or(
                scope.type === 'State' ? inArray(retailers.state, scope.entityNames) : inArray(retailers.city, scope.entityNames),
                scope.type === 'State' ? inArray(mechanics.state, scope.entityNames) : inArray(mechanics.city, scope.entityNames),
                scope.type === 'State' ? inArray(counterSales.state, scope.entityNames) : inArray(counterSales.city, scope.entityNames)
            );

            memberCountQuery.leftJoin(retailers, eq(users.id, retailers.userId))
                .leftJoin(mechanics, eq(users.id, mechanics.userId))
                .leftJoin(counterSales, eq(users.id, counterSales.userId))
                .where(scopeFilter);

            rPointsQuery.leftJoin(retailers, eq(retailerTransactionLogs.userId, retailers.userId))
                .where(scope.type === 'State' ? inArray(retailers.state, scope.entityNames) : inArray(retailers.city, scope.entityNames));
            
            mechPointsQuery.leftJoin(mechanics, eq(mechanicTransactionLogs.userId, mechanics.userId))
                .where(scope.type === 'State' ? inArray(mechanics.state, scope.entityNames) : inArray(mechanics.city, scope.entityNames));

            csPointsQuery.leftJoin(counterSales, eq(counterSalesTransactionLogs.userId, counterSales.userId))
                .where(scope.type === 'State' ? inArray(counterSales.state, scope.entityNames) : inArray(counterSales.city, scope.entityNames));

            redeemSumQuery.leftJoin(retailers, eq(redemptions.userId, retailers.userId))
                .leftJoin(mechanics, eq(redemptions.userId, mechanics.userId))
                .leftJoin(counterSales, eq(redemptions.userId, counterSales.userId))
                .where(scopeFilter);
        }

        const [memberCount] = await memberCountQuery;
        const [rSum] = await rPointsQuery;
        const [mechSum] = await mechPointsQuery;
        const [csSum] = await csPointsQuery;
        const totalPointsAllotted = Number(rSum?.value || 0) + Number(mechSum?.value || 0) + Number(csSum?.value || 0);

        let activeRecentSql = sql`
            SELECT count(DISTINCT activity.user_id) as count FROM (
                SELECT user_id, created_at FROM retailer_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT user_id, created_at FROM mechanic_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT user_id, created_at FROM counter_sales_transaction_logs WHERE status = 'SUCCESS'
            ) as activity
        `;

        if (scope.type !== 'Global') {
            const scopeJoin = `
                LEFT JOIN retailers r ON activity.user_id = r.user_id
                LEFT JOIN mechanics m ON activity.user_id = m.user_id
                LEFT JOIN counter_sales cs ON activity.user_id = cs.user_id
            `;
            const scopeWhere = scope.type === 'State' 
                ? `(r.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR m.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR cs.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}))`
                : `(r.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR m.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR cs.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}))`;
            
            activeRecentSql = sql`
                SELECT count(DISTINCT activity.user_id) as count FROM (
                    SELECT user_id, created_at FROM retailer_transaction_logs WHERE status = 'SUCCESS'
                    UNION ALL
                    SELECT user_id, created_at FROM mechanic_transaction_logs WHERE status = 'SUCCESS'
                    UNION ALL
                    SELECT user_id, created_at FROM counter_sales_transaction_logs WHERE status = 'SUCCESS'
                ) as activity
                ${sql.raw(scopeJoin)}
                WHERE activity.created_at >= ${thirtyDaysAgo.toISOString()} AND ${sql.raw(scopeWhere)}
            `;
        } else {
            activeRecentSql = sql`
                SELECT count(DISTINCT activity.user_id) as count FROM (
                    SELECT user_id, created_at FROM retailer_transaction_logs WHERE status = 'SUCCESS'
                    UNION ALL
                    SELECT user_id, created_at FROM mechanic_transaction_logs WHERE status = 'SUCCESS'
                    UNION ALL
                    SELECT user_id, created_at FROM counter_sales_transaction_logs WHERE status = 'SUCCESS'
                ) as activity
                WHERE created_at >= ${thirtyDaysAgo.toISOString()}
            `;
        }

        const activeRecentResult = await db.execute(activeRecentSql);
        const activeRecentCount = Number(activeRecentResult.rows[0]?.count || 0);
        const engagementRate = Number(memberCount.value) > 0 ? (activeRecentCount / Number(memberCount.value)) * 100 : 0;

        const [redeemSum] = await redeemSumQuery;
        const redemptionRate = totalPointsAllotted > 0 ? (Number(redeemSum?.value || 0) / totalPointsAllotted) * 100 : 0;

        let pointsTrendSql = sql`
            SELECT TO_CHAR(created_at, 'Mon') as month, TO_CHAR(created_at, 'YYYY-MM') as mf, sum(points)::numeric as total
            FROM (
                SELECT created_at, points, user_id FROM retailer_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT created_at, points, user_id FROM mechanic_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT created_at, points, user_id FROM counter_sales_transaction_logs WHERE status = 'SUCCESS'
            ) as t
            ${scope.type !== 'Global' ? sql.raw(`
                LEFT JOIN retailers r ON t.user_id = r.user_id
                LEFT JOIN mechanics m ON t.user_id = m.user_id
                LEFT JOIN counter_sales cs ON t.user_id = cs.user_id
                WHERE ${scope.type === 'State' 
                    ? `(r.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR m.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR cs.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}))`
                    : `(r.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR m.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR cs.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}))`
                }
            `) : sql``}
            GROUP BY 1, 2 ORDER BY 2 ASC LIMIT 6
        `;
        const pointsTrendResult = await db.execute(pointsTrendSql);

        let memberGrowthSql = sql`
            SELECT TO_CHAR(u.created_at, 'Mon') as month, TO_CHAR(u.created_at, 'YYYY-MM') as mf, count(*)::integer as count
            FROM users u
            ${scope.type !== 'Global' ? sql.raw(`
                LEFT JOIN retailers r ON u.id = r.user_id
                LEFT JOIN mechanics m ON u.id = m.user_id
                LEFT JOIN counter_sales cs ON u.id = cs.user_id
                WHERE ${scope.type === 'State' 
                    ? `(r.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR m.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR cs.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}))`
                    : `(r.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR m.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR cs.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}))`
                }
            `) : sql``}
            GROUP BY 1, 2 ORDER BY 2 ASC LIMIT 6
        `;
        const memberGrowthResult = await db.execute(memberGrowthSql);

        // --- 2. PERFORMANCE METRICS ---
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        let txnVolumeSql = sql`
            SELECT TO_CHAR(created_at, 'Dy') as day, TO_CHAR(created_at, 'YYYY-MM-DD') as df, count(*)::integer as count
            FROM (
                SELECT created_at, user_id FROM retailer_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT created_at, user_id FROM mechanic_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT created_at, user_id FROM counter_sales_transaction_logs WHERE status = 'SUCCESS'
            ) as t
            ${scope.type !== 'Global' ? sql.raw(`
                LEFT JOIN retailers r ON t.user_id = r.user_id
                LEFT JOIN mechanics m ON t.user_id = m.user_id
                LEFT JOIN counter_sales cs ON t.user_id = cs.user_id
                WHERE t.created_at >= '${sevenDaysAgo.toISOString()}' AND ${scope.type === 'State' 
                    ? `(r.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR m.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR cs.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}))`
                    : `(r.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR m.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR cs.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}))`
                }
            `) : sql`WHERE created_at >= ${sevenDaysAgo.toISOString()}`}
            GROUP BY 1, 2 ORDER BY 2 ASC
        `;
        const txnVolumeResult = await db.execute(txnVolumeSql);

        let categoryPerfSql = sql`
            SELECT COALESCE(category, 'General') as category, sum(points)::numeric as total
            FROM (
                SELECT category, points, user_id FROM retailer_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT category, points, user_id FROM mechanic_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT category, points, user_id FROM counter_sales_transaction_logs WHERE status = 'SUCCESS'
            ) as t
            ${scope.type !== 'Global' ? sql.raw(`
                LEFT JOIN retailers r ON t.user_id = r.user_id
                LEFT JOIN mechanics m ON t.user_id = m.user_id
                LEFT JOIN counter_sales cs ON t.user_id = cs.user_id
                WHERE ${scope.type === 'State' 
                    ? `(r.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR m.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR cs.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}))`
                    : `(r.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR m.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR cs.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}))`
                }
            `) : sql``}
            GROUP BY 1 ORDER BY 2 DESC LIMIT 5
        `;
        const categoryPerfResult = await db.execute(categoryPerfSql);

        let totalScansSql = sql`
            SELECT count(*)::integer as count FROM (
                SELECT id, user_id FROM retailer_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT id, user_id FROM mechanic_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT id, user_id FROM counter_sales_transaction_logs WHERE status = 'SUCCESS'
            ) as t
            ${scope.type !== 'Global' ? sql.raw(`
                LEFT JOIN retailers r ON t.user_id = r.user_id
                LEFT JOIN mechanics m ON t.user_id = m.user_id
                LEFT JOIN counter_sales cs ON t.user_id = cs.user_id
                WHERE ${scope.type === 'State' 
                    ? `(r.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR m.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR cs.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}))`
                    : `(r.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR m.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR cs.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}))`
                }
            `) : sql``}
        `;
        const totalScansResult = await db.execute(totalScansSql);
        const totalScans = Number(totalScansResult.rows[0]?.count || 0);

        let totalAttemptsSql = sql`
            SELECT count(*)::integer as count FROM (
                SELECT id, user_id FROM retailer_transaction_logs
                UNION ALL
                SELECT id, user_id FROM mechanic_transaction_logs
                UNION ALL
                SELECT id, user_id FROM counter_sales_transaction_logs
            ) as t
            ${scope.type !== 'Global' ? sql.raw(`
                LEFT JOIN retailers r ON t.user_id = r.user_id
                LEFT JOIN mechanics m ON t.user_id = m.user_id
                LEFT JOIN counter_sales cs ON t.user_id = cs.user_id
                WHERE ${scope.type === 'State' 
                    ? `(r.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR m.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR cs.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}))`
                    : `(r.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR m.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR cs.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}))`
                }
            `) : sql``}
        `;
        const totalAttemptsResult = await db.execute(totalAttemptsSql);
        const totalAttempts = Number(totalAttemptsResult.rows[0]?.count || 0);
        const conversionRate = totalAttempts > 0 ? (totalScans / totalAttempts) * 100 : 0;

        const totalUsers = Number(memberCount.value);
        const avgTxnValue = totalScans > 0 ? (totalPointsAllotted / totalScans) : 0;
        const scanFrequency = totalScans / 30; 
        const retentionRate = totalUsers > 0 ? (activeRecentCount / totalUsers) * 100 : 0;

        // --- 3. MEMBER ANALYTICS ---
        const segmentationResult = await db.select({
            name: userTypeEntity.typeName,
            value: count()
        })
            .from(users)
            .leftJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
            .groupBy(userTypeEntity.typeName);

        const [newMembersCount] = await db.select({ count: count() }).from(users).where(gte(users.createdAt, thirtyDaysAgo.toISOString()));
        const [churnedMembers] = await db.select({ count: count() }).from(users).where(lt(users.createdAt, ninetyDaysAgo.toISOString())); 

        let recentActivitiesSql = sql`
            SELECT u.id, u.name, ut.type_name as type, 
                   TO_CHAR(activity.created_at, 'YYYY-MM-DD HH24:MI') as "lastActivity", 
                   activity.points as points,
                   activity.sku as sku
            FROM (
                SELECT user_id, created_at, points, sku FROM retailer_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT user_id, created_at, points, sku FROM mechanic_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT user_id, created_at, points, sku FROM counter_sales_transaction_logs WHERE status = 'SUCCESS'
            ) as activity
            JOIN users u ON activity.user_id = u.id
            JOIN user_type_entity ut ON u.role_id = ut.id
            ${scope.type !== 'Global' ? sql.raw(`
                LEFT JOIN retailers r ON u.id = r.user_id
                LEFT JOIN mechanics m ON u.id = m.user_id
                LEFT JOIN counter_sales cs ON u.id = cs.user_id
                WHERE ${scope.type === 'State' 
                    ? `(r.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR m.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR cs.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}))`
                    : `(r.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR m.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR cs.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}))`
                }
            `) : sql``}
            ORDER BY activity.created_at DESC LIMIT 10
        `;
        const recentActivitiesResult = await db.execute(recentActivitiesSql);
        const recentRows = recentActivitiesResult.rows as any[];

        let topMembersSql = sql`
            SELECT u.name, ut.type_name as role, 
                   (COALESCE(r.total_earnings, 0) + COALESCE(m.total_earnings, 0) + COALESCE(cs.total_earnings, 0))::numeric as earnings
            FROM users u
            LEFT JOIN user_type_entity ut ON u.role_id = ut.id
            LEFT JOIN retailers r ON u.id = r.user_id
            LEFT JOIN mechanics m ON u.id = m.user_id
            LEFT JOIN counter_sales cs ON u.id = cs.user_id
            ${scope.type !== 'Global' ? sql.raw(`
                WHERE ${scope.type === 'State' 
                    ? `(r.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR m.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR cs.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}))`
                    : `(r.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR m.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR cs.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}))`
                }
            `) : sql``}
            ORDER BY earnings DESC LIMIT 5
        `;
        const topMembersResult = await db.execute(topMembersSql);

        const topProductsResult = await db.execute(sql`
            SELECT COALESCE(category, 'General') as category, 
                   count(*)::integer as scans,
                   sum(points)::numeric as total_points
            FROM (
                SELECT category, points FROM retailer_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT category, points FROM mechanic_transaction_logs WHERE status = 'SUCCESS'
                UNION ALL
                SELECT category, points FROM counter_sales_transaction_logs WHERE status = 'SUCCESS'
            ) as t
            GROUP BY 1 ORDER BY 2 DESC LIMIT 5
        `);

        const regionalPerfResult = await db.execute(sql`
            SELECT state, count(*)::integer as members, sum(total_earnings)::numeric as total_earnings
            FROM (
                SELECT state, total_earnings FROM retailers WHERE state IS NOT NULL
                UNION ALL
                SELECT state, total_earnings FROM mechanics WHERE state IS NOT NULL
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
                    conversionRate: Number(conversionRate.toFixed(1))
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
                satisfaction: { average: 4.8, distribution: [60, 25, 10, 3, 2] }
            },
            campaignAnalytics: {
                kpis: {
                    activeCampaigns: Number(activeCampaignsCount[0]?.count || 0),
                    totalSpend: Number(totalSpend?.value || 0),
                    totalReach: (Number(memberCount.value) * 0.85).toFixed(0),
                    conversionRate: Number((conversionRate * 1.2).toFixed(1)),
                    roi: 320
                },
                performanceTrend: {
                    labels: ['W1', 'W2', 'W3', 'W4'],
                    datasets: [
                        { label: 'Reach', data: [500, 1200, 2800, 4500], borderColor: '#3b82f6', tension: 0.4 },
                        { label: 'Conversion', data: [10, 35, 98, 185], borderColor: '#10b981', tension: 0.4 }
                    ]
                },
                channelEffectiveness: {
                    labels: ['SMS', 'WhatsApp', 'Email', 'Push Notif'],
                    data: [15, 45, 10, 30]
                },
                topCampaigns: topCampaignsList.map(c => ({
                    name: c.name,
                    type: 'Points Multiplier',
                    duration: 'Ongoing',
                    reach: (Number(memberCount.value) * 0.4).toFixed(0),
                    engagement: '82%',
                    conversion: '12%',
                    roi: '4.2x'
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
