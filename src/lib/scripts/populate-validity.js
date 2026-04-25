
const { PrismaClient } = require('@prisma/client'); // eslint-disable-line @typescript-eslint/no-require-imports
const prisma = new PrismaClient();

async function run() {
  try {
    const setting = await prisma.associationSetting.findUnique({ where: { id: 1 } });
    let validityYears = 2;
    if (setting && setting.idCardSettings) {
      let cs = setting.idCardSettings;
      if (typeof cs === 'string') cs = JSON.parse(cs);
      validityYears = Number(cs.validityYears) || 2;
    }

    const members = await prisma.member.findMany({
      where: { validUntil: null }
    });

    console.log(`Populating validity for ${members.length} members using ${validityYears} years duration...`);

    for (const m of members) {
      const joined = new Date(m.joinedAt);
      // Let's use the simple logic: Dec 31 of the target year
      const validUntil = new Date(joined.getFullYear() + validityYears, 11, 31, 23, 59, 59);
      await prisma.member.update({
        where: { id: m.id },
        data: { validUntil }
      });
    }

    console.log('Done.');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

run();
