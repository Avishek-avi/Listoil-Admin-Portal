'use server'

import { db } from "@/db";
import {
    notificationTemplates,
    eventMaster,
    notificationLogs,
    users
} from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { NotificationService } from "@/server/services/notification.service";
import { revalidatePath } from "next/cache";

export async function getNotificationTemplatesAction() {
    try {
        return await db.select().from(notificationTemplates).orderBy(desc(notificationTemplates.createdAt));
    } catch (error) {
        console.error("Error fetching notification templates:", error);
        throw new Error("Failed to fetch notification templates");
    }
}

export async function upsertNotificationTemplateAction(data: any) {
    try {
        const { id, ...rest } = data;
        if (id) {
            await db.update(notificationTemplates).set({ ...rest, updatedAt: new Date().toISOString() }).where(eq(notificationTemplates.id, id));
        } else {
            await db.insert(notificationTemplates).values(rest);
        }
        revalidatePath("/communication");
        return { success: true };
    } catch (error) {
        console.error("Error saving notification template:", error);
        throw new Error("Failed to save notification template");
    }
}

export async function getEventMastersAction() {
    try {
        return await db.select().from(eventMaster).orderBy(desc(eventMaster.createdAt));
    } catch (error) {
        console.error("Error fetching event masters:", error);
        throw new Error("Failed to fetch event masters");
    }
}

export async function upsertEventMasterAction(data: any) {
    try {
        const { id, ...rest } = data;
        if (id) {
            await db.update(eventMaster).set(rest).where(eq(eventMaster.id, id));
        } else {
            await db.insert(eventMaster).values(rest);
        }
        revalidatePath("/communication");
        return { success: true };
    } catch (error) {
        console.error("Error saving event master:", error);
        throw new Error("Failed to save event master");
    }
}

export async function sendManualNotificationAction(userId: number, templateId: number, data: Record<string, any> = {}) {
    try {
        const result = await NotificationService.sendManualNotification(userId, templateId, data);
        return { success: true, result };
    } catch (error: any) {
        console.error("Error sending manual notification:", error);
        return { success: false, error: error.message };
    }
}

export async function getNotificationLogsAction(userId?: number) {
    try {
        let query = db.select().from(notificationLogs).orderBy(desc(notificationLogs.sentAt));
        if (userId) {
            // @ts-ignore
            query = query.where(eq(notificationLogs.userId, userId));
        }
        return await query.limit(100);
    } catch (error) {
        console.error("Error fetching notification logs:", error);
        throw new Error("Failed to fetch notification logs");
    }
}
