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

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWindow = new Date(startOfDay);
    endOfWindow.setDate(endOfWindow.getDate() + days);

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

    const yyyy = startOfDay.getFullYear();
    const mm = String(startOfDay.getMonth() + 1).padStart(2, "0");
    const dd = String(startOfDay.getDate()).padStart(2, "0");
    return success({ date: `${yyyy}-${mm}-${dd}`, days, intakes });
  } catch {
    return error("Internal server error", 500);
  }
}
