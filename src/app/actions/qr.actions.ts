'use server';

import { qrService } from "@/server/services/qr.service";
import { GenerateQrPayload } from "@/lib/types";
import { fileMiddleware } from "@/server/middlewares/file-middleware";
import { BUS_EVENTS, emitEvent } from "@/server/rabbitMq/broker";

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

export async function syncQrExcelAction(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        const type = formData.get('type') as string || 'qr-sync';
        
        if (!file) throw new Error("No file provided");
        
        const buffer = Buffer.from(await file.arrayBuffer());
        const multerFile: Express.Multer.File = {
            buffer,
            originalname: file.name,
            mimetype: file.type,
            size: file.size,
            fieldname: 'file',
            encoding: '7bit',
            destination: '',
            filename: '',
            path: '',
            stream: null as any
        };
        
        const fileName = await fileMiddleware.uploadFile(multerFile, type);
        
        // Emit event for background processing of the excel file
        await emitEvent(BUS_EVENTS.QR_BATCH_CREATED, { 
            fileName, 
            type: 'excel-sync',
            originalName: file.name 
        });

        return { success: true, message: "File uploaded and sync started" };
    } catch (error: any) {
        console.error("Error syncing QR Excel:", error);
        return { success: false, message: error.message };
    }
}
