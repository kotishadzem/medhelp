import { NextRequest } from "next/server";
import { createMedicationSchema } from "@/lib/validators/medications";
import { success, validationError, error } from "@/lib/responses";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const medications = await prisma.medication.findMany({
      where: {
        userId: user.userId,
        ...(status ? { status: status as "ACTIVE" | "COMPLETED" | "CANCELLED" | "PAUSED" } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { intakes: true } },
      },
    });

    return success({ medications });
  } catch {
    return error("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const body = await request.json();
    const parsed = createMedicationSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const { name, dosage, instructions, startDate, endDate, frequencyPerDay, timesOfDay } =
      parsed.data;

    if (timesOfDay.length !== frequencyPerDay) {
      return validationError(
        `timesOfDay must have exactly ${frequencyPerDay} entries to match frequencyPerDay`
      );
    }

    if (endDate <= startDate) {
      return validationError("endDate must be after startDate");
    }

    // Create medication
    const medication = await prisma.medication.create({
      data: {
        userId: user.userId,
        name,
        dosage,
        instructions,
        startDate,
        endDate,
        frequencyPerDay,
        timesOfDay,
      },
    });

    // Generate intake records for each day × each time
    const intakes: { medicationId: string; scheduledAt: Date }[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      for (const time of timesOfDay) {
        const [hours, minutes] = time.split(":").map(Number);
        const scheduledAt = new Date(current);
        scheduledAt.setHours(hours, minutes, 0, 0);
        intakes.push({ medicationId: medication.id, scheduledAt });
      }
      current.setDate(current.getDate() + 1);
    }

    if (intakes.length > 0) {
      await prisma.medicationIntake.createMany({ data: intakes });
    }

    const result = await prisma.medication.findUnique({
      where: { id: medication.id },
      include: { _count: { select: { intakes: true } } },
    });

    return success({ medication: result }, 201);
  } catch {
    return error("Internal server error", 500);
  }
}
