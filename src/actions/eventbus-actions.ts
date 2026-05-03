'use server'

export async function getEventHandlerConfigsAction() {
  return [];
}

export async function getEventKeysAction() {
  return [];
}

export async function upsertEventHandlerConfigAction(data: any): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}

export async function deleteEventHandlerConfigAction(id: number): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}

export async function toggleHandlerConfigAction(id: number, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}

export async function reorderHandlersAction(updates: any[]): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}

export async function getEventBusSummaryAction() {
  return {
    summary: [],
    totalEvents: 0,
    totalConfigs: 0,
    activeConfigs: 0,
  };
}
