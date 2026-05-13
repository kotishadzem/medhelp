import { NextRequest } from "next/server";
import { sendOtpSchema } from "@/lib/validators/auth";
import { success, validationError, error } from "@/lib/responses";
import { prisma } from "@/lib/prisma";
import { generateTokenPair, saveRefreshToken } from "@/lib/auth";

// OTP-less registration / login by phone or email.
// Used while OTP is disabled. Creates the user if it doesn't exist,
// returns a fresh token pair, and signals whether a PIN is already set.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = sendOtpSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const { phone } = parsed.data;
    const normalizedEmail = parsed.data.email?.toLowerCase();

    let user = phone
      ? await prisma.user.findUnique({ where: { phone } })
      : await prisma.user.findUnique({ where: { email: normalizedEmail! } });

    let isNewUser = false;
    if (!user) {
      user = await prisma.user.create({
        data: phone ? { phone } : { email: normalizedEmail! },
      });
      isNewUser = true;
    }

    const { accessToken, refreshToken } = generateTokenPair(user.id, user.role);
    await saveRefreshToken(user.id, refreshToken);

    return success({
      accessToken,
      refreshToken,
      isNewUser,
      hasPinSet: !!user.pinHash,
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
