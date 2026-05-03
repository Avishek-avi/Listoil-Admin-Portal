import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

export type AuditOperation = "INSERT" | "UPDATE" | "DELETE" | "READ";

export interface AuditEntry {
    tableName: string;
    recordId: number;
    operation: AuditOperation;
    action: string;
    oldState?: unknown;
    newState?: unknown;
    correlationId?: string;
    changedBy?: number;
    changeSource?: string;
}

async function resolveRequestContext() {
    const h = await headers();
    const ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        h.get("x-real-ip") ||
        null;
    const userAgent = h.get("user-agent") || null;
    return { ip, userAgent };
}

async function resolveUser(): Promise<number | null> {
    try {
        const session = await auth();
        const id = session?.user?.id;
        return id ? Number(id) : null;
    } catch {
        return null;
    }
}

/**
 * Write a single audit log row. Failure is swallowed and logged — auditing
 * must never break the caller's business path.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
    try {
        const { ip, userAgent } = await resolveRequestContext();
        const changedBy = entry.changedBy ?? (await resolveUser());

        await db.insert(auditLogs).values({
            tableName: entry.tableName,
            recordId: entry.recordId,
            operation: entry.operation,
            action: entry.action,
            changedBy: changedBy ?? null,
            changeSource: entry.changeSource ?? "admin-portal",
            correlationId: entry.correlationId ?? randomUUID(),
            oldState: (entry.oldState as any) ?? null,
            newState: (entry.newState as any) ?? null,
            ipAddress: ip,
            userAgent,
        });
    } catch (err) {
        console.error("[audit] failed to write log", err, entry);
    }
}

/**
 * Wrap a mutating server action so audit metadata is captured around it.
 * The function receives a correlationId so it can stamp emitted events
 * with the same id and tie everything together.
 */
export async function withAudit<T>(
    meta: Omit<AuditEntry, "newState" | "oldState"> & {
        oldState?: unknown;
        newState?: unknown | ((result: T) => unknown);
    },
    fn: (correlationId: string) => Promise<T>
): Promise<T> {
    const correlationId = meta.correlationId ?? randomUUID();
    const result = await fn(correlationId);
    const newState =
        typeof meta.newState === "function"
            ? (meta.newState as (r: T) => unknown)(result)
            : meta.newState;
    await writeAuditLog({
        ...meta,
        correlationId,
        newState,
    });
    return result;
}
