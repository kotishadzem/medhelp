import { NextRequest } from "next/server";
import { createFamilyLinkSchema } from "@/lib/validators/family";
import { success, validationError, error, notFound } from "@/lib/responses";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/family — list all my family links (both directions).
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const [outgoing, incoming] = await Promise.all([
      prisma.familyLink.findMany({
        where: { requesterId: user.userId },
        orderBy: { createdAt: "desc" },
        include: {
          target: {
            select: { id: true, phone: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.familyLink.findMany({
        where: { targetId: user.userId },
        orderBy: { createdAt: "desc" },
        include: {
          requester: {
            select: { id: true, phone: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    return success({ outgoing, incoming });
  } catch {
    return error("Internal server error", 500);
  }
}

// POST /api/family — request to follow a user's medications.
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const body = await request.json();
    const parsed = createFamilyLinkSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const { customName, phone, email } = parsed.data;
    const normalizedEmail = email?.toLowerCase();

    const target = phone
      ? await prisma.user.findUnique({ where: { phone } })
      : await prisma.user.findUnique({ where: { email: normalizedEmail! } });

    if (!target) {
      return notFound("ეს მომხმარებელი ვერ მოიძებნა");
    }
    if (target.id === user.userId) {
      return error("Cannot link to yourself", 400, "SELF_LINK");
    }

    const existing = await prisma.familyLink.findUnique({
      where: {
        requesterId_targetId: { requesterId: user.userId, targetId: target.id },
      },
    });
    if (existing) {
      return error("ეს მომხმარებელი უკვე დამატებულია", 409, "ALREADY_LINKED");
    }

    const link = await prisma.familyLink.create({
      data: {
        requesterId: user.userId,
        targetId: target.id,
        customName: customName.trim(),
      },
      include: {
        target: {
          select: { id: true, phone: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    return success({ link }, 201);
  } catch {
    return error("Internal server error", 500);
  }
}
