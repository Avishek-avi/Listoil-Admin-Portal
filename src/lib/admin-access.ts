// Levels (by levelName in userTypeLevelMaster) that are permitted to log into
// the admin portal. Centralized here so it can later be replaced by a DB-driven
// `can_login_admin` flag without touching auth.ts again.
//
// TODO: migrate to a `can_login_admin BOOLEAN` column on user_type_level_master
// and read the list at runtime. Tracked in IMPLEMENTATION_PLAN.md Phase 2.

export const ADMIN_PORTAL_LEVEL_NAMES: readonly string[] = [
    "Master Admin",
    "Admin",
    "System Admin",
    "Call Centre",
    "Field Management",
] as const;

export function canAccessAdminPortal(levelName: string | null | undefined): boolean {
    if (!levelName) return false;
    return ADMIN_PORTAL_LEVEL_NAMES.includes(levelName);
}
