'use server'

import { db } from "@/db";
import { eventHandlerConfig, eventMaster } from "@/db/schema";
import { eq, desc, asc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";


/**
 * Fetch all event handler config rows with event master details
 */
export async function getEventHandlerConfigsAction() {
  try {
    const configs = await db
      .select({
        id: eventHandlerConfig.id,
        eventKey: eventHandlerConfig.eventKey,
        handlerName: eventHandlerConfig.handlerName,
        priority: eventHandlerConfig.priority,
        config: eventHandlerConfig.config,
        isActive: eventHandlerConfig.isActive,
        createdAt: eventHandlerConfig.createdAt,
        updatedAt: eventHandlerConfig.updatedAt,
      })
      .from(eventHandlerConfig)
      .orderBy(asc(eventHandlerConfig.eventKey), asc(eventHandlerConfig.priority));

    return configs;
  } catch (error) {
    console.error("Error fetching event handler configs:", error);
    throw new Error("Failed to fetch event handler configs");
  }
}

/**
 * Fetch all event master entries (for dropdown/selection)
 */
export async function getEventKeysAction() {
  try {
    return await db
      .select({
        id: eventMaster.id,
        eventKey: eventMaster.eventKey,
        name: eventMaster.name,
        category: eventMaster.category,
        isActive: eventMaster.isActive,
      })
      .from(eventMaster)
      .orderBy(asc(eventMaster.eventKey));
  } catch (error) {
    console.error("Error fetching event keys:", error);
    throw new Error("Failed to fetch event keys");
  }
}

/**
 * Create or update an event handler config entry
 */
export async function upsertEventHandlerConfigAction(data: {
  id?: number;
  eventKey: string;
  handlerName: string;
  priority: number;
  config: Record<string, any>;
  isActive: boolean;
}) {
  try {
    const { id, ...rest } = data;

    if (id) {
      // Update
      await db
        .update(eventHandlerConfig)
        .set({
          ...rest,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(eventHandlerConfig.id, id));
    } else {
      // Insert
      await db.insert(eventHandlerConfig).values({
        eventKey: rest.eventKey,
        handlerName: rest.handlerName,
        priority: rest.priority,
        config: rest.config,
        isActive: rest.isActive,
      });
    }

    revalidatePath("/event-bus");
    return { success: true };
  } catch (error: any) {
    console.error("Error saving event handler config:", error);
    if (error?.code === '23505') {
      return { success: false, error: 'This event + handler combination already exists.' };
    }
    return { success: false, error: error.message || 'Failed to save' };
  }
}

/**
 * Delete an event handler config entry
 */
export async function deleteEventHandlerConfigAction(id: number) {
  try {
    await db.delete(eventHandlerConfig).where(eq(eventHandlerConfig.id, id));
    revalidatePath("/event-bus");
    return { success: true };
  } catch (error) {
    console.error("Error deleting event handler config:", error);
    throw new Error("Failed to delete event handler config");
  }
}

/**
 * Toggle active status of a handler config
 */
export async function toggleHandlerConfigAction(id: number, isActive: boolean) {
  try {
    await db
      .update(eventHandlerConfig)
      .set({ isActive, updatedAt: new Date().toISOString() })
      .where(eq(eventHandlerConfig.id, id));
    revalidatePath("/event-bus");
    return { success: true };
  } catch (error) {
    console.error("Error toggling handler config:", error);
    throw new Error("Failed to toggle handler config");
  }
}

/**
 * Bulk update priority order for handlers within an event
 */
export async function reorderHandlersAction(updates: { id: number; priority: number }[]) {
  try {
    for (const { id, priority } of updates) {
      await db
        .update(eventHandlerConfig)
        .set({ priority, updatedAt: new Date().toISOString() })
        .where(eq(eventHandlerConfig.id, id));
    }
    revalidatePath("/event-bus");
    return { success: true };
  } catch (error) {
    console.error("Error reordering handlers:", error);
    throw new Error("Failed to reorder handlers");
  }
}

/**
 * Get handler config summary — grouped by event
 */
export async function getEventBusSummaryAction() {
  try {
    const [configs, events] = await Promise.all([
      db.select().from(eventHandlerConfig).orderBy(asc(eventHandlerConfig.eventKey), asc(eventHandlerConfig.priority)),
      db.select().from(eventMaster).orderBy(asc(eventMaster.eventKey)),
    ]);

    // Group configs by event key
    const grouped = new Map<string, typeof configs>();
    for (const c of configs) {
      const existing = grouped.get(c.eventKey) || [];
      existing.push(c);
      grouped.set(c.eventKey, existing);
    }

    // Build summary
    const summary = events.map(event => ({
      ...event,
      handlers: grouped.get(event.eventKey) || [],
      activeHandlerCount: (grouped.get(event.eventKey) || []).filter(h => h.isActive).length,
      totalHandlerCount: (grouped.get(event.eventKey) || []).length,
    }));

    return {
      summary,
      totalEvents: events.length,
      totalConfigs: configs.length,
      activeConfigs: configs.filter(c => c.isActive).length,
    };
  } catch (error) {
    console.error("Error fetching event bus summary:", error);
    throw new Error("Failed to fetch event bus summary");
  }
}
