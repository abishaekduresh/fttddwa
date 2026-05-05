import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const members = await prisma.$queryRaw`SELECT * FROM members WHERE id = 4`;
  console.log(JSON.stringify(members, null, 2));
  process.exit(0);
}

main();
