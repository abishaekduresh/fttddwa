const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding Association Management permission...');

  // 1. Create Permission
  const permission = await prisma.permission.upsert({
    where: { name: 'association:manage' },
    update: {},
    create: {
      name: 'association:manage',
      displayName: 'Manage Association Settings',
      resource: 'association',
      action: 'manage',
    },
  });

  console.log('Permission created:', permission.name);

  // 2. Identify Roles
  const roles = await prisma.role.findMany({
    where: {
      name: { in: ['SUPER_ADMIN', 'ADMIN'] }
    }
  });

  // 3. Link permission to roles
  for (const role of roles) {
    const link = await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permission.id,
        }
      },
      update: {},
      create: {
        roleId: role.id,
        permissionId: permission.id,
      }
    });
    console.log(`Linked to role: ${role.name}`);
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
