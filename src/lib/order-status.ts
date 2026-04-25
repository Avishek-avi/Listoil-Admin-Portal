// Shared order/redemption status transition helpers
// Used by both server actions and client components

export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
    processing: ['confirmed', 'cancelled'],
    confirmed: ['shipped', 'cancelled'],
    shipped: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
};

export const AMAZON_STATUS_TO_REDEMPTION: Record<string, number> = {
    'processing': 1, // Pending
    'confirmed': 6,  // Processing
    'shipped': 6,    // Still Processing
    'delivered': 5,  // Completed
    'cancelled': 3,  // Rejected
};

// export const PHYSICAL_STATUS_TRANSITIONS: Record<string, string[]> = {
//     PENDING: ['APPROVED', 'REJECTED'],
//     APPROVED: ['SHIPPED'],
//     SHIPPED: ['DELIVERED'],
//     DELIVERED: [],
//     REJECTED: [],
// };

export function getOrderStatusTransitions(currentStatus: string): string[] {
    return ORDER_STATUS_TRANSITIONS[currentStatus?.toLowerCase()] || [];
}

// export function getPhysicalStatusTransitions(currentStatus: string): string[] {
//     return PHYSICAL_STATUS_TRANSITIONS[currentStatus?.toUpperCase()] || [];
// }
