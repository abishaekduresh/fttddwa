const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Starting Orphaned WhatsApp Template clean-up...");
  
  // 1. Get all valid vendor IDs
  const vendors = await prisma.whatsappVendor.findMany({ select: { id: true } });
  const validVendorIds = vendors.map(v => v.id);
  console.log(`Found ${validVendorIds.length} valid vendors.`);

  // 2. Find templates with invalid vendor IDs
  const orphanedTemplates = await prisma.whatsappTemplate.findMany({
    where: {
      vendorId: { notIn: validVendorIds }
    }
  });

  console.log(`Found ${orphanedTemplates.length} orphaned templates.`);

  if (orphanedTemplates.length > 0) {
    const orphanedIds = orphanedTemplates.map(t => t.id);
    const result = await prisma.whatsappTemplate.updateMany({
      where: {
        id: { in: orphanedIds }
      },
      data: {
        status: 'DELETED',
        isActive: false
      }
    });
    console.log(`Successfully marked ${result.count} orphaned templates as DELETED.`);
  } else {
    console.log("No orphaned templates found.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
