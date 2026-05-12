import { NextRequest } from "next/server";
import { sendOtpSchema } from "@/lib/validators/auth";
import { success, validationError, error } from "@/lib/responses";

// In-memory OTP store for dev. In production, use Redis or SMS service.
const otpStore = new Map<string, { code: string; expiresAt: Date }>();

export { otpStore };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = sendOtpSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const { phone } = parsed.data;
    const isDevMode = process.env.OTP_DEV_MODE === "true";
    const code = isDevMode ? "1234" : String(Math.floor(1000 + Math.random() * 9000));

    otpStore.set(phone, {
      code,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });

    // In production: send SMS here
    if (isDevMode) {
      console.log(`[DEV] OTP for ${phone}: ${code}`);
    }

    return success({ message: "OTP sent successfully" });
  } catch {
    return error("Internal server error", 500);
  }
}
