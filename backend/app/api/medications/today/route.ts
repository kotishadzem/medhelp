import { NextRequest } from "next/server";
import { success, error } from "@/lib/responses";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const days = Math.min(7, Math.max(1, Number(searchParams.get("days") ?? "1")));

    // Window boundaries are UTC midnights — `scheduledAt` is stored as
    // wall-clock UTC by the create route, so the comparison stays consistent
    // regardless of the server-process timezone.
    const now = new Date();
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const endOfWindow = new Date(startOfDay);
    endOfWindow.setUTCDate(endOfWindow.getUTCDate() + days);

    const intakes = await prisma.medicationIntake.findMany({
      where: {
        medication: { userId: user.userId },
        scheduledAt: { gte: startOfDay, lt: endOfWindow },
      },
      include: {
        medication: {
          select: {
            id: true,
            name: true,
            dosage: true,
            instructions: true,
            status: true,
            type: true,
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    const yyyy = startOfDay.getUTCFullYear();
    const mm = String(startOfDay.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(startOfDay.getUTCDate()).padStart(2, "0");
    return success({ date: `${yyyy}-${mm}-${dd}`, days, intakes });
  } catch {
    return error("Internal server error", 500);
  }
}
