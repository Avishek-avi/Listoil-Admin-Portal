// broker.ts — Unified Event Bus MQ Layer (Admin Panel)
// Mirrors the backend mqService.ts event key scheme

import { BaseMQConnector } from './baseConnecter';
import { RabbitMQConnector } from './rabbitmQConnecter';
import { db } from "@/db";
import { eventLogs, eventMaster } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

/**
 * All known event keys — unified with the backend.
 * These match event_master.event_key exactly.
 */
export const EVENT_KEYS = {
  // User lifecycle
  USER_SIGNUP_OTP: 'USER_SIGNUP_OTP',
  USER_REGISTRATION: 'USER_REGISTRATION',
  USER_REGISTERED: 'USER_REGISTERED',
  USER_CREATED: 'USER_CREATED',
  USER_APPROVED: 'USER_APPROVED',
  USER_BLOCK: 'USER_BLOCK',
  USER_SCAN_BLOCK: 'USER_SCAN_BLOCK',
  USER_REDEMPTION_BLOCK: 'USER_REDEMPTION_BLOCK',
  USER_LOGIN_OTP: 'USER_LOGIN_OTP',
  USER_PASSWORD_RESET_OTP: 'USER_PASSWORD_RESET_OTP',

  // KYC
  USER_KYC_OTP: 'USER_KYC_OTP',
  USER_KYC_SUBMITTED: 'USER_KYC_SUBMITTED',
  USER_KYC_APPROVED: 'USER_KYC_APPROVED',
  USER_KYC_REJECT: 'USER_KYC_REJECT',

  // Profile
  PROFILE_UPDATE: 'PROFILE_UPDATE',

  // Account
  ACCOUNT_DELETION_REQUESTED: 'ACCOUNT_DELETION_REQUESTED',

  // Scanning & Earning
  SCAN_ATTEMPT: 'SCAN_ATTEMPT',
  SCAN_SUCCESS: 'SCAN_SUCCESS',
  SCAN_FAILED: 'SCAN_FAILED',
  EARNING_SCAN: 'EARNING_SCAN',
  EARNING_OTHER: 'EARNING_OTHER',
  REGISTRATION_BONUS: 'REGISTRATION_BONUS',
  REFERRAL_EARNING: 'REFERRAL_EARNING',

  // Ticketing
  TICKET_CREATE: 'TICKET_CREATE',
  TICKET_ASSIGNED: 'TICKET_ASSIGNED',
  TICKET_CLOSED: 'TICKET_CLOSED',

  // Redemption
  REDEMPTION_REQUEST: 'REDEMPTION_REQUEST',
  REDEMPTION_APPROVE: 'REDEMPTION_APPROVE',
  REDEMPTION_REJECT: 'REDEMPTION_REJECT',
  REDEMPTION_REJECTED: 'REDEMPTION_REJECTED',

  // Payout
  PAYOUT_INITIATED: 'PAYOUT_INITIATED',
  PAYOUT_FAILED: 'PAYOUT_FAILED',

  // QR Batch
  QR_BATCH_CREATED: 'QR_BATCH_CREATED',
  QR_BATCH_PROCESSED: 'QR_BATCH_PROCESSED',
  QR_BATCH_FAILED: 'QR_BATCH_FAILED',

  // Admin
  ADMIN_LOGIN: 'ADMIN_LOGIN',
  ADMIN_HIEARCHY_CREATED: 'ADMIN_HIEARCHY_CREATED',
  ADMIN_MANUAL_TRANSACTION_ENTRY: 'ADMIN_MANUAL_TRANSACTION_ENTRY',

  // SKU
  SKU_POINT_CHANGE: 'SKU_POINT_CHANGE',
  SKU_RULE_MODIFY: 'SKU_RULE_MODIFY',

  // Config
  MEMBER_MASTER_CONFIG_UPDATE: 'MEMBER_MASTER_CONFIG_UPDATE',
  LOCATION_LEVEL_CHANGED: 'LOCATION_LEVEL_CHANGED',
  KYC_APPROVE: 'KYC_APPROVE',
  TDS_CONSENT: 'TDS_CONSENT',
} as const;

export type EventKey = typeof EVENT_KEYS[keyof typeof EVENT_KEYS];
export type EventKeyName = keyof typeof EVENT_KEYS;

/** @deprecated Use EVENT_KEYS instead */
export const BUS_EVENTS = EVENT_KEYS;
export type BusEvent = EventKey;
export type BusEventKey = EventKeyName;

let connector: BaseMQConnector | null = null;

export const initMQ = () => {
  if (!connector) {
    connector = new RabbitMQConnector();
  }
  return connector;
};

export const publish = (topic: string, payload: any) => initMQ().publish(topic, payload).then(r => console.log(r)).catch(e => console.log(e))

export const subscribe = (topic: string, handler: (payload: any) => Promise<void>) =>
  initMQ().subscribe(topic, handler).then(r => console.log(r)).catch(e => console.log(e));


export interface EventLogPayload {
  userId?: number;
  entityId?: string;
  correlationId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  action?: string;
  eventType?: string;
}

/**
 * Centrally log an event into 'event_logs' and publish it to RabbitMQ.
 * Uses unified event keys (no more dot-notation mapping).
 */
export async function emitEvent(
  eventKey: string,
  payload: EventLogPayload & { [key: string]: any }
) {
  try {
    // Automatically capture userId from session if not provided
    const session = await auth();
    if (session?.user?.id) {
      payload.userId = Number(session.user.id);
    }

    // Auto-generate correlationId if missing
    const correlationId = payload.correlationId || crypto.randomUUID();

    // Find event in master to get ID
    const [masterDef] = await db
      .select()
      .from(eventMaster)
      .where(eq(eventMaster.eventKey, eventKey))
      .limit(1);

    if (masterDef) {
      // Persist to event_logs
      await db.insert(eventLogs).values({
        userId: payload.userId || null,
        eventId: masterDef.id,
        action: payload.action || eventKey,
        eventType: payload.eventType || masterDef.category || 'system',
        entityId: payload.entityId || null,
        correlationId: correlationId,
        metadata: payload.metadata || payload,
        ipAddress: payload.ipAddress || null,
        userAgent: payload.userAgent || null,
      });
    } else {
      console.warn(`[EventBus] Event key '${eventKey}' not found in event_master. DB logging skipped.`);
    }

    // Publish to MQ using the event key directly as the routing key
    await publish(eventKey, {
      ...payload,
      userId: payload.userId,
      correlationId: correlationId,
      eventKey,
      timestamp: new Date().toISOString(),
    });
    console.log(`[EventBus] Emitted: ${eventKey}`);

  } catch (error) {
    console.error(`[EventBus] Failed to emit '${eventKey}':`, error);
  }
}
