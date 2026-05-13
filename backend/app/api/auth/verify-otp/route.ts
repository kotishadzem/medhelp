import { NextRequest } from "next/server";
import { verifyOtpSchema, identifierKey } from "@/lib/validators/auth";
import { success, validationError, error } from "@/lib/responses";
import { prisma } from "@/lib/prisma";
import { generateTokenPair, saveRefreshToken } from "@/lib/auth";
import { otpStore } from "@/lib/otpStore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const { code, phone, email } = parsed.data;
    const normalizedEmail = email?.toLowerCase();
    const key = identifierKey({ phone, email: normalizedEmail });

    const storedOtp = otpStore.get(key);
    if (!storedOtp) {
      return error("OTP not found. Please request a new one.", 400, "OTP_NOT_FOUND");
    }
    if (storedOtp.expiresAt < new Date()) {
      otpStore.delete(key);
      return error("OTP expired. Please request a new one.", 400, "OTP_EXPIRED");
    }
    if (storedOtp.code !== code) {
      return error("Invalid OTP code", 400, "OTP_INVALID");
    }

    otpStore.delete(key);

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
