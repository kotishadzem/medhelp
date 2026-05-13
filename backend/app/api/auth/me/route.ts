import { NextRequest } from "next/server";
import { updateProfileSchema } from "@/lib/validators/auth";
import { success, validationError, error, notFound } from "@/lib/responses";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { user: authUser, error: authError } = requireAuth(request);
    if (authError) return authError;

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        pinHash: true,
      },
    });

    if (!user) return notFound("User not found");

    const { pinHash, ...publicUser } = user;
    return success({ user: { ...publicUser, hasPin: !!pinHash } });
  } catch {
    return error("Internal server error", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user: authUser, error: authError } = requireAuth(request);
    if (authError) return authError;

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const user = await prisma.user.update({
      where: { id: authUser.userId },
      data: parsed.data,
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        pinHash: true,
      },
    });

    const { pinHash, ...publicUser } = user;
    return success({ user: { ...publicUser, hasPin: !!pinHash } });
  } catch {
    return error("Internal server error", 500);
  }
}
