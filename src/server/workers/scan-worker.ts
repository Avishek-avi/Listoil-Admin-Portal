
import { subscribe, EVENT_KEYS } from "@/server/rabbitMq/broker";
import { db } from "@/db";
import { 
    mechanicTransactionLogs, 
    mechanics, 
    skuPointConfig, 
    userTypeEntity,
    tblInventory,
    tblInventoryBatch,
    skuVariant
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { processBoosterSchemes } from "@/lib/schemes/booster-engine";

/**
 * Background worker to process scans asynchronously.
 * This ensures the system remains responsive even under heavy load.
 */
export async function initScanWorker() {
    console.log("[ScanWorker] Initializing background scan processor...");

    subscribe(EVENT_KEYS.EARNING_SCAN, async (payload: any) => {
        const { userId, serialNumber, sku, points: manualPoints, baseTransactionId } = payload;
        
        console.log(`[ScanWorker] Processing scan: ${serialNumber} for user ${userId}`);

        try {
            await db.transaction(async (tx) => {
                // 1. Calculate Base Points if not provided
                let basePoints = Number(manualPoints || 0);
                
                if (basePoints === 0) {
                    // Try to fetch from SKU Point Config
                    const [variant] = await tx.select({ id: skuVariant.id })
                        .from(skuVariant)
                        .where(eq(skuVariant.skuCode, sku)) // Assuming SKU is code here
                        .limit(1);
                    
                    if (variant) {
                        const [config] = await tx.select({ points: skuPointConfig.pointsPerUnit })
                            .from(skuPointConfig)
                            .where(and(
                                eq(skuPointConfig.skuVariantId, variant.id),
                                eq(skuPointConfig.userTypeId, 3) // Mechanic
                            ))
                            .limit(1);
                        basePoints = Number(config?.points || 0);
                    }
                }

                // 2. Process Booster Schemes
                await processBoosterSchemes(tx, {
                    userId,
                    points: basePoints,
                    serialNumber,
                    sku,
                    baseTransactionId
                });

                // 3. Mark the base transaction as processed if it exists
                if (baseTransactionId) {
                    await tx.update(mechanicTransactionLogs)
                        .set({ status: 'approved' })
                        .where(eq(mechanicTransactionLogs.id, baseTransactionId));
                }
            });
            console.log(`[ScanWorker] Successfully processed scan: ${serialNumber}`);
        } catch (error) {
            console.error(`[ScanWorker] Failed to process scan ${serialNumber}:`, error);
            // Handle retries or DLQ (Dead Letter Queue) logic here
        }
    });
}
