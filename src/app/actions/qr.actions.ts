'use server';

import { qrService } from "@/server/services/qr.service";
import { GenerateQrPayload } from "@/lib/types";
import { db } from "@/db";

import { fileMiddleware } from "@/server/middlewares/file-middleware";
import { BUS_EVENTS, emitEvent } from "@/server/rabbitMq/broker";
import { auth } from "@/lib/auth";
import { tblInventory as inventory } from "@/db/schema";
import { inArray } from "drizzle-orm";



export async function generateQrCodeAction(data: {
    quantity: number;
    skuCode: string;
    type: 'inner' | 'outer';
}) {
    try {
        const result = await qrService.generateQr(data as GenerateQrPayload);
        return result;
    } catch (error: any) {
        console.error("Failed to generate QR:", error);
        return { success: false, message: error.message || "Failed to generate QR" };
    }
}

export async function fetchQrHistory(page: number = 0, limit: number = 10, filters?: { searchTerm?: string, status?: string }) {
    try {
        const result = await qrService.getQrHistory(page, limit, filters);
        return result;
    } catch (error: any) {
        console.error("Failed to fetch QR history:", error);
        return { success: false, message: error.message || "Failed to fetch QR history", data: [], total: 0 };
    }
}

export async function fetchQrFileAction(batchId: number) {
    try {
        const result = await qrService.fetchQrFile(batchId);
        return result;
    } catch (error: any) {
        console.error("Failed to fetch QR file:", error);
        return { success: false, message: error.message || "Failed to fetch QR file" };
    }
}

export async function toggleQrBatchStatusAction(batchId: number, isActive: boolean) {
    try {
        const result = await qrService.toggleBatchStatus(batchId, isActive);
        return result;
    } catch (error: any) {
        console.error("Failed to toggle QR batch status:", error);
        return { success: false, message: error.message || "Failed to toggle QR batch status" };
    }
}

import * as XLSX from 'xlsx';
import { inventoryBatchRepository } from "@/server/repositories/inventorybatch-repository";

import { skuLevelRepository } from "@/server/repositories/sku-level-repository";

export async function syncQrExcelAction(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        if (!file) throw new Error("No file provided");
        
        const buffer = Buffer.from(await file.arrayBuffer());
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet) as any[];

        if (data.length === 0) throw new Error("Excel file is empty");

        const groupedData: { [key: string]: any[] } = {};
        data.forEach(row => {
            const productCode = row['Product Code'] || row['product-code'] || row['ProductCode'];
            const serialNumber = row['Serial Number'] || row['serial-number'] || row['SerialNumber'];
            const status = row['qr-status'] || row['status'] || row['QRStatus'];
            
            if (productCode && serialNumber) {
                const pc = String(productCode).trim();
                if (!groupedData[pc]) groupedData[pc] = [];
                groupedData[pc].push({
                    serialNumber: String(serialNumber).trim(),
                    isActive: String(status).toLowerCase() === 'active' || String(status) === '1'
                });
            }
        });

        const productCodes = Object.keys(groupedData);
        if (productCodes.length === 0) throw new Error("No valid data found in Excel. Please check headers.");

        // Validation 1: All product codes must exist in SKU Master
        for (const pc of productCodes) {
            const exists = await skuLevelRepository.doesVariantExist(pc);
            if (!exists) {
                throw new Error(`Product Code "${pc}" not found in SKU Master. Sync aborted.`);
            }
        }

        // Validation 2: Serial numbers must be unique globally
        const allSerialNumbers = data.map(row => {
            const sn = row['Serial Number'] || row['serial-number'] || row['SerialNumber'];
            return sn ? String(sn).trim() : null;
        }).filter(Boolean) as string[];

        // Check in chunks of 1000 for large files
        for (let i = 0; i < allSerialNumbers.length; i += 1000) {
            const chunk = allSerialNumbers.slice(i, i + 1000);
            const existing = await db.select({ sn: inventory.serialNumber })
                .from(inventory)
                .where(inArray(inventory.serialNumber, chunk));
            
            if (existing.length > 0) {
                throw new Error(`Serial Number(s) already exist: ${existing.map(e => e.sn).join(', ')}. Sync aborted.`);
            }
        }


        const session = await auth();
        const userId = session?.user?.id ? Number(session.user.id) : undefined;

        const results = [];
        for (const productCode of productCodes) {
            const items = groupedData[productCode];
            const batchId = await inventoryBatchRepository.createBatchWithItems({
                skuCode: productCode,
                quantity: items.length,
                type: 'inner',
                createdBy: userId
            }, items);
            results.push({ productCode, batchId, quantity: items.length });
        }


        // Emit event for record keeping
        await emitEvent(BUS_EVENTS.QR_BATCH_PROCESSED, { 
            batches: results,
            originalName: file.name 
        });

        return { success: true, message: `Successfully synced ${results.length} batches with ${data.length} total items.` };
    } catch (error: any) {
        console.error("Error syncing QR Excel:", error);
        return { success: false, message: error.message };
    }
}

export async function fetchBatchItemsAction(batchId: number, page: number = 0, limit: number = 50) {
    try {
        const result = await inventoryBatchRepository.fetchInventoryItemsByBatch(batchId, page, limit);
        return { success: true, data: result.items, total: result.total };
    } catch (error: any) {
        console.error("Failed to fetch batch items:", error);
        return { success: false, message: error.message || "Failed to fetch items" };
    }
}

