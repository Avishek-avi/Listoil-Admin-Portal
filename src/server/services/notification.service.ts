import { db } from "@/db";
import {
    notificationTemplates,
    notificationLogs,
    eventMaster,
    users
} from "@/db/schema";
import { eq, and } from "drizzle-orm";

// Placeholder for actual sending logic
const sendSms = async (phone: string, body: string) => {
    console.log(`[SMS-SERVICE] Sending to ${phone}: ${body}`);
    // Implement actual SMS provider call here (e.g., Twilio, AWS SNS)
    // For now, we return success
    return { success: true, messageId: "sms_" + Date.now(), provider: 'default' };
};

const sendPush = async (fcmToken: string, title: string, body: string) => {
    console.log(`[PUSH-SERVICE] Sending to ${fcmToken}: [${title}] ${body}`);
    // Implement actual FCM call here using firebase-admin
    /*
    try {
        const response = await admin.messaging().send({
            token: fcmToken,
            notification: { title, body },
        });
        return { success: true, messageId: response, provider: 'fcm' };
    } catch (error) {
        return { success: false, error };
    }
    */
    return { success: true, messageId: "push_" + Date.now(), provider: 'fcm_stub' };
};

export const NotificationService = {
    /**
     * Replaces placeholders in format {{key}} with values from data object
     */
    replacePlaceholders(template: string | null, data: Record<string, any>) {
        if (!template) return "";
        return template.replace(/\{\{(.*?)\}\}/g, (match, p1) => {
            const key = p1.trim();
            return data[key] !== undefined ? data[key] : match;
        });
    },

    /**
     * Trigger an automated notification based on an event key
     */
    async triggerNotification(eventKey: string, userId: number, data: Record<string, any> = {}) {
        try {
            // 1. Fetch Event Master
            const [event] = await db.select().from(eventMaster).where(and(eq(eventMaster.eventKey, eventKey), eq(eventMaster.isActive, true)));
            if (!event || !event.templateId) {
                console.warn(`[NotificationService] No active event found for key: ${eventKey}`);
                return;
            }

            // 2. Fetch Template
            const [template] = await db.select().from(notificationTemplates).where(and(eq(notificationTemplates.id, event.templateId), eq(notificationTemplates.isActive, true)));
            if (!template) {
                console.warn(`[NotificationService] Template ${event.templateId} not found or inactive`);
                return;
            }

            return this.sendNotificationToUser(userId, template, data);
        } catch (error) {
            console.error(`[NotificationService] Error triggering notification ${eventKey}:`, error);
        }
    },

    /**
     * Send a notification using a specific template to a specific user
     */
    async sendNotificationToUser(userId: number, template: any, data: Record<string, any>) {
        // 1. Fetch User for phone/fcm token
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        if (!user) {
            console.warn(`[NotificationService] User ${userId} not found`);
            return;
        }

        // 2. Prepare Content
        const pushTitle = this.replacePlaceholders(template.pushTitle, data);
        const pushBody = this.replacePlaceholders(template.pushBody, data);
        const smsBody = this.replacePlaceholders(template.smsBody, data);

        const results = [];

        // 3. Send SMS if template has body and user has phone
        if (template.smsBody && user.phone) {
            const res = await sendSms(user.phone, smsBody);
            await db.insert(notificationLogs).values({
                userId,
                channel: 'sms',
                templateId: template.id,
                triggerType: template.triggerType,
                status: res.success ? 'sent' : 'failed',
                metadata: res,
            });
            results.push({ channel: 'sms', ...res });
        }

        // 4. Send Push if template has body and user has fcmToken
        if (template.pushBody && user.fcmToken) {
            const res = await sendPush(user.fcmToken, pushTitle, pushBody);
            await db.insert(notificationLogs).values({
                userId,
                channel: 'push',
                templateId: template.id,
                triggerType: template.triggerType,
                status: res.success ? 'sent' : 'failed',
                metadata: res,
            });
            results.push({ channel: 'push', ...res });
        }

        return results;
    },

    /**
     * Send manual notification to a user
     */
    async sendManualNotification(userId: number, templateId: number, data: Record<string, any> = {}) {
        const [template] = await db.select().from(notificationTemplates).where(and(eq(notificationTemplates.id, templateId), eq(notificationTemplates.triggerType, 'manual')));
        if (!template) throw new Error("Manual template not found");

        return this.sendNotificationToUser(userId, template, data);
    },

    /**
     * Send campaign notifications to multiple users
     */
    async sendCampaignNotification(userIds: number[], templateId: number, data: Record<string, any> = {}) {
        const [template] = await db.select().from(notificationTemplates).where(and(eq(notificationTemplates.id, templateId), eq(notificationTemplates.triggerType, 'campaign')));
        if (!template) throw new Error("Campaign template not found");

        const batchResults = [];
        for (const userId of userIds) {
            const res = await this.sendNotificationToUser(userId, template, data);
            batchResults.push({ userId, results: res });
        }
        return batchResults;
    }
};
