import { NextRequest } from "next/server";
import { sendOtpSchema, identifierKey } from "@/lib/validators/auth";
import { success, validationError, error } from "@/lib/responses";
import { otpStore } from "@/lib/otpStore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = sendOtpSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const key = identifierKey(parsed.data);
    const isDevMode = process.env.OTP_DEV_MODE === "true";
    const code = isDevMode ? "1234" : String(Math.floor(1000 + Math.random() * 9000));

    otpStore.set(key, {
      code,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    if (isDevMode) {
      console.log(`[DEV] OTP for ${key}: ${code}`);
    }

    return success({ message: "OTP sent successfully" });
  } catch {
    return error("Internal server error", 500);
  }
}
