'use server'

import { db } from "@/db"
import { tickets, users, ticketTypes, ticketStatuses, userTypeEntity, userTypeLevelMaster, retailers, mechanics, counterSales } from "@/db/schema"
import { desc, eq, or, ilike, sql, and, inArray } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { revalidatePath } from "next/cache"
import { NotificationService } from "@/server/services/notification.service"
import { auth } from "@/lib/auth"
import { getUserScope } from "@/lib/scope-utils"
import { withAudit } from "@/lib/audit"

// Allowed status transitions (canonical lowercase status name → next allowed names).
// Reopen is allowed from resolved/closed.
const TICKET_TRANSITIONS: Record<string, string[]> = {
    open: ["in_progress", "resolved", "closed"],
    in_progress: ["resolved", "closed", "open"],
    resolved: ["closed", "open"],
    closed: ["open"],
}

function normalizeStatus(name: string | null | undefined): string {
    return (name || "").toLowerCase().replace(/\s+/g, "_").trim()
}

async function assertValidStatusTransition(ticketId: number, targetStatusId: number) {
    const [current] = await db
        .select({
            currentStatus: ticketStatuses.name,
            currentStatusId: tickets.statusId,
        })
        .from(tickets)
        .leftJoin(ticketStatuses, eq(tickets.statusId, ticketStatuses.id))
        .where(eq(tickets.id, ticketId))
        .limit(1)

    if (!current) throw new Error("Ticket not found")

    const [target] = await db
        .select({ name: ticketStatuses.name })
        .from(ticketStatuses)
        .where(eq(ticketStatuses.id, targetStatusId))
        .limit(1)

    if (!target) throw new Error("Invalid target status")

    const from = normalizeStatus(current.currentStatus)
    const to = normalizeStatus(target.name)

    if (from === to) return { from, to } // no-op

    const allowed = TICKET_TRANSITIONS[from]
    if (!allowed || !allowed.includes(to)) {
        throw new Error(`Illegal ticket transition: ${from} → ${to}`)
    }
    return { from, to }
}

export interface TicketFilters {
    searchTerm?: string;
    priority?: string;
    statusId?: number;
    typeId?: number;
}

export async function getTicketsAction(filters?: TicketFilters) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");
        const scope = await getUserScope(Number(session.user.id));

        const { searchTerm, priority, statusId, typeId } = filters || {};

        const requester = alias(users, 'requester');
        const assignee = alias(users, 'assignee');
        const requesterType = alias(userTypeEntity, 'requesterType');
        const assigneeType = alias(userTypeEntity, 'assigneeType');

        let query = db.select({
            id: tickets.id,
            subject: tickets.subject,
            description: tickets.description,
            priority: tickets.priority,
            createdAt: tickets.createdAt,
            updatedAt: tickets.updatedAt,
            typeName: ticketTypes.name,
            statusName: ticketStatuses.name,
            requesterId: requester.id,
            requesterName: requester.name,
            requesterTypeName: requesterType.typeName,
            assigneeId: assignee.id,
            assigneeName: assignee.name,
            assigneeTypeName: assigneeType.typeName,
            imageUrl: tickets.imageUrl,
            videoUrl: tickets.videoUrl,
        })
            .from(tickets)
            .leftJoin(ticketTypes, eq(tickets.typeId, ticketTypes.id))
            .leftJoin(ticketStatuses, eq(tickets.statusId, ticketStatuses.id))
            .leftJoin(requester, eq(tickets.createdBy, requester.id))
            .leftJoin(requesterType, eq(requester.roleId, requesterType.id))
            .leftJoin(assignee, eq(tickets.assigneeId, assignee.id))
            .leftJoin(assigneeType, eq(assignee.roleId, assigneeType.id))
            .leftJoin(retailers, eq(requester.id, retailers.userId))
            .leftJoin(mechanics, eq(requester.id, mechanics.userId))
            .leftJoin(counterSales, eq(requester.id, counterSales.userId))
            .$dynamic();

        const conditions = [];

        if (scope.type !== 'Global') {
            const lowerNames = (scope.entityNames || []).map(n => n.toLowerCase());
            conditions.push(or(
                inArray(sql`LOWER(${retailers.state})`, lowerNames),
                inArray(sql`LOWER(${mechanics.state})`, lowerNames),
                inArray(sql`LOWER(${counterSales.state})`, lowerNames),
                inArray(sql`LOWER(${retailers.city})`, lowerNames),
                inArray(sql`LOWER(${mechanics.city})`, lowerNames),
                inArray(sql`LOWER(${counterSales.city})`, lowerNames)
            ));
        }

        if (searchTerm) {
            conditions.push(or(
                ilike(tickets.subject, `%${searchTerm}%`),
                ilike(tickets.description, `%${searchTerm}%`),
                ilike(requester.name, `%${searchTerm}%`),
                ilike(assignee.name, `%${searchTerm}%`),
                sql`CAST(${tickets.id} AS TEXT) ILIKE ${'%' + searchTerm + '%'}`
            ));
        }

        if (priority && priority !== 'All Priority') {
            conditions.push(eq(tickets.priority, priority));
        }

        if (statusId) {
            conditions.push(eq(tickets.statusId, statusId));
        }

        if (typeId) {
            conditions.push(eq(tickets.typeId, typeId));
        }

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        const dbTickets = await query
            .orderBy(desc(tickets.createdAt))
            .limit(100);

        return dbTickets.map(t => ({
            id: `TKT-${t.id.toString().padStart(3, '0')}`,
            dbId: t.id,
            subject: t.subject || 'No Subject',
            description: t.description,
            requesterId: t.requesterId,
            requester: t.requesterName || 'Unknown',
            requesterType: t.requesterTypeName || 'N/A',
            type: t.typeName || 'General',
            status: t.statusName || 'Open',
            priority: t.priority || 'Medium',
            assigneeId: t.assigneeId,
            assignedTo: t.assigneeName || 'Unassigned',
            assignedToType: t.assigneeTypeName || 'N/A',
            imageUrl: t.imageUrl,
            videoUrl: t.videoUrl,
            createdAt: t.createdAt,
            lastUpdated: t.updatedAt
        }));
    } catch (error) {
        console.error("Error in getTicketsAction:", error);
        return [];
    }
}

export async function getTicketTypesAction() {
    return await db.select().from(ticketTypes);
}

export async function getTicketStatusesAction() {
    return await db.select().from(ticketStatuses);
}

export async function searchUsersAction(searchTerm: string) {
    // If searchTerm is short, we can still return some default users (e.g. staff or recent)
    const normalizedSearch = (searchTerm || '').toLowerCase();

    try {
        // Fetch the max level ID to exclude the last level (Member/Customer)
        const levels = await db.select({ id: userTypeLevelMaster.id })
            .from(userTypeLevelMaster)
            .orderBy(desc(userTypeLevelMaster.id))
            .limit(1);
        const maxLevelId = levels[0]?.id;
        // Search in users table
        let usersQuery = db.select({
            id: users.id,
            name: users.name,
            phone: users.phone,
            roleId: users.roleId,
            typeName: userTypeEntity.typeName,
            levelId: userTypeEntity.levelId
        })
            .from(users)
            .leftJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
            .$dynamic();

        const conditions = [];

        if (normalizedSearch.length >= 2) {
            conditions.push(or(
                ilike(users.name, `%${normalizedSearch}%`),
                ilike(users.phone, `%${normalizedSearch}%`)
            ));
        }

        if (conditions.length > 0) {
            usersQuery = usersQuery.where(and(...conditions));
        }

        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");
        const scope = await getUserScope(Number(session.user.id));

        if (scope.type !== 'Global') {
            const lowerNames = (scope.entityNames || []).map(n => n.toLowerCase());
            usersQuery.leftJoin(retailers, eq(users.id, retailers.userId))
                .leftJoin(mechanics, eq(users.id, mechanics.userId))
                .leftJoin(counterSales, eq(users.id, counterSales.userId))
                .where(or(
                    inArray(sql`LOWER(${retailers.state})`, lowerNames),
                    inArray(sql`LOWER(${mechanics.state})`, lowerNames),
                    inArray(sql`LOWER(${counterSales.state})`, lowerNames),
                    inArray(sql`LOWER(${retailers.city})`, lowerNames),
                    inArray(sql`LOWER(${mechanics.city})`, lowerNames),
                    inArray(sql`LOWER(${counterSales.city})`, lowerNames)
                ));
        }

        const usersList = await usersQuery.limit(20);

        return usersList.map(u => ({
            id: u.id,
            uniqueId: 'N/A',
            name: u.name || 'Unknown',
            phone: u.phone,
            type: u.typeName || 'Staff/User',
            isLastLevel: u.levelId === maxLevelId
        }));
    } catch (error) {
        console.error("Error searching users:", error);
        return [];
    }
}

export async function createTicketAction(data: {
    typeId: number,
    statusId: number,
    subject: string,
    description: string,
    priority: string,
    createdBy: number,
    assigneeId?: number
}) {
    try {
        if (!data.subject || !data.description) {
            return { success: false, error: "Subject and description are required." };
        }
        if (!data.typeId || !data.statusId) {
            return { success: false, error: "Ticket type and status are required." };
        }
        if (!data.createdBy) {
            return { success: false, error: "Requester is required. Please select a user." };
        }

        const [newTicket] = await db.insert(tickets).values({
            typeId: data.typeId,
            statusId: data.statusId,
            subject: data.subject,
            description: data.description,
            priority: data.priority,
            createdBy: data.createdBy,
            assigneeId: data.assigneeId || null,
        }).returning();

        revalidatePath('/tickets');
        return { success: true, ticket: newTicket };
    } catch (error: any) {
        console.error("Error creating ticket:", error);
        const message = error?.message || "Failed to create ticket";
        return { success: false, error: message };
    }
}

export async function updateTicketAction(ticketId: number, data: {
    statusId?: number,
    assigneeId?: number,
    resolutionNotes?: string,
    resolvedAt?: string
}) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");

        const [previous] = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
        if (!previous) throw new Error("Ticket not found");

        let transition: { from: string; to: string } | null = null;
        if (data.statusId && data.statusId !== previous.statusId) {
            transition = await assertValidStatusTransition(ticketId, data.statusId);
        }

        const updateData: any = { ...data };

        await withAudit(
            {
                tableName: "tickets",
                recordId: ticketId,
                operation: "UPDATE",
                action: transition ? `status:${transition.from}->${transition.to}` : "ticket.update",
                oldState: {
                    statusId: previous.statusId,
                    assigneeId: previous.assigneeId,
                    resolutionNotes: previous.resolutionNotes,
                },
                newState: data,
            },
            async () => {
                await db.update(tickets)
                    .set({
                        ...updateData,
                        updatedAt: sql`CURRENT_TIMESTAMP`
                    })
                    .where(eq(tickets.id, ticketId));
            }
        );

        // Trigger Notification
        if (data.statusId || data.assigneeId) {
            const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
            if (ticket) {
                const eventKey = data.statusId ? 'TICKET_STATUS_UPDATE' : 'TICKET_ASSIGNED';
                await NotificationService.triggerNotification(eventKey, ticket.createdBy, {
                    ticketId: `TKT-${ticket.id}`,
                    subject: ticket.subject,
                    statusId: data.statusId,
                    assigneeId: data.assigneeId
                });
            }
        }

        revalidatePath('/tickets');
        return { success: true };
    } catch (error: any) {
        console.error("Error updating ticket:", error);
        return { success: false, error: error?.message || "Failed to update ticket" };
    }
}

export async function getTicketDetailsAction(ticketId: string) {
    // Remove 'TKT-' prefix if present
    const id = parseInt(ticketId.replace('TKT-', ''));
    if (isNaN(id)) return null;

    try {
        const requester = alias(users, 'requester');
        const assignee = alias(users, 'assignee');
        const requesterType = alias(userTypeEntity, 'requesterType');
        const assigneeType = alias(userTypeEntity, 'assigneeType');

        const [t] = await db.select({
            id: tickets.id,
            subject: tickets.subject,
            description: tickets.description,
            priority: tickets.priority,
            createdAt: tickets.createdAt,
            updatedAt: tickets.updatedAt,
            typeName: ticketTypes.name,
            statusName: ticketStatuses.name,
            statusId: tickets.statusId,
            requesterName: requester.name,
            requesterId: requester.id,
            requesterTypeName: requesterType.typeName,
            assigneeName: assignee.name,
            assigneeId: assignee.id,
            assigneeTypeName: assigneeType.typeName,
            resolutionNotes: tickets.resolutionNotes,
            resolvedAt: tickets.resolvedAt,
            attachments: tickets.attachments,
            imageUrl: tickets.imageUrl,
            videoUrl: tickets.videoUrl,
        })
            .from(tickets)
            .leftJoin(ticketTypes, eq(tickets.typeId, ticketTypes.id))
            .leftJoin(ticketStatuses, eq(tickets.statusId, ticketStatuses.id))
            .leftJoin(requester, eq(tickets.createdBy, requester.id))
            .leftJoin(requesterType, eq(requester.roleId, requesterType.id))
            .leftJoin(assignee, eq(tickets.assigneeId, assignee.id))
            .leftJoin(assigneeType, eq(assignee.roleId, assigneeType.id))
            .where(eq(tickets.id, id));

        if (!t) return null;

        // Scope check
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");
        const scope = await getUserScope(Number(session.user.id));

        if (scope.type !== 'Global') {
            const lowerNames = (scope.entityNames || []).map(n => n.toLowerCase());
            // Fetch territory of requester to check scope
            const [requesterTerritory] = await db.select({
                state: sql<string>`COALESCE(${retailers.state}, ${mechanics.state}, ${counterSales.state})`,
                city: sql<string>`COALESCE(${retailers.city}, ${mechanics.city}, ${counterSales.city})`
            })
            .from(users)
            .leftJoin(retailers, eq(users.id, retailers.userId))
            .leftJoin(mechanics, eq(users.id, mechanics.userId))
            .leftJoin(counterSales, eq(users.id, counterSales.userId))
            .where(eq(users.id, t.requesterId));

            const val = scope.type === 'State' ? requesterTerritory?.state : requesterTerritory?.city;
            if (!val || !lowerNames.includes(val.toLowerCase())) {
                throw new Error("Access denied: Ticket requester is outside your assigned territory.");
            }
        }

        return {
            ...t,
            displayId: `TKT-${t.id.toString().padStart(3, '0')}`,
        };
    } catch (error) {
        console.error("Error fetching ticket details:", error);
        return null;
    }
}
