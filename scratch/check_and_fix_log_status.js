const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Checking for invalid status values in whatsapp_logs...');

  try {
    // 1. Get distinct statuses using raw SQL
    const statuses = await prisma.$queryRawUnsafe('SELECT DISTINCT status FROM whatsapp_logs');
    console.log('Current distinct statuses:', statuses);

    // 2. Look for rows where status is empty or invalid
    const invalidRows = await prisma.$queryRawUnsafe("SELECT id, status FROM whatsapp_logs WHERE status = '' OR status IS NULL");
    console.log(`Found ${invalidRows.length} invalid rows.`);

    if (invalidRows.length > 0) {
      console.log('Repairing invalid rows to "failed"...');
      const updated = await prisma.$executeRawUnsafe("UPDATE whatsapp_logs SET status = 'failed' WHERE status = '' OR status IS NULL");
      console.log(`Successfully updated ${updated} rows.`);
    }

    // 3. Check for the 'read' status specifically if it exists
    const readRows = await prisma.$queryRawUnsafe("SELECT COUNT(*) as count FROM whatsapp_logs WHERE status = 'read'");
    console.log('Rows with "read" status:', readRows);

  } catch (err) {
    console.error('Error during DB check:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
