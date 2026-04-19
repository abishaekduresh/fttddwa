export const APP_NAME = "FTTDDWA";
export const APP_FULL_NAME = "Federation of Tamil Nadu Tent Dealers & Decorators Welfare Association";
export const MEMBERSHIP_ID_PREFIX = process.env.MEMBERSHIP_ID_PREFIX || "FTTD";

export const MEMBER_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
  EXPIRED: "EXPIRED",
} as const;

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  DATA_ENTRY: "DATA_ENTRY",
  VIEWER: "VIEWER",
} as const;

export const PERMISSIONS = {
  MEMBERS_CREATE: "members:create",
  MEMBERS_READ: "members:read",
  MEMBERS_UPDATE: "members:update",
  MEMBERS_DELETE: "members:delete",
  MEMBERS_EXPORT: "members:export",
  USERS_CREATE: "users:create",
  USERS_READ: "users:read",
  USERS_UPDATE: "users:update",
  USERS_DELETE: "users:delete",
  ROLES_READ: "roles:read",
  ROLES_MANAGE: "roles:manage",
  AUDIT_READ: "audit:read",
  DASHBOARD_READ: "dashboard:read",
  SETTINGS_MANAGE: "settings:manage",
} as const;

export const ASSOCIATION_POSITIONS = [
  "Chairman",
  "President",
  "Vice President",
  "Secretary",
  "Joint Secretary",
  "Treasurer",
  "Executive Member",
  "Member",
  "Other",
] as const;
