import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { canAccessOwner } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { error, success } from "@/lib/responses";

const MAX_CLINICS = 100;

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const forUserId = new URL(request.url).searchParams.get("forUserId");
    const ownerId = forUserId ?? user.userId;

    if (forUserId && forUserId !== user.userId) {
      const allowed = await canAccessOwner(user.userId, forUserId);
      if (!allowed) {
        return error(
          "Not authorized to view documents for this user",
          403,
          "NOT_FAMILY"
        );
      }
    }

    const rows = await prisma.medicalDocument.groupBy({
      by: ["clinic"],
      where: { userId: ownerId },
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
