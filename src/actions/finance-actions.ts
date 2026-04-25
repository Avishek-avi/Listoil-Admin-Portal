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
import { sum, sql, desc, eq, and } from "drizzle-orm"

export interface FinanceFilters {
    startDate?: string;
    endDate?: string;
    type?: string;
    status?: string;
}

export async function getFinanceDataAction(filters?: FinanceFilters) {
    try {
        const { startDate, endDate, type, status } = filters || {};

        // Helper to apply filters
        const applyFilters = (table: any, dateField: any) => {
            const conditions = [];
            if (startDate) conditions.push(sql`${dateField} >= ${startDate}`);
            if (endDate) conditions.push(sql`${dateField} <= ${endDate}`);
            return conditions.length > 0 ? and(...conditions) : undefined;
        };

        // 1. Overview Metrics Calculations

        // Total Points Issued (Sum of all earning transactions)
        const retailerConditions = applyFilters(retailerTransactions, retailerTransactions.createdAt);
        const [retailerSum] = await db.select({ value: sum(retailerTransactions.points) })
            .from(retailerTransactions)
            .where(retailerConditions);

        const electricianConditions = applyFilters(electricianTransactions, electricianTransactions.createdAt);
        const [electricianSum] = await db.select({ value: sum(electricianTransactions.points) })
            .from(electricianTransactions)
            .where(electricianConditions);

        const counterSalesConditions = applyFilters(counterSalesTransactions, counterSalesTransactions.createdAt);
        const [counterSalesSum] = await db.select({ value: sum(counterSalesTransactions.points) })
            .from(counterSalesTransactions)
            .where(counterSalesConditions);

        const totalPointsIssued = Number(retailerSum?.value || 0) +
            Number(electricianSum?.value || 0) +
            Number(counterSalesSum?.value || 0);

        // Total Points Redeemed (Sum of pointsRedeemed from redemptions)
        const redemptionConditions = applyFilters(redemptions, redemptions.createdAt);
        const [redemptionSum] = await db.select({ value: sum(redemptions.pointsRedeemed) })
            .from(redemptions)
            .where(redemptionConditions);
        const totalPointsRedeemed = Number(redemptionSum?.value || 0);

        // Active Points Value (Sum of pointsBalance from all stakeholder tables)
        const [rBalance] = await db.select({ value: sum(retailers.pointsBalance) }).from(retailers);
        const [eBalance] = await db.select({ value: sum(electricians.pointsBalance) }).from(electricians);
        const [csBalance] = await db.select({ value: sum(counterSales.pointsBalance) }).from(counterSales);

        const activePointsValue = Number(rBalance?.value || 0) +
            Number(eBalance?.value || 0) +
            Number(csBalance?.value || 0);

        // 2. Fetch Recent Transactions (Combined Credits and Debits)

        let latestRetailerTx = [];
        let latestElectricianTx = [];
        let latestCounterSalesTx = [];
        let latestRedemptions = [];

        if (!type || type === 'credit') {
            latestRetailerTx = await db.select({
                id: retailerTransactions.id,
                date: retailerTransactions.createdAt,
                points: retailerTransactions.points,
                userId: retailerTransactions.userId,
                type: sql<string>`'Credit'`,
                status: sql<string>`'Completed'`
            }).from(retailerTransactions)
                .where(retailerConditions)
                .orderBy(desc(retailerTransactions.createdAt)).limit(50);

            latestElectricianTx = await db.select({
                id: electricianTransactions.id,
                date: electricianTransactions.createdAt,
                points: electricianTransactions.points,
                userId: electricianTransactions.userId,
                type: sql<string>`'Credit'`,
                status: sql<string>`'Completed'`
            }).from(electricianTransactions)
                .where(electricianConditions)
                .orderBy(desc(electricianTransactions.createdAt)).limit(50);

            latestCounterSalesTx = await db.select({
                id: counterSalesTransactions.id,
                date: counterSalesTransactions.createdAt,
                points: counterSalesTransactions.points,
                userId: counterSalesTransactions.userId,
                type: sql<string>`'Credit'`,
                status: sql<string>`'Completed'`
            }).from(counterSalesTransactions)
                .where(counterSalesConditions)
                .orderBy(desc(counterSalesTransactions.createdAt)).limit(50);
        }

        if (!type || type === 'debit') {
            const redConditions = [];
            if (redemptionConditions) redConditions.push(redemptionConditions);
            if (status) {
                // Map status string to status name if needed, or assume it's ID
                // For simplicity, let's just filter by redemptionStatus.name if possible
            }

            let query = db.select({
                id: redemptions.id,
                date: redemptions.createdAt,
                points: redemptions.pointsRedeemed,
                userId: redemptions.userId,
                type: sql<string>`'Debit'`,
                status: redemptionStatuses.name
            })
                .from(redemptions)
                .leftJoin(redemptionStatuses, eq(redemptions.status, redemptionStatuses.id));

            const whereConditions = [];
            if (redemptionConditions) whereConditions.push(redemptionConditions);
            if (status) whereConditions.push(eq(redemptionStatuses.name, status.charAt(0).toUpperCase() + status.slice(1)));

            if (whereConditions.length > 0) {
                latestRedemptions = await query.where(and(...whereConditions)).orderBy(desc(redemptions.createdAt)).limit(50);
            } else {
                latestRedemptions = await query.orderBy(desc(redemptions.createdAt)).limit(50);
            }
        }

        // Combine all, add prefixes to IDs to avoid collisions, and sort by date
        const rawTransactions = [
            ...latestRetailerTx.map(t => ({ ...t, id: `RXN${t.id}`, points: Number(t.points) })),
            ...latestElectricianTx.map(t => ({ ...t, id: `EXN${t.id}`, points: Number(t.points) })),
            ...latestCounterSalesTx.map(t => ({ ...t, id: `CSX${t.id}`, points: Number(t.points) })),
            ...latestRedemptions.map(t => ({ ...t, id: `RED${t.id}`, points: Number(t.points) }))
        ]
            .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime())
            .slice(0, 50);

        // Fetch User names for the combined list
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

        // 3. Monthly Points Flow Analysis (Optional: could also be filtered)
        const issuedMonthlyResult = await db.execute(sql`
            SELECT 
                TO_CHAR(created_at, 'Mon') as month,
                TO_CHAR(created_at, 'YYYY-MM') as "monthFull",
                sum(points)::numeric as total
            FROM (
                SELECT created_at, points FROM retailer_transactions
                UNION ALL
                SELECT created_at, points FROM electrician_transactions
                UNION ALL
                SELECT created_at, points FROM counter_sales_transactions
            ) as t
            GROUP BY 1, 2
            ORDER BY 2 DESC
            LIMIT 10
        `);
        const issuedMonthly = issuedMonthlyResult.rows as any[];

        const redeemedMonthly = await db.select({
            month: sql<string>`TO_CHAR(created_at, 'Mon')`,
            monthFull: sql<string>`TO_CHAR(created_at, 'YYYY-MM')`,
            total: sum(redemptions.pointsRedeemed)
        })
            .from(redemptions)
            .groupBy(sql`TO_CHAR(created_at, 'YYYY-MM')`, sql`TO_CHAR(created_at, 'Mon')`)
            .orderBy(sql`TO_CHAR(created_at, 'YYYY-MM') DESC`)
            .limit(10);

        // Merge and prepare for UI
        const labelsMap = new Map();
        issuedMonthly.forEach(row => {
            labelsMap.set(row.monthFull, { label: row.month, issued: Number(row.total), redeemed: 0 });
        });
        redeemedMonthly.forEach(row => {
            if (labelsMap.has(row.monthFull)) {
                labelsMap.get(row.monthFull).redeemed = Number(row.total);
            } else {
                labelsMap.set(row.monthFull, { label: row.month, issued: 0, redeemed: Number(row.total) });
            }
        });

        const sortedMonths = Array.from(labelsMap.keys()).sort();
        const graphLabels = sortedMonths.map(m => labelsMap.get(m).label);
        const graphIssued = sortedMonths.map(m => labelsMap.get(m).issued);
        const graphRedeemed = sortedMonths.map(m => labelsMap.get(m).redeemed);

        return {
            overview: {
                totalRevenue: 24567890,
                pointsIssued: totalPointsIssued,
                pointsRedeemed: totalPointsRedeemed,
                activePointsValue: activePointsValue,
                revenueTrend: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
                    data: [18000000, 19500000, 21000000, 19800000, 22000000, 23500000, 24500000, 23800000, 25200000, 24567890]
                },
                pointsFlow: {
                    labels: graphLabels.length > 0 ? graphLabels : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
                    issued: graphIssued.length > 0 ? graphIssued : [3200000, 3450000, 3800000, 3600000, 3900000, 4200000, 4523456, 4380000, 4650000, 4523456],
                    redeemed: graphRedeemed.length > 0 ? graphRedeemed : [2800000, 2950000, 3100000, 3050000, 3200000, 3350000, 3210987, 3180000, 3320000, 3210987]
                }
            },
            transactions: formattedTransactions
        }
    } catch (error) {
        console.error("Error fetching finance data:", error);
        return {
            overview: {
                totalRevenue: 0,
                pointsIssued: 0,
                pointsRedeemed: 0,
                activePointsValue: 0,
                revenueTrend: { labels: [], data: [] },
                pointsFlow: { labels: [], issued: [], redeemed: [] }
            },
            transactions: []
        };
    }
}

export async function getComplianceDataAction(filters?: { status?: string, type?: string }) {
    try {
        const { status, type } = filters || {};

        let query = db.select({
            id: kycDocuments.id,
            userId: kycDocuments.userId,
            documentType: kycDocuments.documentType,
            status: kycDocuments.verificationStatus,
            rejectionReason: kycDocuments.rejectionReason,
            createdAt: kycDocuments.createdAt,
            userName: users.name,
            userType: userTypeEntity.typeName
        })
            .from(kycDocuments)
            .leftJoin(users, eq(kycDocuments.userId, users.id))
            .leftJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
            .$dynamic();

        const conditions = [];
        if (status && status !== 'All Status') {
            conditions.push(eq(kycDocuments.verificationStatus, status.toLowerCase()));
        }
        if (type && type !== 'All Stakeholders') {
            conditions.push(eq(userTypeEntity.typeName, type));
        }

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        const data = await query.orderBy(desc(kycDocuments.createdAt)).limit(50);

        return data.map(d => ({
            id: `KYC-${d.id.toString().padStart(4, '0')}`,
            member: d.userName || 'Unknown',
            type: d.userType || 'N/A',
            document: d.documentType,
            status: d.status.charAt(0).toUpperCase() + d.status.slice(1),
            date: d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '---',
            badgeColor: d.status === 'verified' ? 'badge-success' : (d.status === 'pending' ? 'badge-warning' : (d.status === 'rejected' ? 'badge-danger' : 'badge-warning'))
        }));
    } catch (error) {
        console.error("Error fetching compliance data:", error);
        return [];
    }
}

