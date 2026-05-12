import { NextRequest } from "next/server";
import { loginPinSchema } from "@/lib/validators/auth";
import { success, validationError, error } from "@/lib/responses";
import { prisma } from "@/lib/prisma";
import { verifyPin, generateTokenPair, saveRefreshToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginPinSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const { phone, pin } = parsed.data;

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || !user.pinHash) {
      return error("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const isPinValid = await verifyPin(pin, user.pinHash);
    if (!isPinValid) {
      return error("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const { accessToken, refreshToken } = generateTokenPair(user.id, user.role);
    await saveRefreshToken(user.id, refreshToken);

    return success({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch {
    return error("Internal server error", 500);
  }
}
