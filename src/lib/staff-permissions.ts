/**
 * Staff permission levels, resolved from hardcoded username lists.
 *
 * - superadmin: full system access (airlines, airports, staff, customers, all operations)
 * - admin: cross-airline operations (flights, fleet, passengers, reports for any airline)
 * - staff: own-airline operations only
 */

export type StaffPermission = "superadmin" | "admin" | "staff"

const SUPERADMIN_USERNAMES: ReadonlyArray<string> = [
  "mrivera",
]

const ADMIN_USERNAMES: ReadonlyArray<string> = [
  // add admin usernames here
]

export function getStaffPermission(username: string): StaffPermission {
  if (SUPERADMIN_USERNAMES.includes(username)) return "superadmin"
  if (ADMIN_USERNAMES.includes(username)) return "admin"
  return "staff"
}

export function isSuperadmin(permission: StaffPermission) {
  return permission === "superadmin"
}

export function isAdminOrAbove(permission: StaffPermission) {
  return permission === "superadmin" || permission === "admin"
}
