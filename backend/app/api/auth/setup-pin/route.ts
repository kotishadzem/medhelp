import { NextRequest } from "next/server";
import { setupPinSchema } from "@/lib/validators/auth";
import { success, validationError, error } from "@/lib/responses";
import { prisma } from "@/lib/prisma";
import { requireAuth, hashPin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const body = await request.json();
    const parsed = setupPinSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const pinHash = await hashPin(parsed.data.pin);

    await prisma.user.update({
      where: { id: user.userId },
      data: { pinHash },
    });

    return success({ message: "PIN set successfully" });
  } catch {
    return error("Internal server error", 500);
  }
}
