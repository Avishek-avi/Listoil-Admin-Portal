'use server'

import { db } from '@/db';
import {
    userAmazonOrders,
    amazonOrderItems,
    users,
    retailers,
    mechanics,
    counterSales,
    userTypeEntity,
    amazonMarketplaceProducts,
    redemptions,
} from '@/db/schema';
import { desc, eq, and, sql, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import {
    ORDER_STATUS_TRANSITIONS,
    AMAZON_STATUS_TO_REDEMPTION,
} from '@/lib/order-status';

// ============================================================
// TYPES
// ============================================================

export interface AdminOrder {
    userAmzOrderId: number;
    orderId: string;
    userId: number;
    userName: string | null;
    userPhone: string;
    orderStatus: string | null;
    pointsDeducted: number;
    userPoints?: number; // Added field
    shippingDetails: any;
    trackingDetails: any;
    estimatedDelivery: string | null;
    deliveredAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    items: AdminOrderItem[];
}

export interface AdminOrderItem {
    orderItemId: number;
    productId: number;
    asinSku: string;
    productName: string;
    quantity: number;
    pointsPerItem: number;
    totalPoints: number;
    status: string | null;
    statusHistory: any[];
}

export interface PaginatedResult<T> {
    success: boolean;
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

// ... existing interfaces ...

export async function getAdminOrdersAction(params: {
    page?: number;
    limit?: number;
    status?: string;        // filter by status (e.g. "processing" or "!delivered" for pending only)
    fromDate?: string;
    toDate?: string;
    excludeStatus?: string; // e.g. "delivered" — returns records where status != excludeStatus
}): Promise<PaginatedResult<AdminOrder>> {
    try {
        const page = params.page || 1;
        const limit = params.limit || 20;
        const offset = (page - 1) * limit;

        const conditions: any[] = [];

        if (params.status) {
            conditions.push(eq(userAmazonOrders.orderStatus, params.status));
        }
        if (params.excludeStatus) {
            conditions.push(ne(userAmazonOrders.orderStatus, params.excludeStatus));
        }
        if (params.fromDate) {
            conditions.push(sql`${userAmazonOrders.createdAt} >= ${params.fromDate}::timestamp`);
        }
        if (params.toDate) {
            const toDatePlusOne = new Date(params.toDate);
            toDatePlusOne.setDate(toDatePlusOne.getDate() + 1);
            conditions.push(sql`${userAmazonOrders.createdAt} < ${toDatePlusOne.toISOString().split('T')[0]}::timestamp`);
        }

        const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

        const [ordersRaw, totalRaw] = await Promise.all([
            db
                .select({
                    userAmzOrderId: userAmazonOrders.userAmzOrderId,
                    orderId: userAmazonOrders.orderId,
                    userId: userAmazonOrders.userId,
                    userName: users.name,
                    userPhone: users.phone,
                    roleId: users.roleId,
                    orderStatus: userAmazonOrders.orderStatus,
                    pointsDeducted: userAmazonOrders.pointsDeducted,
                    shippingDetails: userAmazonOrders.shippingDetails,
                    trackingDetails: userAmazonOrders.trackingDetails,
                    estimatedDelivery: userAmazonOrders.estimatedDelivery,
                    deliveredAt: userAmazonOrders.deliveredAt,
                    createdAt: userAmazonOrders.createdAt,
                    updatedAt: userAmazonOrders.updatedAt,
                })
                .from(userAmazonOrders)
                .leftJoin(users, eq(userAmazonOrders.userId, users.id))
                .where(whereCondition)
                .orderBy(desc(userAmazonOrders.createdAt))
                .limit(limit)
                .offset(offset),
            db
                .select({ count: sql<number>`count(*)` })
                .from(userAmazonOrders)
                .leftJoin(users, eq(userAmazonOrders.userId, users.id))
                .where(whereCondition),
        ]);

        const totalCount = Number(totalRaw[0].count);

        // Fetch items and user points for each order
        const data: AdminOrder[] = await Promise.all(
            ordersRaw.map(async (o) => {
                const [items, [role]] = await Promise.all([
                    db.select().from(amazonOrderItems).where(eq(amazonOrderItems.orderId, o.userAmzOrderId)),
                    o.roleId ? db.select().from(userTypeEntity).where(eq(userTypeEntity.id, o.roleId)).limit(1) : [null]
                ]);

                let userPoints = 0;
                if (role?.typeName === 'Retailer') {
                    const [ret] = await db.select({ p: retailers.totalBalance }).from(retailers).where(eq(retailers.userId, o.userId)).limit(1);
                    userPoints = Number(ret?.p || 0);
                } else if (role?.typeName === 'Mechanic') {
                    const [mech] = await db.select({ p: mechanics.totalBalance }).from(mechanics).where(eq(mechanics.userId, o.userId)).limit(1);
                    userPoints = Number(mech?.p || 0);
                } else if (role?.typeName === 'CounterSales' || role?.typeName === 'Counter Staff') {
                    const [cs] = await db.select({ p: counterSales.totalBalance }).from(counterSales).where(eq(counterSales.userId, o.userId)).limit(1);
                    userPoints = Number(cs?.p || 0);
                }

                return {
                    ...o,
                    userPhone: o.userPhone ?? '',
                    userPoints,
                    items: items as AdminOrderItem[],
                };
            })
        );

        return {
            success: true,
            data,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
            },
        };
    } catch (error) {
        console.error('getAdminOrdersAction error:', error);
        return {
            success: false,
            data: [],
            pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
        };
    }
}

export async function updateAdminOrderStatusAction(
    orderId: string,
    orderStatus: string,
    options?: {
        notes?: string;
        carrier?: string;
        trackingNumber?: string;
        estimatedDelivery?: string;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        return await db.transaction(async (tx) => {
            // [1] FETCH CURRENT ORDER
            const [order] = await tx
                .select()
                .from(userAmazonOrders)
                .where(eq(userAmazonOrders.orderId, orderId))
                .limit(1);

            if (!order) return { success: false, error: 'Order not found' };

            // [2] VALIDATE STATUS TRANSITION
            const currentStatus = order.orderStatus || 'processing';
            const allowedTransitions = ORDER_STATUS_TRANSITIONS[currentStatus?.toLowerCase()] || [];

            if (!allowedTransitions.includes(orderStatus)) {
                return {
                    success: false,
                    error: `Invalid transition: ${currentStatus} → ${orderStatus}. Allowed: ${allowedTransitions.join(', ')}`,
                };
            }

            // [3] PREPARE UPDATE PAYLOAD
            const updatePayload: any = {
                orderStatus,
                updatedAt: new Date().toISOString(),
            };

            if (orderStatus === 'delivered') {
                updatePayload.deliveredAt = new Date().toISOString();
            }

            // Sync shipping/tracking details if provided
            if (options?.carrier || options?.trackingNumber || options?.estimatedDelivery) {
                const existingTracking = (order.trackingDetails as any) || {};
                updatePayload.trackingDetails = {
                    ...existingTracking,
                    ...(options.carrier && { carrier: options.carrier }),
                    ...(options.trackingNumber && { trackingNumber: options.trackingNumber }),
                    latestUpdate: new Date().toISOString(),
                };
                if (options.estimatedDelivery) {
                    updatePayload.estimatedDelivery = options.estimatedDelivery;
                }
            }

            // [4] EXECUTE ORDER STATUS UPDATE
            await tx
                .update(userAmazonOrders)
                .set(updatePayload)
                .where(eq(userAmazonOrders.orderId, orderId));

            const historyEntry = {
                status: orderStatus,
                date: new Date().toISOString(),
                notes: options?.notes || `Status updated to ${orderStatus}`,
                ...(options?.carrier && { carrier: options.carrier }),
                ...(options?.trackingNumber && { trackingNumber: options.trackingNumber }),
            };

            // Update all related items status history
            await tx
                .update(amazonOrderItems)
                .set({
                    status: orderStatus,
                    statusHistory: sql`COALESCE(status_history, '[]'::jsonb) || jsonb_build_array(${JSON.stringify(historyEntry)}::jsonb)`,
                })
                .where(eq(amazonOrderItems.orderId, order.userAmzOrderId));

            // [Sync WITH UNIFIED REDEMPTIONS TABLE]
            const targetStatusId = AMAZON_STATUS_TO_REDEMPTION[orderStatus.toLowerCase()];
            if (targetStatusId) {
                // Find IDs for redemptions sync
                const itemsToSync = await tx
                    .select({ id: amazonOrderItems.orderItemId })
                    .from(amazonOrderItems)
                    .where(eq(amazonOrderItems.orderId, order.userAmzOrderId));

                for (const itemToSync of itemsToSync) {
                    await tx.update(redemptions)
                        .set({ status: targetStatusId, updatedAt: new Date().toISOString() })
                        .where(and(
                            eq(redemptions.channelReferenceId, itemToSync.id),
                            eq(redemptions.channelId, 4)
                        ));
                }
            }

            /*
            // [5] CONDITIONAL BUSINESS LOGIC: CONFIRMED (Deduct Points)
            if (orderStatus === 'confirmed') {
                const wasAlreadyConfirmed = (order.orderStatus === 'confirmed');
                
                if (!wasAlreadyConfirmed && (order.pointsDeducted || 0) > 0) {
                    const points = Number(order.pointsDeducted);
                    const [user] = await tx.select().from(users).where(eq(users.id, order.userId)).limit(1);
                    
                    if (!user) return { success: false, error: 'User not found' };

                    const [role] = await tx.select().from(userTypeEntity).where(eq(userTypeEntity.id, user.roleId)).limit(1);
                    if (!role) return { success: false, error: 'User role not found' };

                    let currentPoints = 0;
                    if (role?.typeName === 'Retailer') {
                        const [retailer] = await tx.select({ points: retailers.totalBalance }).from(retailers).where(eq(retailers.userId, user.id)).limit(1);
                        currentPoints = Number(retailer?.points || 0);
                    } else if (role?.typeName === 'Mechanic') {
                        const [mechanic] = await tx.select({ points: mechanics.totalBalance }).from(mechanics).where(eq(mechanics.userId, user.id)).limit(1);
                        currentPoints = Number(mechanic?.points || 0);
                    } else if (role?.typeName === 'CounterSales' || role?.typeName === 'Counter Staff') {
                        const [cs] = await tx.select({ points: counterSales.totalBalance }).from(counterSales).where(eq(counterSales.userId, user.id)).limit(1);
                        currentPoints = Number(cs?.points || 0);
                    }

                    // VALIDATE POINTS
                    if (currentPoints < points) {
                        return { 
                            success: false, 
                            error: `Insufficient reward points. Current Balance: ${currentPoints}, Required: ${points}`
                        };
                    }

                    const updatePointsPayload = {
                        pointsBalance: sql`COALESCE(points_balance, 0) - ${points}`,
                        totalBalance: sql`COALESCE(total_balance, 0) - ${points}`,
                        totalRedeemed: sql`COALESCE(total_redeemed, 0) + ${points}`,
                    };

                    if (role?.typeName === 'Retailer') {
                        await tx.update(retailers).set(updatePointsPayload).where(eq(retailers.userId, user.id));
                    } else if (role?.typeName === 'Mechanic') {
                        await tx.update(mechanics).set(updatePointsPayload).where(eq(mechanics.userId, user.id));
                    } else if (role?.typeName === 'CounterSales' || role?.typeName === 'Counter Staff') {
                        await tx.update(counterSales).set(updatePointsPayload).where(eq(counterSales.userId, user.id));
                    }
                }
            }
            */

            // [6] CONDITIONAL BUSINESS LOGIC: CANCELLED (Restore Points & Inventory)
            if (orderStatus === 'cancelled') {
                const items = await tx.select().from(amazonOrderItems).where(eq(amazonOrderItems.orderId, order.userAmzOrderId));

                // Inventory Restore
                for (const item of items) {
                    const [product] = await tx.select().from(amazonMarketplaceProducts).where(eq(amazonMarketplaceProducts.amazonMarketplaceProductId, item.productId)).limit(1);
                    if (product) {
                        await tx.update(amazonMarketplaceProducts).set({
                            amazonInventoryCount: (product.amazonInventoryCount || 0) + item.quantity
                        }).where(eq(amazonMarketplaceProducts.amazonMarketplaceProductId, item.productId));
                    }
                }

                // Points Reversal (refund points when cancelled)
                if ((order.pointsDeducted || 0) > 0) {
                    const points = Number(order.pointsDeducted);
                    const [user] = await tx.select().from(users).where(eq(users.id, order.userId)).limit(1);

                    if (user) {
                        const [role] = await tx.select().from(userTypeEntity).where(eq(userTypeEntity.id, user.roleId)).limit(1);
                        const restorePayload = {
                            pointsBalance: sql`COALESCE(points_balance, 0) + ${points}`,
                            totalBalance: sql`COALESCE(total_balance, 0) + ${points}`,
                            totalRedeemed: sql`GREATEST(0, COALESCE(total_redeemed, 0) - ${points})`,
                            redeemablePoints: sql`COALESCE(redeemable_points, 0) + ${points}`,
                        };

                        if (role?.typeName === 'Retailer') {
                            await tx.update(retailers).set(restorePayload).where(eq(retailers.userId, user.id));
                        } else if (role?.typeName === 'Mechanic') {
                            await tx.update(mechanics).set(restorePayload).where(eq(mechanics.userId, user.id));
                        } else if (role?.typeName === 'CounterSales' || role?.typeName === 'Counter Staff') {
                            await tx.update(counterSales).set(restorePayload).where(eq(counterSales.userId, user.id));
                        }
                    }
                }
            }

            revalidatePath('/process');
            return { success: true };
        });
    } catch (error: any) {
        console.error('updateAdminOrderStatusAction error:', error);
        return { success: false, error: error.message || 'Workflow execution failed' };
    }
}


