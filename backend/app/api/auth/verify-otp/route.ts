import { NextRequest } from "next/server";
import { verifyOtpSchema } from "@/lib/validators/auth";
import { success, validationError, error } from "@/lib/responses";
import { prisma } from "@/lib/prisma";
import { generateTokenPair, saveRefreshToken } from "@/lib/auth";
import { otpStore } from "../send-otp/route";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const { phone, code } = parsed.data;

    // Verify OTP
    const storedOtp = otpStore.get(phone);
    if (!storedOtp) {
      return error("OTP not found. Please request a new one.", 400, "OTP_NOT_FOUND");
    }
    if (storedOtp.expiresAt < new Date()) {
      otpStore.delete(phone);
      return error("OTP expired. Please request a new one.", 400, "OTP_EXPIRED");
    }
    if (storedOtp.code !== code) {
      return error("Invalid OTP code", 400, "OTP_INVALID");
    }

    // OTP valid — remove it
    otpStore.delete(phone);

    // Find or create user
    let user = await prisma.user.findUnique({ where: { phone } });
    let isNewUser = false;

    if (!user) {
      user = await prisma.user.create({ data: { phone } });
      isNewUser = true;
    }

    // Generate tokens
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
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch {
    return error("Internal server error", 500);
  }
}
