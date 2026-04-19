import { prisma } from "@/lib/prisma";

/**
 * Generates a unique user identifier in the format: USRYYXXXX
 * e.g., USR26001
 */
export async function generateUserUniqueId(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearSuffix = currentYear.toString().slice(-2); // e.g., "26"
  const prefix = `USR${yearSuffix}`;

  // Find the highest existing ID for this year
  const lastUser = await prisma.user.findFirst({
    where: {
      uniqueId: {
        startsWith: prefix,
      },
    },
    orderBy: {
      uniqueId: "desc",
    },
    select: {
      uniqueId: true,
    },
  });

  let nextNumber = 1;

  if (lastUser?.uniqueId) {
    // Extract the numeric part (everything after the prefix)
    const lastNumberStr = lastUser.uniqueId.replace(prefix, "");
    const lastNumber = parseInt(lastNumberStr, 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  // Pad the running number to at least 3 digits (e.g., 001)
  const runningNumberStr = nextNumber.toString().padStart(3, "0");

  return `${prefix}${runningNumberStr}`;
}
