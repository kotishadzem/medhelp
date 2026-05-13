// In-memory OTP store. Singleton across HMR reloads by parking on globalThis.
// In production this would be Redis or another shared store.

type OtpRecord = { code: string; expiresAt: Date };

const KEY = "__medhelp_otp_store__";

declare global {
  // eslint-disable-next-line no-var
  var __medhelp_otp_store__: Map<string, OtpRecord> | undefined;
}

export const otpStore: Map<string, OtpRecord> =
  globalThis[KEY as keyof typeof globalThis] ??
  (globalThis[KEY as keyof typeof globalThis] = new Map<string, OtpRecord>());
