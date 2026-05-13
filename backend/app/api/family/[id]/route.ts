import { NextRequest } from "next/server";
import { updateFamilyLinkSchema } from "@/lib/validators/family";
import { success, validationError, error, notFound, unauthorized } from "@/lib/responses";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/family/[id] — accept/reject. Only the target can update.
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateFamilyLinkSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const link = await prisma.familyLink.findUnique({ where: { id } });
    if (!link) return notFound("Family link not found");
    if (link.targetId !== user.userId) return unauthorized("Only the target can respond");
    if (link.status !== "PENDING") {
      return error("Already responded", 400, "ALREADY_RESPONDED");
    }

    const updated = await prisma.familyLink.update({
      where: { id },
      data: { status: parsed.data.status, respondedAt: new Date() },
      include: {
        requester: {
          select: { id: true, phone: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    return success({ link: updated });
  } catch {
    return error("Internal server error", 500);
  }
}

// DELETE /api/family/[id] — either side can remove.
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const { id } = await params;
    const link = await prisma.familyLink.findUnique({ where: { id } });
    if (!link) return notFound("Family link not found");
    if (link.requesterId !== user.userId && link.targetId !== user.userId) {
      return unauthorized("Not a member of this link");
    }

    await prisma.familyLink.delete({ where: { id } });
    return success({ message: "Removed" });
  } catch {
    return error("Internal server error", 500);
  }
}
