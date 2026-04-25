'use server';

import { skuService } from "@/server/services/sku.service";

export async function fetchSkus() {
    try {
        const skus = await skuService.getAllSkus();
        // Convert to plain objects if necessary, though Drizzle returns plain objects usually.
        // Server actions must return serializable data.
        return skus;
    } catch (error) {
        console.error("Failed to fetch SKUs:", error);
        return [];
    }
}
