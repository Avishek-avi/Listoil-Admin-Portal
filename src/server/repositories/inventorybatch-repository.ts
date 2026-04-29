import { db } from "@/db/index";
import { tblInventoryBatch as inventoryBatch, tblInventory as inventory } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { CustomError } from "../../types";

class InventoryBatchRepository {
    customError: CustomError;

    constructor() {
        this.customError = new CustomError({
            responseCode: 400,
            responseMessage: "",
        });
    }

    async fetchAllInventoryBatches(page: number, limit: number, filters?: { searchTerm?: string, status?: string }): Promise<{ batches: any[], total: number }> {
        try {
            const offset = (page) * limit;
            const { searchTerm, status } = filters || {};

            return await db.transaction(async (tx) => {
                let countQuery = tx.select({ count: sql<number>`count(*)` }).from(inventoryBatch).$dynamic();
                let selectQuery = tx.select().from(inventoryBatch).$dynamic();

                const conditions = [];
                if (searchTerm) {
                    conditions.push(sql`${inventoryBatch.skuCode} ILIKE ${'%' + searchTerm + '%'}`);
                }
                if (status) {
                    conditions.push(eq(inventoryBatch.isActive, status === 'Active'));
                }

                if (conditions.length > 0) {
                    const whereClause = sql.join(conditions, sql` AND `);
                    countQuery = countQuery.where(sql`${whereClause}`);
                    selectQuery = selectQuery.where(sql`${whereClause}`);
                }

                const totalResult = await countQuery;
                const total = Number(totalResult[0]?.count || 0);

                const batches = await selectQuery
                    .orderBy(desc(inventoryBatch.createdAt))
                    .limit(limit)
                    .offset(offset);

                return { batches, total };
            });
        } catch (error: any) {
            this.customError.responseMessage = error.message || "Failed to fetch Inventory Batch list.";
            throw this.customError;
        }
    }

    async fetchInventoryBatchById(batchId: number): Promise<any> {
        try {
            const result = await db
                .select()
                .from(inventoryBatch)
                .where(eq(inventoryBatch.batchId, batchId))
                .limit(1);

            return result.length > 0 ? result[0] : null;
        } catch (error: any) {
            this.customError.responseMessage = error.message || "Failed to fetch Inventory Batch.";
            throw this.customError;
        }
    }

    async updateBatchStatus(batchId: number, isActive: boolean): Promise<any> {
        try {
            return await db.transaction(async (tx) => {
                // Update batch status
                await tx
                    .update(inventoryBatch)
                    .set({ isActive: isActive })
                    .where(eq(inventoryBatch.batchId, batchId));

                // Update inventory items status for this batch
                await tx
                    .update(inventory)
                    .set({ isActive: isActive })
                    .where(eq(inventory.batchId, batchId));
            });
        } catch (error: any) {
            this.customError.responseMessage = error.message || "Failed to update Inventory Batch status.";
            throw this.customError;
        }
    }
    async createBatchWithItems(batchData: { skuCode: string, quantity: number, type: 'inner' | 'outer', createdBy?: number }, items: { serialNumber: string, isActive: boolean }[]): Promise<number> {
        try {
            return await db.transaction(async (tx) => {
                const [batch] = await tx.insert(inventoryBatch).values({
                    skuCode: batchData.skuCode,
                    quantity: batchData.quantity,
                    type: batchData.type,
                    isActive: true,
                    createdBy: batchData.createdBy,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }).returning({ id: inventoryBatch.batchId });

                if (items.length > 0) {
                    // Chunk inserts if too many items
                    const chunkSize = 1000;
                    for (let i = 0; i < items.length; i += chunkSize) {
                        const chunk = items.slice(i, i + chunkSize);
                        await tx.insert(inventory).values(chunk.map(item => ({
                            serialNumber: item.serialNumber,
                            batchId: batch.id,
                            isActive: item.isActive,
                            isQrScanned: false
                        })));
                    }
                }

                return batch.id;
            });
        } catch (error: any) {
            console.error("Error creating batch with items:", error);
            this.customError.responseMessage = error.message || "Failed to create Inventory Batch.";
            throw this.customError;
        }
    }

    async fetchInventoryItemsByBatch(batchId: number, page: number = 0, limit: number = 100): Promise<{ items: any[], total: number }> {
        try {
            const offset = page * limit;
            const items = await db.select()
                .from(inventory)
                .where(eq(inventory.batchId, batchId))
                .limit(limit)
                .offset(offset);
            
            const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(inventory).where(eq(inventory.batchId, batchId));
            const total = Number(totalResult?.count || 0);

            return { items, total };
        } catch (error: any) {
            console.error("Error fetching inventory items:", error);
            throw error;
        }
    }
}

export const inventoryBatchRepository = new InventoryBatchRepository();

