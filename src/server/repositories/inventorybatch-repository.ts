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
}

export const inventoryBatchRepository = new InventoryBatchRepository();
