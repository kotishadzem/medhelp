import { NextRequest } from "next/server";
import { success, error, notFound } from "@/lib/responses";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const { id } = await params;

    // Verify medication belongs to user
    const medication = await prisma.medication.findFirst({
      where: { id, userId: user.userId },
    });
    if (!medication) return notFound("Medication not found");

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    let dateFilter = {};
    if (date) {
      const startOfDay = new Date(date);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);
      dateFilter = { scheduledAt: { gte: startOfDay, lt: endOfDay } };
    }

    const intakes = await prisma.medicationIntake.findMany({
      where: { medicationId: id, ...dateFilter },
      orderBy: { scheduledAt: "asc" },
    });

    return success({ intakes });
  } catch {
    return error("Internal server error", 500);
  }
}
