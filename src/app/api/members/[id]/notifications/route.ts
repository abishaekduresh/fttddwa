import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, error, forbidden, notFound, serverError } from "@/lib/api/response";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId);
    const rows = await prisma.$queryRaw<Array<{ notifyBirthday: number | boolean; notifyWedding: number | boolean }>>`
      SELECT notifyBirthday, notifyWedding FROM members WHERE id = ${id} AND deletedAt IS NULL
    `;
    if (!rows.length) return notFound("Member not found");
    const row = rows[0];
    return ok({
      notifyBirthday: row.notifyBirthday === true || row.notifyBirthday === 1,
      notifyWedding: row.notifyWedding === true || row.notifyWedding === 1,
    });
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const role = req.headers.get("x-user-role");
    if (!["SUPER_ADMIN", "ADMIN", "DATA_ENTRY"].includes(role || "")) {
      return forbidden("Insufficient permissions");
    }

    const body = await req.json();
    const { notifyBirthday, notifyWedding } = body as { notifyBirthday?: boolean; notifyWedding?: boolean };

    if (notifyBirthday === undefined && notifyWedding === undefined) {
      return error("No fields to update", 400);
    }

    const { id: rawId } = await params;
    const id = parseInt(rawId);

    if (notifyBirthday !== undefined && notifyWedding !== undefined) {
      await prisma.$executeRaw`UPDATE members SET notifyBirthday = ${notifyBirthday}, notifyWedding = ${notifyWedding}, updatedAt = NOW() WHERE id = ${id}`;
    } else if (notifyBirthday !== undefined) {
      await prisma.$executeRaw`UPDATE members SET notifyBirthday = ${notifyBirthday}, updatedAt = NOW() WHERE id = ${id}`;
    } else {
      await prisma.$executeRaw`UPDATE members SET notifyWedding = ${notifyWedding}, updatedAt = NOW() WHERE id = ${id}`;
    }

    return ok({ notifyBirthday, notifyWedding }, "Notification settings updated");
  } catch {
    return serverError();
  }
}
