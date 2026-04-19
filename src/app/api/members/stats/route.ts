import { NextRequest } from "next/server";
import { getMemberStats, getDistinctDistricts, getDistinctTaluks } from "@/lib/services/member.service";
import { ok, serverError } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type === "districts") {
      const districts = await getDistinctDistricts();
      return ok(districts);
    }

    if (type === "taluks") {
      const district = searchParams.get("district") || undefined;
      const taluks = await getDistinctTaluks(district);
      return ok(taluks);
    }

    const stats = await getMemberStats();
    return ok(stats);
  } catch {
    return serverError();
  }
}
