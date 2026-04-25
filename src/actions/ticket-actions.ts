'use server'

import { db } from "@/db"
import { tickets, users, ticketTypes, ticketStatuses, userTypeEntity, userTypeLevelMaster } from "@/db/schema"
import { desc, eq, or, ilike, sql, and } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { revalidatePath } from "next/cache"
import { NotificationService } from "@/server/services/notification.service"

export interface TicketFilters {
    searchTerm?: string;
    priority?: string;
    statusId?: number;
    typeId?: number;
}

export async function getTicketsAction(filters?: TicketFilters) {
    try {
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
            .$dynamic();

        const conditions = [];

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
        const [newTicket] = await db.insert(tickets).values({
            typeId: data.typeId,
            statusId: data.statusId,
            subject: data.subject,
            description: data.description,
            priority: data.priority,
            createdBy: data.createdBy,
            assigneeId: data.assigneeId,
        }).returning();

        revalidatePath('/tickets');
        return { success: true, ticket: newTicket };
    } catch (error) {
        console.error("Error creating ticket:", error);
        return { success: false, error: "Failed to create ticket" };
    }
}

export async function updateTicketAction(ticketId: number, data: {
    statusId?: number,
    assigneeId?: number,
    resolutionNotes?: string,
    resolvedAt?: string
}) {
    try {
        const updateData: any = { ...data };
        if (data.statusId) {
            // If status is being set to resolved/closed, we might want to set resolvedAt automatically
            // But let's keep it simple for now and let the caller decide.
        }

        await db.update(tickets)
            .set({
                ...updateData,
                updatedAt: sql`CURRENT_TIMESTAMP`
            })
            .where(eq(tickets.id, ticketId));

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
    } catch (error) {
        console.error("Error updating ticket:", error);
        return { success: false, error: "Failed to update ticket" };
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

        return {
            ...t,
            displayId: `TKT-${t.id.toString().padStart(3, '0')}`,
        };
    } catch (error) {
        console.error("Error fetching ticket details:", error);
        return null;
    }
}
