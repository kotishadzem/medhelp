import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { error, success } from "@/lib/responses";

const MAX_CLINICS = 100;

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const rows = await prisma.medicalDocument.groupBy({
      by: ["clinic"],
      where: { userId: user.userId },
      _count: { clinic: true },
      orderBy: { _count: { clinic: "desc" } },
      take: MAX_CLINICS,
    });

    const clinics = rows.map((row) => row.clinic);
    return success({ clinics });
  } catch {
    return error("Internal server error", 500);
  }
}
