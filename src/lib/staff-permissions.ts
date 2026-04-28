/**
 * Staff permission levels, resolved from hardcoded username lists.
 *
 * - superadmin: full system access (airlines, airports, staff, customers, all operations)
 * - admin: cross-airline operations (flights, fleet, passengers, reports for any airline)
 * - staff: own-airline operations only
 */

export type StaffPermission = "superadmin" | "admin" | "staff";

const SUPERADMIN_USERNAMES: ReadonlyArray<string> = ["mrivera"];

const ADMIN_USERNAMES: ReadonlyArray<string> = [
  // add admin usernames here
];

export function getStaffPermission(username: string): StaffPermission {
  if (SUPERADMIN_USERNAMES.includes(username)) return "superadmin";
  if (ADMIN_USERNAMES.includes(username)) return "admin";
  return "staff";
}

export function isSuperadmin(permission: StaffPermission) {
  return permission === "superadmin";
}

export function isAdminOrAbove(permission: StaffPermission) {
  return permission === "superadmin" || permission === "admin";
}

export function canAccessAllOperations(permission: StaffPermission) {
  return isAdminOrAbove(permission);
}

export function getOperationalAirlineScope(
  permission: StaffPermission,
  airlineName: string | null,
) {
  if (canAccessAllOperations(permission)) return null;
  return airlineName;
}

export function canManageOperationalAirline(
  permission: StaffPermission,
  staffAirlineName: string | null,
  airlineName: string,
) {
  if (canAccessAllOperations(permission)) return true;
  return staffAirlineName === airlineName;
}
