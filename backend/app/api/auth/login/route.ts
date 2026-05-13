import { NextRequest } from "next/server";
import { loginSchema } from "@/lib/validators/auth";
import { success, validationError, error } from "@/lib/responses";
import { prisma } from "@/lib/prisma";
import { generateTokenPair, saveRefreshToken, verifyPin as verifyPassword } from "@/lib/auth";

// POST /api/auth/login — phone OR email + password.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const { phone, password } = parsed.data;
    const email = parsed.data.email?.toLowerCase();

    const user = phone
      ? await prisma.user.findUnique({ where: { phone } })
      : await prisma.user.findUnique({ where: { email: email! } });
    if (!user || !user.pinHash) {
      return error("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const ok = await verifyPassword(password, user.pinHash);
    if (!ok) {
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
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch {
    return error("Internal server error", 500);
  }
}
