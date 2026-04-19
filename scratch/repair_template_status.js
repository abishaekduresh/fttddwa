const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Starting WhatsApp Template status repair...");
  
  // Update all templates that are not DELETED and are marked as ACTIVE in boolean terms
  const result = await prisma.whatsappTemplate.updateMany({
    where: {
      status: { not: 'DELETED' }
    },
    data: {
      status: 'ACTIVE'
    }
  });
  
  console.log(`Updated ${result.count} templates to ACTIVE status.`);

  // Also ensure Inactive templates (if any) are set properly
  const resultInactive = await prisma.whatsappTemplate.updateMany({
    where: {
      isActive: false,
      status: 'ACTIVE' // This might happen if we just ran the above update
    },
    data: {
      status: 'INACTIVE'
    }
  });

  console.log(`Refined ${resultInactive.count} templates to INACTIVE status based on isActive field.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
