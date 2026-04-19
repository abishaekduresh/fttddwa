import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ROLES = [
  {
    name: "SUPER_ADMIN",
    displayName: "Super Admin",
    description: "Full access to all features and settings",
    isSystem: true,
  },
  {
    name: "ADMIN",
    displayName: "Admin",
    description: "Manage members and users",
    isSystem: true,
  },
  {
    name: "DATA_ENTRY",
    displayName: "Data Entry Operator",
    description: "Add and edit member records",
    isSystem: true,
  },
  {
    name: "VIEWER",
    displayName: "Viewer",
    description: "Read-only access to member data",
    isSystem: true,
  },
];

const PERMISSIONS = [
  // Members
  { name: "members:create", displayName: "Create Members", resource: "members", action: "create" },
  { name: "members:read", displayName: "View Members", resource: "members", action: "read" },
  { name: "members:update", displayName: "Edit Members", resource: "members", action: "update" },
  { name: "members:delete", displayName: "Delete Members", resource: "members", action: "delete" },
  { name: "members:export", displayName: "Export Members", resource: "members", action: "export" },
  // Users
  { name: "users:create", displayName: "Create Users", resource: "users", action: "create" },
  { name: "users:read", displayName: "View Users", resource: "users", action: "read" },
  { name: "users:update", displayName: "Edit Users", resource: "users", action: "update" },
  { name: "users:delete", displayName: "Delete Users", resource: "users", action: "delete" },
  // Roles
  { name: "roles:read", displayName: "View Roles", resource: "roles", action: "read" },
  { name: "roles:manage", displayName: "Manage Roles", resource: "roles", action: "manage" },
  // Audit
  { name: "audit:read", displayName: "View Audit Logs", resource: "audit", action: "read" },
  // Dashboard
  { name: "dashboard:read", displayName: "View Dashboard", resource: "dashboard", action: "read" },
  // Settings
  { name: "settings:manage", displayName: "Manage Settings", resource: "settings", action: "manage" },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: PERMISSIONS.map((p) => p.name),
  ADMIN: [
    "members:create", "members:read", "members:update", "members:delete", "members:export",
    "users:create", "users:read", "users:update",
    "roles:read",
    "audit:read",
    "dashboard:read",
  ],
  DATA_ENTRY: [
    "members:create", "members:read", "members:update",
    "dashboard:read",
  ],
  VIEWER: [
    "members:read",
    "dashboard:read",
  ],
};

async function main() {
  console.log("🌱 Seeding database...");

  // Create permissions
  const permissionMap: Record<string, number> = {};
  for (const perm of PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
    permissionMap[perm.name] = created.id;
  }
  console.log(`✅ Created ${PERMISSIONS.length} permissions`);

  // Create roles
  const roleMap: Record<string, number> = {};
  for (const role of ROLES) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      update: { displayName: role.displayName, description: role.description },
      create: role,
    });
    roleMap[role.name] = created.id;

    // Assign permissions to role
    const permsForRole = ROLE_PERMISSIONS[role.name] || [];
    for (const permName of permsForRole) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: created.id,
            permissionId: permissionMap[permName],
          },
        },
        update: {},
        create: {
          roleId: created.id,
          permissionId: permissionMap[permName],
        },
      });
    }
  }
  console.log(`✅ Created ${ROLES.length} roles with permissions`);

  // Create super admin user
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@fttddwa.org";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@123456";
  const adminName = process.env.SEED_ADMIN_NAME || "Super Admin";

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const superAdminRoleId = roleMap["SUPER_ADMIN"];

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash,
      roleId: superAdminRoleId,
      isActive: true,
    },
  });

  console.log(`✅ Created super admin: ${adminEmail}`);
  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📋 Login credentials:");
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log("\n⚠️  Change the password immediately after first login!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
