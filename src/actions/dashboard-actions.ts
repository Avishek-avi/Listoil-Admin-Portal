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

export async function getDashboardDataAction(filters?: { growthRange?: string, transactionRange?: string }) {
    try {
        const growthRange = filters?.growthRange || '7d';
        const transactionRange = filters?.transactionRange || '7d';

        const session = await auth();

        if (!session?.user?.id) throw new Error("Unauthorized");
        const userId = Number(session.user.id);
        const scope = await getUserScope(userId);

        const lowerNames = (scope.entityNames || []).map(n => n.toLowerCase());

        // Helper to get scope filtering condition
        const getScopeCondition = (table: any) => {
            if (scope.type === 'Global') return sql`1=1`;
            if (lowerNames.length === 0) return sql`1=0`;
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

        // Segment Specific Stats - Scoped
        const retActiveQuery = db.select({ count: count() }).from(retailers).leftJoin(users, eq(retailers.userId, users.id)).where(eq(users.isSuspended, false));
        const retKycQuery = db.select({ count: count() }).from(retailers).where(eq(retailers.isKycVerified, true));
        const retTotalQuery = db.select({ count: count() }).from(retailers);

        const mechActiveQuery = db.select({ count: count() }).from(mechanics).leftJoin(users, eq(mechanics.userId, users.id)).where(eq(users.isSuspended, false));
        const mechKycQuery = db.select({ count: count() }).from(mechanics).where(eq(mechanics.isKycVerified, true));
        const mechTotalQuery = db.select({ count: count() }).from(mechanics);

        const [retActive] = await retActiveQuery.where(and(getScopeCondition(retailers), eq(users.isSuspended, false)));
        const [retKyc] = await retKycQuery.where(and(getScopeCondition(retailers), eq(retailers.isKycVerified, true)));
        const [retTotal] = await retTotalQuery.where(getScopeCondition(retailers));

        const [mechActive] = await mechActiveQuery.where(and(getScopeCondition(mechanics), eq(users.isSuspended, false)));
        const [mechKyc] = await mechKycQuery.where(and(getScopeCondition(mechanics), eq(mechanics.isKycVerified, true)));
        const [mechTotal] = await mechTotalQuery.where(getScopeCondition(mechanics));

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

        // 7. KYC Status (Scoped)
        let kycStatsQuery = db.select({
            status: approvalStatuses.name,
            count: count()
        })
            .from(users)
            .leftJoin(approvalStatuses, eq(users.approvalStatusId, approvalStatuses.id))
            .where(inArray(users.roleId, STAKEHOLDER_ROLES))
            .$dynamic();

        if (scope.type !== 'Global') {
            kycStatsQuery = kycStatsQuery
                .leftJoin(retailers, eq(users.id, retailers.userId))
                .leftJoin(mechanics, eq(users.id, mechanics.userId))
                .leftJoin(counterSales, eq(users.id, counterSales.userId))
                .where(or(
                    inArray(sql`LOWER(${scope.type === 'State' ? retailers.state : retailers.city})`, lowerNames),
                    inArray(sql`LOWER(${scope.type === 'State' ? mechanics.state : mechanics.city})`, lowerNames),
                    inArray(sql`LOWER(${scope.type === 'State' ? counterSales.state : counterSales.city})`, lowerNames)
                )) as any;
        }

        const kycStats = await kycStatsQuery.groupBy(approvalStatuses.name);

        const kycApproved = kycStats.find(s => s.status === 'KYC_APPROVED' || s.status === 'ACTIVE')?.count || 0;
        const kycPending = kycStats.find(s => s.status === 'KYC_PENDING' || s.status === 'PENDING')?.count || 0;

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


        // 10. Top Performers (Combined - Scoped)
        let topPerformers: any[] = [];
        try {
            let topSql = sql`
                SELECT u.name, COALESCE(SUM(t.points), 0) as total_points
                FROM (
                    SELECT user_id, points FROM counter_sales_transaction_logs
                    UNION ALL
                    SELECT user_id, points FROM retailer_transactions
                    UNION ALL
                    SELECT user_id, points FROM mechanic_transaction_logs
                ) as t
                JOIN users u ON u.id = t.user_id
            `;

            if (scope.type !== 'Global') {
                const lowerEntities = lowerNames.map(n => `'${n}'`).join(',');
                const scopeJoin = `
                    LEFT JOIN retailers r ON u.id = r.user_id
                    LEFT JOIN mechanics m ON u.id = m.user_id
                    LEFT JOIN counter_sales cs ON u.id = cs.user_id
                `;
                const scopeWhere = scope.type === 'State'
                    ? `(LOWER(r.state) IN (${lowerEntities}) OR LOWER(m.state) IN (${lowerEntities}) OR LOWER(cs.state) IN (${lowerEntities}))`
                    : `(LOWER(r.city) IN (${lowerEntities}) OR LOWER(m.city) IN (${lowerEntities}) OR LOWER(cs.city) IN (${lowerEntities}))`;

                topSql = sql.raw(`
                    SELECT u.name, COALESCE(SUM(t.points), 0) as total_points
                    FROM (
                        SELECT user_id, points FROM counter_sales_transaction_logs
                        UNION ALL
                        SELECT user_id, points FROM retailer_transactions
                        UNION ALL
                        SELECT user_id, points FROM mechanic_transaction_logs
                    ) as t
                    JOIN users u ON u.id = t.user_id
                    ${scopeJoin}
                    WHERE ${scopeWhere}
                    GROUP BY u.id, u.name
                    ORDER BY total_points DESC
                    LIMIT 5
                `);
            } else {
                topSql = sql`
                    SELECT u.name, COALESCE(SUM(t.points), 0) as total_points
                    FROM (
                        SELECT user_id, points FROM counter_sales_transaction_logs
                        UNION ALL
                        SELECT user_id, points FROM retailer_transactions
                        UNION ALL
                        SELECT user_id, points FROM mechanic_transaction_logs
                    ) as t
                    JOIN users u ON u.id = t.user_id
                    GROUP BY u.id, u.name
                    ORDER BY total_points DESC
                    LIMIT 5
                `;
            }

            const topPerformersData = await db.execute(topSql);

            topPerformers = (topPerformersData.rows || []).map((p: any, i: number) => ({
                name: p.name || 'Unknown',
                pts: `${Math.round(Number(p.total_points) || 0)} pts`,
                change: '+0%',
                rank: i + 1,
                initial: (p.name || 'U').charAt(0),
                bg: ['bg-yellow-100', 'bg-gray-100', 'bg-orange-100'][i] || 'bg-red-100',
                text: ['text-yellow-800', 'text-gray-800', 'text-orange-800'][i] || 'text-red-800'
            }));
        } catch (e) {
            console.error("Top performers query error:", e);
        }

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

        const memberGrowth = await safeExecute(sql.raw(`
            SELECT day::text, count(*) as count FROM (
                SELECT date_trunc('day', created_at)::date as day
                FROM users
            ) t
            WHERE day >= (now() - interval '${growthInterval}')::date
            GROUP BY 1 ORDER BY 1
        `));

        const pointsEarned = await safeExecute(sql.raw(`
            SELECT day::text, sum(points) as points FROM (
                SELECT date_trunc('day', created_at)::date as day, points FROM counter_sales_transaction_logs
                UNION ALL
                SELECT date_trunc('day', created_at)::date as day, points FROM retailer_transactions
                UNION ALL
                SELECT date_trunc('day', created_at)::date as day, points FROM mechanic_transaction_logs
            ) as t
            WHERE day >= (now() - interval '${transInterval}')::date
            GROUP BY 1 ORDER BY 1
        `));

        const pointsRedeemed = await safeExecute(sql.raw(`
            SELECT day::text, sum(points) as points FROM (
                SELECT date_trunc('day', created_at)::date as day, points_deducted as points FROM physical_rewards_redemptions
                UNION ALL
                SELECT date_trunc('day', created_at)::date as day, points_deducted as points FROM user_amazon_orders
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
            pendingApprovalsCount: totalPendingCount,
            pendingApprovals: pendingItems,

            adminStats: {
                totalAdmins: Number(adminCount?.count) || 0,
                activeAdmins: Number(activeAdminCount?.count) || 0
            },
            segments: {
                retailer: {
                    points: Number(retPointsVal?.value) || 0,
                    active: Number(retActive?.count) || 0,
                    kycCompliance: Number(retTotal?.count) ? Math.round((Number(retKyc?.count) / Number(retTotal?.count)) * 100) : 0,
                    total: Number(retTotal?.count) || 0
                },
                mechanic: {
                    points: Number(mechPointsVal?.value) || 0,
                    active: Number(mechActive?.count) || 0,
                    kycCompliance: Number(mechTotal?.count) ? Math.round((Number(mechKyc?.count) / Number(mechTotal?.count)) * 100) : 0,
                    total: Number(mechTotal?.count) || 0
                }
            },
            charts: {
                memberGrowth: {
                    data: mapToDays(memberGrowth, 'count', growthDays),
                    labels: growthDays.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
                },
                pointsTransactions: {
                    earned: mapToDays(pointsEarned, 'points', transactionDays),
                    redeemed: mapToDays(pointsRedeemed, 'points', transactionDays),
                    labels: transactionDays.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
                }
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
            pendingApprovals: [],

            segments: {
                retailer: { points: 0, active: 0, kycCompliance: 0, total: 0 },
                mechanic: { points: 0, active: 0, kycCompliance: 0, total: 0 }
            },
            charts: { memberGrowth: [], pointsEarned: [], pointsRedeemed: [] }
        };
    }
}


