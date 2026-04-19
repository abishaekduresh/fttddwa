import { prisma } from "@/lib/prisma";

import { DISTRICT_RTO_CODES } from "@/constants/districts";

export async function generateMembershipId(district?: string, taluk?: string): Promise<string> {
  // Get prefix from district RTO code
  const districtCode = district ? DISTRICT_RTO_CODES[district] : null;
  const prefix = districtCode || process.env.MEMBERSHIP_ID_PREFIX || "FTTD";

  // Get the highest existing ID for this prefix
  const latest = await prisma.member.findFirst({
    where: { membershipId: { startsWith: prefix } },
    orderBy: { membershipId: "desc" },
  });

  let sequence = 1;
  if (latest?.membershipId) {
    // Extract numeric part after prefix
    const reg = new RegExp(`^${prefix}(\\d+)$`);
    const match = latest.membershipId.match(reg);
    if (match && match[1]) {
      sequence = parseInt(match[1], 10) + 1;
    } else {
      // Fallback: try to just parse the last digits if regex fails
      const numPart = parseInt(latest.membershipId.replace(/^\D+/g, ""), 10);
      if (!isNaN(numPart)) sequence = numPart + 1;
    }
  }

  const padded = sequence.toString().padStart(5, "0");
  return `${prefix}${padded}`;
}

export function formatMembershipId(id: string): string {
  return id.toUpperCase();
}
