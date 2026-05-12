import { NextRequest } from "next/server";
import { updateIntakeSchema } from "@/lib/validators/medications";
import { success, validationError, error, notFound } from "@/lib/responses";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string; intakeId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const { id, intakeId } = await params;

    // Verify medication belongs to user
    const medication = await prisma.medication.findFirst({
      where: { id, userId: user.userId },
    });
    if (!medication) return notFound("Medication not found");

    const intake = await prisma.medicationIntake.findFirst({
      where: { id: intakeId, medicationId: id },
    });
    if (!intake) return notFound("Intake record not found");

    const body = await request.json();
    const parsed = updateIntakeSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const updated = await prisma.medicationIntake.update({
      where: { id: intakeId },
      data: {
        status: parsed.data.status,
        takenAt: parsed.data.status === "TAKEN" ? new Date() : null,
      },
    });

    return success({ intake: updated });
  } catch {
    return error("Internal server error", 500);
  }
}
