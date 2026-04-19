const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Migrating unique IDs for existing users...');

  // Get all users without a uniqueId
  const users = await prisma.user.findMany({
    where: {
      uniqueId: null,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  console.log(`Found ${users.length} users to update.`);

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const year = new Date(user.createdAt).getFullYear().toString().slice(-2);
    const prefix = `USR${year}`;
    
    // We need to count how many users for this specific year already have an ID 
    // to avoid collisions, but since we are doing a bulk update for NULLs, 
    // we can just keep a counter for the current year in this loop.
    
    // Find highest running number for this year so far
    const lastInYear = await prisma.user.findFirst({
      where: {
        uniqueId: { startsWith: prefix },
      },
      orderBy: {
        uniqueId: 'desc',
      },
    });

    let nextNum = 1;
    if (lastInYear?.uniqueId) {
      const lastNum = parseInt(lastInYear.uniqueId.replace(prefix, ''), 10);
      nextNum = lastNum + 1;
    }

    const uniqueId = `${prefix}${nextNum.toString().padStart(3, '0')}`;
    
    await prisma.user.update({
      where: { id: user.id },
      data: { uniqueId },
    });

    console.log(`Updated user ${user.email} -> ${uniqueId}`);
  }

  console.log('Migration complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
