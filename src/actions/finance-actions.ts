'use server'

import { db } from "@/db"
import {
    retailers,
    electricians,
    counterSales,
    retailerTransactions,
    electricianTransactions,
    counterSalesTransactions,
    redemptions,
    users,
    redemptionStatuses,
    kycDocuments,
    userTypeEntity
} from "@/db/schema"
import { sum, sql, desc, eq, and, or, inArray } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { getUserScope } from "@/lib/scope-utils"

export interface FinanceFilters {
    startDate?: string;
    endDate?: string;
    type?: string;
    status?: string;
}

export async function getFinanceDataAction(filters?: FinanceFilters) {
    try {
        const { startDate, endDate, type, status } = filters || {};

        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");
        const scope = await getUserScope(Number(session.user.id));

        // Helper to apply filters
        const applyDateFilters = (table: any, dateField: any) => {
            const conditions = [];
            if (startDate) conditions.push(sql`${dateField} >= ${startDate}`);
            if (endDate) conditions.push(sql`${dateField} <= ${endDate}`);
            return conditions;
        };

        const rCond = applyDateFilters(retailerTransactions, retailerTransactions.createdAt);
        const eCond = applyDateFilters(electricianTransactions, electricianTransactions.createdAt);
        const csCond = applyDateFilters(counterSalesTransactions, counterSalesTransactions.createdAt);
        const redCond = applyDateFilters(redemptions, redemptions.createdAt);

        const scopeFilter = or(
            scope.type === 'State' ? inArray(retailers.state, scope.entityNames) : inArray(retailers.city, scope.entityNames),
            scope.type === 'State' ? inArray(electricians.state, scope.entityNames) : inArray(electricians.city, scope.entityNames),
            scope.type === 'State' ? inArray(counterSales.state, scope.entityNames) : inArray(counterSales.city, scope.entityNames)
        );

        // 1. Overview Metrics Calculations
        let rSumQuery = db.select({ value: sum(retailerTransactions.points) }).from(retailerTransactions);
        let eSumQuery = db.select({ value: sum(electricianTransactions.points) }).from(electricianTransactions);
        let csSumQuery = db.select({ value: sum(counterSalesTransactions.points) }).from(counterSalesTransactions);
        let redeemSumQuery = db.select({ value: sum(redemptions.pointsRedeemed) }).from(redemptions);

        if (scope.type !== 'Global') {
            rSumQuery.leftJoin(retailers, eq(retailerTransactions.userId, retailers.userId))
                .where(and(...rCond, scope.type === 'State' ? inArray(retailers.state, scope.entityNames) : inArray(retailers.city, scope.entityNames)));
            
            eSumQuery.leftJoin(electricians, eq(electricianTransactions.userId, electricians.userId))
                .where(and(...eCond, scope.type === 'State' ? inArray(electricians.state, scope.entityNames) : inArray(electricians.city, scope.entityNames)));

            csSumQuery.leftJoin(counterSales, eq(counterSalesTransactions.userId, counterSales.userId))
                .where(and(...csCond, scope.type === 'State' ? inArray(counterSales.state, scope.entityNames) : inArray(counterSales.city, scope.entityNames)));

            redeemSumQuery.leftJoin(retailers, eq(redemptions.userId, retailers.userId))
                .leftJoin(electricians, eq(redemptions.userId, electricians.userId))
                .leftJoin(counterSales, eq(redemptions.userId, counterSales.userId))
                .where(and(...redCond, scopeFilter));
        } else {
            rSumQuery.where(and(...rCond));
            eSumQuery.where(and(...eCond));
            csSumQuery.where(and(...csCond));
            redeemSumQuery.where(and(...redCond));
        }

        const [retailerSum] = await rSumQuery;
        const [electricianSum] = await eSumQuery;
        const [counterSalesSum] = await csSumQuery;
        const [redeemSum] = await redeemSumQuery;

        const totalPointsIssued = Number(retailerSum?.value || 0) + Number(electricianSum?.value || 0) + Number(counterSalesSum?.value || 0);
        const totalPointsRedeemed = Number(redeemSum?.value || 0);

        // Active Points Value
        let rBalQuery = db.select({ value: sum(retailers.pointsBalance) }).from(retailers);
        let eBalQuery = db.select({ value: sum(electricians.pointsBalance) }).from(electricians);
        let csBalQuery = db.select({ value: sum(counterSales.pointsBalance) }).from(counterSales);

        if (scope.type !== 'Global') {
            rBalQuery.where(scope.type === 'State' ? inArray(retailers.state, scope.entityNames) : inArray(retailers.city, scope.entityNames));
            eBalQuery.where(scope.type === 'State' ? inArray(electricians.state, scope.entityNames) : inArray(electricians.city, scope.entityNames));
            csBalQuery.where(scope.type === 'State' ? inArray(counterSales.state, scope.entityNames) : inArray(counterSales.city, scope.entityNames));
        }

        const [rBalance] = await rBalQuery;
        const [eBalance] = await eBalQuery;
        const [csBalance] = await csBalQuery;

        const activePointsValue = Number(rBalance?.value || 0) + Number(eBalance?.value || 0) + Number(csBalance?.value || 0);

        // 2. Fetch Recent Transactions
        let latestRetailerTx = [];
        let latestElectricianTx = [];
        let latestCounterSalesTx = [];
        let latestRedemptions = [];

        if (!type || type === 'credit') {
            let rTxQuery = db.select({ id: retailerTransactions.id, date: retailerTransactions.createdAt, points: retailerTransactions.points, userId: retailerTransactions.userId, type: sql<string>`'Credit'`, status: sql<string>`'Completed'` }).from(retailerTransactions);
            let eTxQuery = db.select({ id: electricianTransactions.id, date: electricianTransactions.createdAt, points: electricianTransactions.points, userId: electricianTransactions.userId, type: sql<string>`'Credit'`, status: sql<string>`'Completed'` }).from(electricianTransactions);
            let csTxQuery = db.select({ id: counterSalesTransactions.id, date: counterSalesTransactions.createdAt, points: counterSalesTransactions.points, userId: counterSalesTransactions.userId, type: sql<string>`'Credit'`, status: sql<string>`'Completed'` }).from(counterSalesTransactions);

            if (scope.type !== 'Global') {
                rTxQuery.leftJoin(retailers, eq(retailerTransactions.userId, retailers.userId)).where(and(...rCond, scope.type === 'State' ? inArray(retailers.state, scope.entityNames) : inArray(retailers.city, scope.entityNames)));
                eTxQuery.leftJoin(electricians, eq(electricianTransactions.userId, electricians.userId)).where(and(...eCond, scope.type === 'State' ? inArray(electricians.state, scope.entityNames) : inArray(electricians.city, scope.entityNames)));
                csTxQuery.leftJoin(counterSales, eq(counterSalesTransactions.userId, counterSales.userId)).where(and(...csCond, scope.type === 'State' ? inArray(counterSales.state, scope.entityNames) : inArray(counterSales.city, scope.entityNames)));
            } else {
                rTxQuery.where(and(...rCond));
                eTxQuery.where(and(...eCond));
                csTxQuery.where(and(...csCond));
            }

            latestRetailerTx = await rTxQuery.orderBy(desc(retailerTransactions.createdAt)).limit(50);
            latestElectricianTx = await eTxQuery.orderBy(desc(electricianTransactions.createdAt)).limit(50);
            latestCounterSalesTx = await csTxQuery.orderBy(desc(counterSalesTransactions.createdAt)).limit(50);
        }

        if (!type || type === 'debit') {
            let redQuery = db.select({
                id: redemptions.id,
                date: redemptions.createdAt,
                points: redemptions.pointsRedeemed,
                userId: redemptions.userId,
                type: sql<string>`'Debit'`,
                status: redemptionStatuses.name
            })
            .from(redemptions)
            .leftJoin(redemptionStatuses, eq(redemptions.status, redemptionStatuses.id));

            const finalRedCond = [...redCond];
            if (status) finalRedCond.push(eq(redemptionStatuses.name, status.charAt(0).toUpperCase() + status.slice(1)));

            if (scope.type !== 'Global') {
                redQuery.leftJoin(retailers, eq(redemptions.userId, retailers.userId))
                    .leftJoin(electricians, eq(redemptions.userId, electricians.userId))
                    .leftJoin(counterSales, eq(redemptions.userId, counterSales.userId))
                    .where(and(...finalRedCond, scopeFilter));
            } else {
                redQuery.where(and(...finalRedCond));
            }

            latestRedemptions = await redQuery.orderBy(desc(redemptions.createdAt)).limit(50);
        }

        const rawTransactions = [
            ...latestRetailerTx.map(t => ({ ...t, id: `RXN${t.id}`, points: Number(t.points) })),
            ...latestElectricianTx.map(t => ({ ...t, id: `EXN${t.id}`, points: Number(t.points) })),
            ...latestCounterSalesTx.map(t => ({ ...t, id: `CSX${t.id}`, points: Number(t.points) })),
            ...latestRedemptions.map(t => ({ ...t, id: `RED${t.id}`, points: Number(t.points) }))
        ]
        .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime())
        .slice(0, 50);

        const formattedTransactions = await Promise.all(rawTransactions.map(async (tx) => {
            const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, tx.userId)).limit(1);
            return {
                id: tx.id,
                date: tx.date ? new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '---',
                type: tx.type,
                member: user?.name || 'Unknown',
                amount: `₹${tx.points.toLocaleString()}`,
                status: tx.status || 'Completed',
                badgeColor: tx.type === 'Credit' ? 'badge-success' : (tx.status === 'Pending' ? 'badge-warning' : (tx.status === 'Failed' ? 'badge-danger' : 'badge-success')),
                typeBadge: tx.type === 'Credit' ? 'badge-success' : 'badge-danger'
            };
        }));

        // 3. Monthly Analysis
        let issuedMonthlySql = sql`
            SELECT TO_CHAR(created_at, 'Mon') as month, TO_CHAR(created_at, 'YYYY-MM') as "monthFull", sum(points)::numeric as total
            FROM (
                SELECT created_at, points, user_id FROM retailer_transactions
                UNION ALL
                SELECT created_at, points, user_id FROM electrician_transactions
                UNION ALL
                SELECT created_at, points, user_id FROM counter_sales_transactions
            ) as t
        `;
        
        if (scope.type !== 'Global') {
            const scopeJoin = `
                LEFT JOIN retailers r ON t.user_id = r.user_id
                LEFT JOIN electricians e ON t.user_id = e.user_id
                LEFT JOIN counter_sales cs ON t.user_id = cs.user_id
            `;
            const scopeWhere = scope.type === 'State' 
                ? `(r.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR e.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR cs.state IN (${scope.entityNames.map(n => `'${n}'`).join(',')}))`
                : `(r.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR e.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}) OR cs.city IN (${scope.entityNames.map(n => `'${n}'`).join(',')}))`;
            
            issuedMonthlySql = sql`
                SELECT TO_CHAR(t.created_at, 'Mon') as month, TO_CHAR(t.created_at, 'YYYY-MM') as "monthFull", sum(t.points)::numeric as total
                FROM (
                    SELECT created_at, points, user_id FROM retailer_transactions
                    UNION ALL
                    SELECT created_at, points, user_id FROM electrician_transactions
                    UNION ALL
                    SELECT created_at, points, user_id FROM counter_sales_transactions
                ) as t
                ${sql.raw(scopeJoin)}
                WHERE ${sql.raw(scopeWhere)}
                GROUP BY 1, 2 ORDER BY 2 DESC LIMIT 10
            `;
        } else {
            issuedMonthlySql = sql`${issuedMonthlySql} GROUP BY 1, 2 ORDER BY 2 DESC LIMIT 10`;
        }

        const issuedMonthlyResult = await db.execute(issuedMonthlySql);
        const issuedMonthly = issuedMonthlyResult.rows as any[];

        let redMonthlyQuery = db.select({
            month: sql<string>`TO_CHAR(redemptions.created_at, 'Mon')`,
            monthFull: sql<string>`TO_CHAR(redemptions.created_at, 'YYYY-MM')`,
            total: sum(redemptions.pointsRedeemed)
        })
        .from(redemptions);

        if (scope.type !== 'Global') {
            redMonthlyQuery.leftJoin(retailers, eq(redemptions.userId, retailers.userId))
                .leftJoin(electricians, eq(redemptions.userId, electricians.userId))
                .leftJoin(counterSales, eq(redemptions.userId, counterSales.userId))
                .where(scopeFilter);
        }

        const redeemedMonthly = await redMonthlyQuery
            .groupBy(sql`TO_CHAR(redemptions.created_at, 'YYYY-MM')`, sql`TO_CHAR(redemptions.created_at, 'Mon')`)
            .orderBy(sql`TO_CHAR(redemptions.created_at, 'YYYY-MM') DESC`)
            .limit(10);

        const labels = issuedMonthly.map(m => m.month).reverse();
        const flowData = {
            labels,
            allotted: labels.map(l => Number(issuedMonthly.find(m => m.month === l)?.total || 0)),
            redeemed: labels.map(l => Number(redeemedMonthly.find(m => m.month === l)?.total || 0))
        };

        // 4. Sector-wise distribution
        let sectorQuery = db.select({
            sector: userTypeEntity.typeName,
            value: sum(retailerTransactions.points) // This will be adjusted based on join
        })
        .from(userTypeEntity);
        // Sector distribution is complex because it depends on different transaction tables.
        // For simplicity, we'll do 3 separate scoped queries.

        const getSectorPoints = async (type: string) => {
            let q;
            if (type === 'Retailer') {
                q = db.select({ total: sum(retailerTransactions.points) }).from(retailerTransactions).leftJoin(retailers, eq(retailerTransactions.userId, retailers.userId));
                if (scope.type !== 'Global') q.where(scope.type === 'State' ? inArray(retailers.state, scope.entityNames) : inArray(retailers.city, scope.entityNames));
            } else if (type === 'Electrician') {
                q = db.select({ total: sum(electricianTransactions.points) }).from(electricianTransactions).leftJoin(electricians, eq(electricianTransactions.userId, electricians.userId));
                if (scope.type !== 'Global') q.where(scope.type === 'State' ? inArray(electricians.state, scope.entityNames) : inArray(electricians.city, scope.entityNames));
            } else {
                q = db.select({ total: sum(counterSalesTransactions.points) }).from(counterSalesTransactions).leftJoin(counterSales, eq(counterSalesTransactions.userId, counterSales.userId));
                if (scope.type !== 'Global') q.where(scope.type === 'State' ? inArray(counterSales.state, scope.entityNames) : inArray(counterSales.city, scope.entityNames));
            }
            const [res] = await q;
            return Number(res?.total || 0);
        }

        const sectors = [
            { name: 'Retailers', value: await getSectorPoints('Retailer'), color: '#3B82F6' },
            { name: 'Electricians', value: await getSectorPoints('Electrician'), color: '#10B981' },
            { name: 'Counter Staff', value: await getSectorPoints('Counter Staff'), color: '#F59E0B' }
        ];

        return {
            metrics: {
                totalPointsIssued,
                totalPointsRedeemed,
                activePointsValue,
                payoutsProcessed: totalPointsRedeemed // Simple assumption
            },
            transactions: formattedTransactions,
            flowData,
            sectors
        };

    } catch (error) {
        console.error("Finance Data Action Error:", error);
        throw error;
    }
}
