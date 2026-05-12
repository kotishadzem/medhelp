import { NextRequest } from "next/server";
import { success, error } from "@/lib/responses";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    // Get today's date range
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const intakes = await prisma.medicationIntake.findMany({
      where: {
        medication: { userId: user.userId },
        scheduledAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      include: {
        medication: {
          select: {
            id: true,
            name: true,
            dosage: true,
            instructions: true,
            status: true,
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    const yyyy = startOfDay.getFullYear();
    const mm = String(startOfDay.getMonth() + 1).padStart(2, "0");
    const dd = String(startOfDay.getDate()).padStart(2, "0");
    return success({ date: `${yyyy}-${mm}-${dd}`, intakes });
  } catch {
    return error("Internal server error", 500);
  }
}
