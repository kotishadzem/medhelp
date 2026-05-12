import { NextRequest } from "next/server";
import { updateMedicationSchema } from "@/lib/validators/medications";
import { success, validationError, error, notFound } from "@/lib/responses";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const { id } = await params;

    const medication = await prisma.medication.findFirst({
      where: { id, userId: user.userId },
      include: {
        intakes: { orderBy: { scheduledAt: "asc" } },
        _count: { select: { intakes: true } },
      },
    });

    if (!medication) return notFound("Medication not found");

    return success({ medication });
  } catch {
    return error("Internal server error", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const { id } = await params;

    const existing = await prisma.medication.findFirst({
      where: { id, userId: user.userId },
    });
    if (!existing) return notFound("Medication not found");

    const body = await request.json();
    const parsed = updateMedicationSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const medication = await prisma.medication.update({
      where: { id },
      data: parsed.data,
      include: { _count: { select: { intakes: true } } },
    });

    return success({ medication });
  } catch {
    return error("Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const { id } = await params;

    const existing = await prisma.medication.findFirst({
      where: { id, userId: user.userId },
    });
    if (!existing) return notFound("Medication not found");

    await prisma.medication.delete({ where: { id } });

    return success({ message: "Medication deleted" });
  } catch {
    return error("Internal server error", 500);
  }
}
