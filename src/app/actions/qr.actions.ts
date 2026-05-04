'use server';

import { qrService } from "@/server/services/qr.service";
import { GenerateQrPayload } from "@/lib/types";
import { db } from "@/db";

import { fileMiddleware } from "@/server/middlewares/file-middleware";
import { BUS_EVENTS, emitEvent } from "@/server/rabbitMq/broker";
import { auth } from "@/lib/auth";
import { tblInventory as inventory } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { isValid, parseISO } from 'date-fns';



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
        const rows = XLSX.utils.sheet_to_json(sheet) as any[];

        if (rows.length === 0) throw new Error("Excel file is empty");

        // 1. Identify headers and rows
        const processedRows: any[] = [];
        const successItems: { serialNumber: string, isActive: boolean }[] = [];
        
        // Collect all unique product codes and serials from file for bulk validation
        const fileProductCodes = new Set<string>();
        const fileSerials = new Set<string>();
        const serialToRowIdx = new Map<string, number[]>();

        rows.forEach((row, idx) => {
            const pc = String(row['Product Code'] || row['product-code'] || row['ProductCode'] || '').trim();
            const sn = String(row['Serial Number'] || row['serial-number'] || row['SerialNumber'] || '').trim();
            if (pc) fileProductCodes.add(pc);
            if (sn) {
                fileSerials.add(sn);
                if (!serialToRowIdx.has(sn)) serialToRowIdx.set(sn, []);
                serialToRowIdx.get(sn)?.push(idx);
            }
        });

        // 2. Bulk Validate SKUs
        const validSkus = new Set<string>();
        for (const pc of Array.from(fileProductCodes)) {
            const exists = await skuLevelRepository.doesVariantExist(pc);
            if (exists) validSkus.add(pc);
        }

        // 3. Bulk Validate Serial Uniqueness in DB
        const existingSerialsInDb = new Set<string>();
        const allSerialsArr = Array.from(fileSerials);
        for (let i = 0; i < allSerialsArr.length; i += 1000) {
            const chunk = allSerialsArr.slice(i, i + 1000);
            const existing = await db.select({ sn: inventory.serialNumber })
                .from(inventory)
                .where(inArray(inventory.serialNumber, chunk));
            existing.forEach(e => existingSerialsInDb.add(e.sn));
        }

        // 4. Process Rows
        const duplicateInFile = new Set<string>();
        serialToRowIdx.forEach((indices, sn) => {
            if (indices.length > 1) duplicateInFile.add(sn);
        });

        rows.forEach((row, idx) => {
            const pc = String(row['Product Code'] || row['product-code'] || row['ProductCode'] || '').trim();
            const sn = String(row['Serial Number'] || row['serial-number'] || row['SerialNumber'] || '').trim();
            const genDate = row['generation date'] || row['generation-date'] || row['GenerationDate'];
            const statusStr = String(row['qr-status'] || row['status'] || row['QRStatus'] || '').toLowerCase();
            
            let status = 'Success';
            let reason = '';

            // Date validation
            if (genDate) {
                const dateStr = String(genDate);
                const d = parseISO(dateStr);
                
                // Catch common Excel/String errors
                const hasInvalidDay = dateStr.split(/[-/]/).some(part => parseInt(part) > 31 && part.length <= 2);
                
                if (!isValid(d) || hasInvalidDay) {
                    status = 'Failed';
                    reason = `Invalid generation date: ${genDate}`;
                }
            }

            if (status === 'Success' && (!pc || !sn)) {
                status = 'Failed';
                reason = 'Missing Product Code or Serial Number';
            } else if (!validSkus.has(pc)) {
                status = 'Failed';
                reason = `Product Code "${pc}" not found in SKU Master`;
            } else if (existingSerialsInDb.has(sn)) {
                status = 'Failed';
                reason = 'Serial Number already exists in database';
            } else if (duplicateInFile.has(sn)) {
                // Mark only the subsequent duplicates as failed? Or all? 
                // Usually better to fail all or just keep the first.
                if (serialToRowIdx.get(sn)?.[0] !== idx) {
                    status = 'Failed';
                    reason = 'Duplicate Serial Number in this file';
                }
            }

            if (status === 'Success') {
                successItems.push({
                    serialNumber: sn,
                    skuCode: pc,
                    isActive: statusStr === 'active' || statusStr === '1' || statusStr === 'true'
                });
            }

            processedRows.push({
                ...row,
                'Sync Status': status,
                'Error Reason': reason
            });
        });

        const session = await auth();
        const userId = session?.user?.id ? Number(session.user.id) : undefined;

        let finalBatchId = null;
        if (successItems.length > 0) {
            // Check if there are multiple unique SKUs in the successful items
            const successSkus = new Set<string>();
            rows.forEach((row, idx) => {
                const pc = String(row['Product Code'] || row['product-code'] || row['ProductCode'] || '').trim();
                const sn = String(row['Serial Number'] || row['serial-number'] || row['SerialNumber'] || '').trim();
                // Only count SKUs that were actually successful
                const isSuccess = processedRows[idx]['Sync Status'] === 'Success';
                if (isSuccess && pc) successSkus.add(pc);
            });

            const batchSkuDisplay = successSkus.size > 1 
                ? `Multiple SKUs (${successSkus.size})` 
                : (Array.from(successSkus)[0] || 'Unknown');
            
            finalBatchId = await inventoryBatchRepository.createBatchWithItems({
                skuCode: batchSkuDisplay,
                quantity: successItems.length,
                type: 'inner',
                createdBy: userId
            }, successItems);
        }

        // 5. Generate Report Excel
        const reportWs = XLSX.utils.json_to_sheet(processedRows);
        const reportWb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(reportWb, reportWs, "Sync Results");
        const reportBuffer = XLSX.write(reportWb, { type: 'buffer', bookType: 'xlsx' });
        const reportBase64 = reportBuffer.toString('base64');

        return { 
            success: true, 
            message: `Processed ${rows.length} rows. Success: ${successItems.length}, Failed: ${rows.length - successItems.length}`,
            batchId: finalBatchId,
            report: reportBase64,
            fileName: `sync_report_${new Date().getTime()}.xlsx`
        };
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

