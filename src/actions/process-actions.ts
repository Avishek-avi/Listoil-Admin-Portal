'use server'

import { db } from "@/db"
import {
    retailerTransactionLogs,
    mechanicTransactionLogs,
    counterSalesTransactionLogs,
    redemptions,
    redemptionStatuses,
    users,
    earningTypes
} from "@/db/schema"
import { desc, eq, and, sql, or, ilike, inArray } from "drizzle-orm"
import {
    redemptionChannels, retailers, mechanics, counterSales,
    qrCodes, skuVariant, skuPointConfig, auditLogs, skuEntity,
    tblInventory, tblInventoryBatch, qrTypes, userTypeEntity, approvalStatuses,
    schemes, schemeTypes, pincodeMaster
} from "@/db/schema"
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

export interface TransactionRecord {
    id: number;
    userName: string;
    phone: string;
    userType: string;
    createdAt: string;
    transactionType: string;
    qrCode?: string;
    invoiceNo?: string;
    points: number;
    remarks?: string;
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
        const lowerNames = (scope.entityNames || []).map(n => n.toLowerCase());

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
            pendingRetailerConditions.push(inArray(sql`LOWER(${scope.type === 'State' ? retailers.state : retailers.city})`, lowerNames));
        }

        const pendingRetailer = await pendingRetailerQuery.where(and(...pendingRetailerConditions)).limit(20);

        const pendingMechanicConditions = [ilike(mechanicTransactionLogs.status, 'pending')];
        const pendingMechanicQuery = db.select({
            id: mechanicTransactionLogs.id,
            user: users.name,
            points: mechanicTransactionLogs.points,
            createdAt: mechanicTransactionLogs.createdAt,
            type: sql<string>`'Scan'`
        })
            .from(mechanicTransactionLogs)
            .leftJoin(users, eq(mechanicTransactionLogs.userId, users.id))
            .leftJoin(mechanics, eq(users.id, mechanics.userId))
            .$dynamic();

        if (scope.type !== 'Global') {
            pendingMechanicConditions.push(inArray(sql`LOWER(${scope.type === 'State' ? mechanics.state : mechanics.city})`, lowerNames));
        }

        const pendingMechanic = await pendingMechanicQuery.where(and(...pendingMechanicConditions)).limit(20);

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
            pendingCounterSalesConditions.push(inArray(sql`LOWER(${scope.type === 'State' ? counterSales.state : counterSales.city})`, lowerNames));
        }

        const pendingCounterSales = await pendingCounterSalesQuery.where(and(...pendingCounterSalesConditions)).limit(20);

        const scanRequests: ScanRequest[] = [...pendingRetailer, ...pendingMechanic, ...pendingCounterSales]
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
            .leftJoin(mechanics, eq(users.id, mechanics.userId))
            .leftJoin(counterSales, eq(users.id, counterSales.userId))
            .where(ilike(redemptionStatuses.name, 'pending'))
            .$dynamic();

        if (scope.type !== 'Global') {
            pendingRedemptionQuery.where(or(
                inArray(sql`LOWER(${retailers.state})`, lowerNames),
                inArray(sql`LOWER(${mechanics.state})`, lowerNames),
                inArray(sql`LOWER(${counterSales.state})`, lowerNames),
                inArray(sql`LOWER(${retailers.city})`, lowerNames),
                inArray(sql`LOWER(${mechanics.city})`, lowerNames),
                inArray(sql`LOWER(${counterSales.city})`, lowerNames)
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
                conditions.push(inArray(sql`LOWER(${scope.type === 'State' ? userTable.state : userTable.city})`, lowerNames));
            }
            return q.where(and(...conditions));
        };

        const [retailerPendingCount] = await getScopedCount(retailerTransactionLogs, ilike(retailerTransactionLogs.status, 'pending'), retailers);
        const [mechanicPendingCount] = await getScopedCount(mechanicTransactionLogs, ilike(mechanicTransactionLogs.status, 'pending'), mechanics);
        const [csPendingCount] = await getScopedCount(counterSalesTransactionLogs, ilike(counterSalesTransactionLogs.status, 'pending'), counterSales);

        let redemptionPendingQuery = db.select({ count: sql<number>`count(*)` }).from(redemptions).leftJoin(redemptionStatuses, eq(redemptions.status, redemptionStatuses.id)).where(ilike(redemptionStatuses.name, 'pending')).$dynamic();
        if (scope.type !== 'Global') {
            redemptionPendingQuery.leftJoin(retailers, eq(redemptions.userId, retailers.userId))
                .leftJoin(mechanics, eq(redemptions.userId, mechanics.userId))
                .leftJoin(counterSales, eq(redemptions.userId, counterSales.userId))
                .where(or(
                    inArray(sql`LOWER(${retailers.state})`, lowerNames),
                    inArray(sql`LOWER(${mechanics.state})`, lowerNames),
                    inArray(sql`LOWER(${counterSales.state})`, lowerNames),
                    inArray(sql`LOWER(${retailers.city})`, lowerNames),
                    inArray(sql`LOWER(${mechanics.city})`, lowerNames),
                    inArray(sql`LOWER(${counterSales.city})`, lowerNames)
                ));
        }
        const [redemptionPendingCount] = await redemptionPendingQuery;

        // Today's stats for Scan
        const [retailerApprovedToday] = await getScopedCount(retailerTransactionLogs, and(ilike(retailerTransactionLogs.status, 'approved'), sql`${retailerTransactionLogs.createdAt} >= ${todayStr}`), retailers);
        const [mechanicApprovedToday] = await getScopedCount(mechanicTransactionLogs, and(ilike(mechanicTransactionLogs.status, 'approved'), sql`${mechanicTransactionLogs.createdAt} >= ${todayStr}`), mechanics);
        const [csApprovedToday] = await getScopedCount(counterSalesTransactionLogs, and(ilike(counterSalesTransactionLogs.status, 'approved'), sql`${counterSalesTransactionLogs.createdAt} >= ${todayStr}`), counterSales);

        const [retailerRejectedToday] = await getScopedCount(retailerTransactionLogs, and(ilike(retailerTransactionLogs.status, 'rejected'), sql`${retailerTransactionLogs.createdAt} >= ${todayStr}`), retailers);
        const [mechanicRejectedToday] = await getScopedCount(mechanicTransactionLogs, and(ilike(mechanicTransactionLogs.status, 'rejected'), sql`${mechanicTransactionLogs.createdAt} >= ${todayStr}`), mechanics);
        const [csRejectedToday] = await getScopedCount(counterSalesTransactionLogs, and(ilike(counterSalesTransactionLogs.status, 'rejected'), sql`${counterSalesTransactionLogs.createdAt} >= ${todayStr}`), counterSales);

        // Total Processed (All time approved)
        const [retailerTotal] = await getScopedCount(retailerTransactionLogs, ilike(retailerTransactionLogs.status, 'approved'), retailers);
        const [mechanicTotal] = await getScopedCount(mechanicTransactionLogs, ilike(mechanicTransactionLogs.status, 'approved'), mechanics);
        const [csTotal] = await getScopedCount(counterSalesTransactionLogs, ilike(counterSalesTransactionLogs.status, 'approved'), counterSales);

        const scanStats: ProcessStats = {
            pendingRequests: Number(retailerPendingCount?.[0]?.count || 0) + Number(mechanicPendingCount?.[0]?.count || 0) + Number(csPendingCount?.[0]?.count || 0),
            pendingRequestsToday: '+0',
            approvedToday: Number(retailerApprovedToday?.[0]?.count || 0) + Number(mechanicApprovedToday?.[0]?.count || 0) + Number(csApprovedToday?.[0]?.count || 0),
            approvedTodayTrend: '+0%',
            rejectedToday: Number(retailerRejectedToday?.[0]?.count || 0) + Number(mechanicRejectedToday?.[0]?.count || 0) + Number(csRejectedToday?.[0]?.count || 0),
            rejectedTodayTrend: '0',
            totalProcessed: (Number(retailerTotal?.[0]?.count || 0) + Number(mechanicTotal?.[0]?.count || 0) + Number(csTotal?.[0]?.count || 0)).toLocaleString(),
            totalProcessedTrend: '+0'
        };

        let redemptionApprovedTodayQuery = db.select({ count: sql<number>`count(*)` }).from(redemptions).leftJoin(redemptionStatuses, eq(redemptions.status, redemptionStatuses.id)).where(and(ilike(redemptionStatuses.name, 'approved'), sql`${redemptions.createdAt} >= ${todayStr}`)).$dynamic();
        let redemptionRejectedTodayQuery = db.select({ count: sql<number>`count(*)` }).from(redemptions).leftJoin(redemptionStatuses, eq(redemptions.status, redemptionStatuses.id)).where(and(ilike(redemptionStatuses.name, 'rejected'), sql`${redemptions.createdAt} >= ${todayStr}`)).$dynamic();
        let redemptionTotalValueTodayQuery = db.select({ sum: sql<number>`sum(${redemptions.pointsRedeemed})` }).from(redemptions).where(and(sql`${redemptions.createdAt} >= ${todayStr}`)).$dynamic();

        if (scope.type !== 'Global') {
            const scopeFilter = or(
                inArray(sql`LOWER(${retailers.state})`, lowerNames),
                inArray(sql`LOWER(${mechanics.state})`, lowerNames),
                inArray(sql`LOWER(${counterSales.state})`, lowerNames),
                inArray(sql`LOWER(${retailers.city})`, lowerNames),
                inArray(sql`LOWER(${mechanics.city})`, lowerNames),
                inArray(sql`LOWER(${counterSales.city})`, lowerNames)
            );
            [redemptionApprovedTodayQuery, redemptionRejectedTodayQuery, redemptionTotalValueTodayQuery].forEach(q => {
                q.leftJoin(retailers, eq(redemptions.userId, retailers.userId))
                 .leftJoin(mechanics, eq(redemptions.userId, mechanics.userId))
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

export async function getAllTransactionsAction(): Promise<TransactionRecord[]> {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");
        const scope = await getUserScope(Number(session.user.id));
        const lowerNames = (scope.entityNames || []).map(n => n.toLowerCase());

        // 1. Mechanic Transactions
        const mechQuery = db.select({
            id: mechanicTransactionLogs.id,
            userName: users.name,
            phone: users.phone,
            userType: sql<string>`'Mechanic'`,
            createdAt: mechanicTransactionLogs.createdAt,
            transactionType: sql<string>`'Scan'`,
            qrCode: mechanicTransactionLogs.qrCode,
            points: mechanicTransactionLogs.points,
            category: mechanicTransactionLogs.category,
            remarks: mechanicTransactionLogs.remarks,
            metadata: mechanicTransactionLogs.metadata
        })
        .from(mechanicTransactionLogs)
        .leftJoin(users, eq(mechanicTransactionLogs.userId, users.id))
        .leftJoin(mechanics, eq(users.id, mechanics.userId))
        .$dynamic();

        // 2. Retailer Transactions
        const retQuery = db.select({
            id: retailerTransactionLogs.id,
            userName: users.name,
            phone: users.phone,
            userType: sql<string>`'Retailer'`,
            createdAt: retailerTransactionLogs.createdAt,
            transactionType: sql<string>`'Invoice'`,
            qrCode: retailerTransactionLogs.qrCode,
            points: retailerTransactionLogs.points,
            category: retailerTransactionLogs.category,
            remarks: retailerTransactionLogs.remarks,
            metadata: retailerTransactionLogs.metadata
        })
        .from(retailerTransactionLogs)
        .leftJoin(users, eq(retailerTransactionLogs.userId, users.id))
        .leftJoin(retailers, eq(users.id, retailers.userId))
        .$dynamic();

        // 3. Counter Sales Transactions
        const csQuery = db.select({
            id: counterSalesTransactionLogs.id,
            userName: users.name,
            phone: users.phone,
            userType: sql<string>`'Counter Staff'`,
            createdAt: counterSalesTransactionLogs.createdAt,
            transactionType: sql<string>`'Transaction'`,
            qrCode: counterSalesTransactionLogs.qrCode,
            points: counterSalesTransactionLogs.points,
            category: counterSalesTransactionLogs.category,
            remarks: counterSalesTransactionLogs.remarks,
            metadata: counterSalesTransactionLogs.metadata
        })
        .from(counterSalesTransactionLogs)
        .leftJoin(users, eq(counterSalesTransactionLogs.userId, users.id))
        .leftJoin(counterSales, eq(users.id, counterSales.userId))
        .$dynamic();

        if (scope.type !== 'Global') {
            const scopeFilter = (table: any) => inArray(sql`LOWER(${scope.type === 'State' ? table.state : table.city})`, lowerNames);
            
            mechQuery.where(scopeFilter(mechanics));
            retQuery.where(scopeFilter(retailers));
            csQuery.where(scopeFilter(counterSales));
        }

        const [mechData, retData, csData] = await Promise.all([
            mechQuery.limit(500).orderBy(desc(mechanicTransactionLogs.createdAt)),
            retQuery.limit(500).orderBy(desc(retailerTransactionLogs.createdAt)),
            csQuery.limit(500).orderBy(desc(counterSalesTransactionLogs.createdAt))
        ]);

        const allTransactions: TransactionRecord[] = [...mechData, ...retData, ...csData]
            .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
            .map(t => {
                const metadata = t.metadata as any;
                return {
                    id: t.id,
                    userName: t.userName || 'Unknown',
                    phone: t.phone || 'N/A',
                    userType: t.userType,
                    createdAt: t.createdAt || '',
                    transactionType: (t as any).category === 'SCHEME_BOOSTER' ? 'Booster' : t.transactionType,
                    qrCode: t.qrCode || metadata?.qrCode || metadata?.scannedCode,
                    invoiceNo: metadata?.invoiceNumber || metadata?.invoiceNo || metadata?.billNumber,
                    points: Number(t.points),
                    remarks: (t as any).remarks
                };
            });

        return allTransactions;
    } catch (error) {
        console.error("Error in getAllTransactionsAction:", error);
        return [];
    }
}

export async function getMechanicsForManualEntryAction() {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");

        const activeMechanics = await db.select({
            id: users.id,
            name: users.name,
            phone: users.phone,
            uniqueId: mechanics.uniqueId,
            status: approvalStatuses.name
        })
        .from(users)
        .innerJoin(mechanics, eq(users.id, mechanics.userId))
        .leftJoin(approvalStatuses, eq(users.approvalStatusId, approvalStatuses.id))
        .where(and(
            eq(users.roleId, 3), // Mechanic Role
            eq(users.isSuspended, false),
            or(
                ilike(approvalStatuses.name, '%approved%'),
                ilike(approvalStatuses.name, '%active%')
            )
        ))
        .orderBy(users.name);

        return activeMechanics;
    } catch (error) {
        console.error("Error in getMechanicsForManualEntryAction:", error);
        return [];
    }
}

export async function getQrCodeDetailsAction(serialNumber: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");

        // 1. Check in qrCodes table (Production QRs)
        let qrData: { 
            id: number; 
            code: string; 
            sku: string; 
            isScanned: boolean | null; 
            isActive: boolean;
            source: 'qrCodes' | 'inventory' 
        } | null = null;

        const [qr] = await db.select({
            id: qrCodes.id,
            code: qrCodes.code,
            sku: qrCodes.sku,
            isScanned: qrCodes.isScanned,
            isActive: qrTypes.isActive
        })
        .from(qrCodes)
        .leftJoin(qrTypes, eq(qrCodes.typeId, qrTypes.id))
        .where(eq(qrCodes.code, serialNumber))
        .limit(1);

        if (qr) {
            qrData = { ...qr, isActive: qr.isActive ?? true, source: 'qrCodes' };
        } else {
            // 2. Check in tblInventory (Synced QRs)
            const [inv] = await db.select({
                id: tblInventory.inventoryId,
                code: tblInventory.serialNumber,
                sku: tblInventoryBatch.skuCode,
                isScanned: tblInventory.isQrScanned,
                isActive: tblInventory.isActive,
                batchActive: tblInventoryBatch.isActive
            })
            .from(tblInventory)
            .innerJoin(tblInventoryBatch, eq(tblInventory.batchId, tblInventoryBatch.batchId))
            .where(eq(tblInventory.serialNumber, serialNumber))
            .limit(1);

            if (inv) {
                qrData = { 
                    ...inv, 
                    isActive: (inv.isActive && inv.batchActive), 
                    source: 'inventory' 
                };
            }
        }

        if (!qrData) return { error: "Serial number not found in system (checked Production & Synced Inventory)." };
        if (!qrData.isActive) return { error: "This QR code or its batch is currently inactive." };
        if (qrData.isScanned) return { error: "This QR code has already been scanned." };

        // 3. Find the variant for this SKU code
        const [variantInfo] = await db.select({
            variantId: skuVariant.id,
            variantName: skuVariant.variantName,
            entityName: skuEntity.name,
        })
        .from(skuEntity)
        .innerJoin(skuVariant, eq(skuVariant.skuEntityId, skuEntity.id))
        .where(ilike(skuEntity.name, qrData.sku))
        .limit(1);

        if (!variantInfo) return { 
            qr: qrData,
            points: 0,
            variantName: qrData.sku,
            message: `Product code "${qrData.sku}" not found in SKU Master. Please add this SKU in Masters > SKU Configuration.`
        };

        // 4. Find points for this variant for Mechanic user type
        const [pointInfo] = await db.select({
            points: skuPointConfig.pointsPerUnit,
        })
        .from(skuPointConfig)
        .innerJoin(userTypeEntity, eq(skuPointConfig.userTypeId, userTypeEntity.id))
        .where(and(
            eq(skuPointConfig.skuVariantId, variantInfo.variantId),
            ilike(userTypeEntity.typeName, '%Mechanic%')
        ))
        .limit(1);

        if (!pointInfo) return { 
            qr: qrData,
            points: 0,
            variantName: variantInfo.variantName,
            message: `SKU "${variantInfo.variantName}" (${qrData.sku}) found but no points configured for Mechanics. Please configure points in Masters > Point Configuration.`
        };

        return {
            qr: qrData,
            points: Number(pointInfo.points),
            variantName: variantInfo.variantName
        };
    } catch (error) {
        console.error("Error in getQrCodeDetailsAction:", error);
        return { error: "Failed to fetch QR details." };
    }
}

export async function submitManualScanAdjustmentAction(data: {
    userId: number;
    serialNumber: string;
    points: number;
    reason: string;
}) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");

        // Add Admin role gate
        const isAdmin = session.user.permissions?.includes('all') || session.user.role?.toLowerCase().includes('admin');
        if (!isAdmin) {
            throw new Error("Only administrators can perform manual point adjustments.");
        }

        return await db.transaction(async (tx) => {
            // 0. Verify user is active and approved
            const [targetUser] = await tx.select({
                isSuspended: users.isSuspended,
                statusName: approvalStatuses.name
            })
            .from(users)
            .leftJoin(approvalStatuses, eq(users.approvalStatusId, approvalStatuses.id))
            .where(eq(users.id, data.userId))
            .limit(1);

            if (!targetUser) throw new Error("User not found.");
            if (targetUser.isSuspended) throw new Error("This user is currently suspended. Points cannot be credited to suspended users.");
            const statusLower = (targetUser.statusName || '').toLowerCase();
            if (!statusLower.includes('approved') && !statusLower.includes('active')) {
                throw new Error(`This user's status is "${targetUser.statusName || 'Unknown'}". Only users with Active/Approved status can receive points.`);
            }

            // 1. Double check QR status in both tables
            let qrSource: 'qrCodes' | 'inventory' | null = null;
            let sku: string = '';

            const [qr] = await tx.select({
                id: qrCodes.id,
                code: qrCodes.code,
                sku: qrCodes.sku,
                isScanned: qrCodes.isScanned,
                isActive: qrTypes.isActive
            })
            .from(qrCodes)
            .leftJoin(qrTypes, eq(qrCodes.typeId, qrTypes.id))
            .where(eq(qrCodes.code, data.serialNumber))
            .limit(1);

            if (qr) {
                if (qr.isScanned) throw new Error("QR already scanned (Production).");
                if (qr.isActive === false) throw new Error("This QR type is currently inactive.");
                qrSource = 'qrCodes';
                sku = qr.sku;
            } else {
                const [inv] = await tx.select({
                    isScanned: tblInventory.isQrScanned,
                    isActive: tblInventory.isActive,
                    batchActive: tblInventoryBatch.isActive,
                    sku: tblInventoryBatch.skuCode
                })
                .from(tblInventory)
                .innerJoin(tblInventoryBatch, eq(tblInventory.batchId, tblInventoryBatch.batchId))
                .where(eq(tblInventory.serialNumber, data.serialNumber))
                .limit(1);
                
                if (inv) {
                    if (inv.isScanned) throw new Error("QR already scanned (Inventory).");
                    if (!inv.isActive || !inv.batchActive) throw new Error("This QR code or its batch is currently inactive.");
                    qrSource = 'inventory';
                    sku = inv.sku;
                }
            }

            if (!qrSource) throw new Error("Invalid serial number.");

            // 2. Check user
            const [user] = await tx.select()
                .from(users)
                .where(and(eq(users.id, data.userId), eq(users.roleId, 3)))
                .limit(1);
            
            if (!user) throw new Error("Invalid mechanic selected.");
            if (user.isSuspended) throw new Error("Mechanic is suspended.");

            // 3. Create Transaction Entry (mechanicTransactionLogs)
            const [newLog] = await tx.insert(mechanicTransactionLogs).values({
                userId: data.userId,
                earningType: 9, // QR Scan
                points: data.points.toString(),
                category: 'QR_SCAN',
                status: 'approved',
                qrCode: data.serialNumber,
                sku: sku,
                remarks: `Manual Adjustment: ${data.reason}`,
                metadata: {
                    adminId: session.user.id,
                    adminName: session.user.name,
                    manualEntry: true,
                    reason: data.reason,
                    source: qrSource,
                    scannedAt: new Date().toISOString()
                }
            }).returning();

            // 4. Update status in correct table
            if (qrSource === 'qrCodes') {
                await tx.update(qrCodes)
                    .set({
                        isScanned: true,
                        scannedBy: data.userId
                    })
                    .where(eq(qrCodes.code, data.serialNumber));
            } else {
                await tx.update(tblInventory)
                    .set({
                        isQrScanned: true
                    })
                    .where(eq(tblInventory.serialNumber, data.serialNumber));
            }

            // 5. Update Mechanic Balance
            const [mechanic] = await tx.select().from(mechanics).where(eq(mechanics.userId, data.userId)).limit(1);
            if (mechanic) {
                const currentBalance = Number(mechanic.pointsBalance || 0);
                const currentEarnings = Number(mechanic.totalEarnings || 0);
                const currentRedeemable = Number(mechanic.redeemablePoints || 0);

                await tx.update(mechanics)
                    .set({
                        pointsBalance: (currentBalance + data.points).toString(),
                        totalEarnings: (currentEarnings + data.points).toString(),
                        redeemablePoints: (currentRedeemable + data.points).toString()
                    })
                    .where(eq(mechanics.userId, data.userId));
            }

            // 6. Log Admin Action (Audit Log)
            await tx.insert(auditLogs).values({
                tableName: 'mechanics',
                recordId: data.userId,
                operation: 'UPDATE',
                action: 'MANUAL_POINTS_ENTRY',
                changedBy: Number(session.user.id),
                newState: {
                    points: data.points,
                    serialNumber: data.serialNumber,
                    reason: data.reason,
                    description: `Admin ${session.user.name} added ${data.points} points to mechanic ${user.name} for QR ${data.serialNumber}.`
                }
            });

            // --- BOOSTER SCHEME LOGIC ---
            try {
                const now = new Date().toISOString();

                // 1. Get user location and role
                const [userMeta] = await tx.select({
                    roleId: users.roleId,
                    state: mechanics.state,
                    city: mechanics.city,
                    pincode: mechanics.pincode
                })
                .from(users)
                .leftJoin(mechanics, eq(users.id, mechanics.userId))
                .where(eq(users.id, data.userId))
                .limit(1);

                let userZone = '';
                if (userMeta?.pincode) {
                    const [pin] = await tx.select({ zone: pincodeMaster.zone }).from(pincodeMaster).where(eq(pincodeMaster.pincode, userMeta.pincode)).limit(1);
                    userZone = pin?.zone || '';
                }

                // 2. Get SKU hierarchy for the scanned SKU
                const [entityInfo] = await tx.select({
                    id: skuEntity.id,
                    parentId: skuEntity.parentEntityId,
                    levelId: skuEntity.levelId
                })
                .from(skuEntity)
                .where(ilike(skuEntity.name, sku))
                .limit(1);

                if (entityInfo) {
                    // Fetch hierarchy up to 2 levels to catch Category and SubCategory
                    let parentInfo = null;
                    if (entityInfo.parentId) {
                        [parentInfo] = await tx.select({
                            id: skuEntity.id,
                            parentId: skuEntity.parentEntityId,
                            levelId: skuEntity.levelId
                        }).from(skuEntity).where(eq(skuEntity.id, entityInfo.parentId)).limit(1);
                    }
                    
                    let grandParentInfo = null;
                    if (parentInfo?.parentId) {
                        [grandParentInfo] = await tx.select({
                            id: skuEntity.id,
                            levelId: skuEntity.levelId
                        }).from(skuEntity).where(eq(skuEntity.id, parentInfo.parentId)).limit(1);
                    }

                    // Map level IDs (from master data): Category=11, Sub-Category=12
                    const categoryId = [entityInfo, parentInfo, grandParentInfo].find(e => e?.levelId === 11)?.id;
                    const subCategoryId = [entityInfo, parentInfo, grandParentInfo].find(e => e?.levelId === 12)?.id;
                    const skuVariantIdRes = await tx.select({id: skuVariant.id}).from(skuVariant).where(eq(skuVariant.skuEntityId, entityInfo.id)).limit(1);
                    const skuVariantId = skuVariantIdRes[0]?.id;

                    // 3. Find Active Booster Schemes
                    const activeBoosterSchemes = await tx.select({
                        id: schemes.id,
                        name: schemes.name,
                        config: schemes.config
                    })
                    .from(schemes)
                    .innerJoin(schemeTypes, eq(schemes.schemeType, schemeTypes.id))
                    .where(and(
                        ilike(schemeTypes.name, 'Booster'),
                        eq(schemes.isActive, true),
                        sql`${schemes.startDate} <= ${now}`,
                        sql`${schemes.endDate} >= ${now}`
                    ));

                    for (const scheme of activeBoosterSchemes) {
                        const config = (scheme.config as any)?.booster;
                        if (!config) continue;

                        // Eligibility Check
                        // a) Audience
                        if (config.audienceIds && config.audienceIds.length > 0 && !config.audienceIds.includes(userMeta.roleId)) continue;

                        // b) Geography
                        const geo = config.geoScope;
                        if (geo) {
                            const zoneMatch = !geo.zones?.length || (userZone && geo.zones.includes(userZone));
                            const stateMatch = !geo.states?.length || (userMeta.state && geo.states.includes(userMeta.state));
                            const cityMatch = !geo.cities?.length || (userMeta.city && geo.cities.includes(userMeta.city));
                            if (!zoneMatch || !stateMatch || !cityMatch) continue;
                        }

                        // c) Product Target
                        let targetMatch = false;
                        if (config.targetType === 'Category' && categoryId && config.targetIds.includes(categoryId)) targetMatch = true;
                        else if (config.targetType === 'SubCategory' && subCategoryId && config.targetIds.includes(subCategoryId)) targetMatch = true;
                        else if (config.targetType === 'SKU' && skuVariantId && config.targetIds.includes(skuVariantId)) targetMatch = true;

                        if (!targetMatch) continue;

                        // 4. Calculate Points
                        let boosterPoints = 0;
                        if (config.rewardType === 'Fixed') {
                            boosterPoints = Number(config.rewardValue);
                        } else if (config.rewardType === 'Percentage') {
                            boosterPoints = Math.round((Number(config.rewardValue) / 100) * data.points);
                        }

                        if (boosterPoints > 0) {
                            // 5. Insert Booster Transaction
                            await tx.insert(mechanicTransactionLogs).values({
                                userId: data.userId,
                                earningType: 9, // QR Scan
                                points: boosterPoints.toString(),
                                category: 'SCHEME_BOOSTER',
                                status: 'approved',
                                qrCode: data.serialNumber,
                                sku: sku,
                                schemeId: scheme.id,
                                remarks: `Booster Reward: ${scheme.name} (${config.rewardValue}${config.rewardType === 'Percentage' ? '%' : ' Pts'})`,
                                metadata: {
                                    baseTransactionId: newLog.id,
                                    schemeName: scheme.name,
                                    rewardType: config.rewardType,
                                    rewardValue: config.rewardValue,
                                    manualEntry: true,
                                    processedAt: new Date().toISOString()
                                }
                            });

                            // 6. Update Balance again
                            const [m] = await tx.select().from(mechanics).where(eq(mechanics.userId, data.userId)).limit(1);
                            if (m) {
                                await tx.update(mechanics)
                                    .set({
                                        pointsBalance: (Number(m.pointsBalance) + boosterPoints).toString(),
                                        totalEarnings: (Number(m.totalEarnings) + boosterPoints).toString(),
                                        redeemablePoints: (Number(m.redeemablePoints) + boosterPoints).toString()
                                    })
                                    .where(eq(mechanics.userId, data.userId));
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Error processing booster schemes during manual entry:", err);
            }

            return { success: true };
        });
    } catch (error: any) {
        console.error("Error in submitManualScanAdjustmentAction:", error);
        return { success: false, error: error.message || "Failed to submit manual entry." };
    }
}
