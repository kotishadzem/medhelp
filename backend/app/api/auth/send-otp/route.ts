import { NextRequest } from "next/server";
import { sendOtpSchema, identifierKey } from "@/lib/validators/auth";
import { success, validationError, error } from "@/lib/responses";
import { otpStore } from "@/lib/otpStore";
import { sendOtpEmail } from "@/lib/mailer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = sendOtpSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const { phone, email } = parsed.data;
    const normalizedEmail = email?.toLowerCase();
    const key = identifierKey({ phone, email: normalizedEmail });

    const isDevOtp = process.env.OTP_DEV_MODE === "true";
    const hasMailer = !!process.env.RESEND_API_KEY;
    // For email we always send a fresh random code (so emailed code matches what's stored),
    // unless dev mode is on AND mailer isn't configured.
    const code =
      isDevOtp && !(normalizedEmail && hasMailer)
        ? "1234"
        : String(Math.floor(1000 + Math.random() * 9000));

    otpStore.set(key, {
      code,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    if (normalizedEmail) {
      try {
        await sendOtpEmail(normalizedEmail, code);
      } catch (err) {
        console.error("[send-otp] mailer failed", err);
        otpStore.delete(key);
        return error("Failed to send code by email", 500, "MAIL_FAILED");
      }
    } else if (isDevOtp) {
      console.log(`[DEV] OTP for ${key}: ${code}`);
    }
    // Real SMS integration would go here when phone is set and not in dev mode.

    return success({ message: "OTP sent successfully" });
  } catch {
    return error("Internal server error", 500);
  }
}
