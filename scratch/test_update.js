const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const data = {
    name: "Tamil Nadu Tent Dealers Association",
    shortName: "TNTDA"
  };

  const settings = await prisma.associationSetting.upsert({
    where: { id: 1 },
    update: data,
    create: { ...data, id: 1 },
  });
  console.log('Updated Settings:', JSON.stringify(settings, null, 2));

  const verify = await prisma.associationSetting.findFirst({ where: { id: 1 } });
  console.log('Verified Settings:', JSON.stringify(verify, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
