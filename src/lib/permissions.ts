import { eq, and, SQL, Column } from "drizzle-orm"

// Types matching Schema
export type ScopeType = 'GLOBAL' | 'STATE' | 'DISTRICT' | 'CITY' | 'INDIVIDUAL'

export interface UserScopeContext {
    userId: number
    roleId: number
    type: ScopeType
    levelId?: number
    entityId?: number | string // Could be state name or ID
}

/**
 * Helper to determine the scope of the current user.
 * In a real app, this would query `userTypeEntity` or `user_scope_mapping`.
 * For now, we mock/infer checks.
 */
export async function getUserScope(userId: number): Promise<UserScopeContext> {
    // TODO: Fetch from DB using userId
    // This is a placeholder implementation
    return {
        userId,
        roleId: 1, // Assume Admin for now
        type: 'GLOBAL'
    }
}

/**
 * Applies scope filters to a Drizzle query.
 * 
 * Usage:
 * const whereClause = applyScopeFilter(userScope, retailers.state, retailers.userId)
 */
export function applyScopeFilter(
    scope: UserScopeContext,
    locationColumn?: Column,
    userColumn?: Column
) {
    if (scope.type === 'GLOBAL') {
        return undefined // No filter
    }

    const filters: SQL[] = []

    if (scope.type === 'STATE' && locationColumn) {
        // filters.push(eq(locationColumn, scope.entityId))
    }

    if (scope.type === 'INDIVIDUAL' && userColumn) {
        filters.push(eq(userColumn, scope.userId))
    }

    return filters.length > 0 ? and(...filters) : undefined
}
