// In-memory OTP store. Singleton across HMR reloads by parking on globalThis.
// In production this would be Redis or another shared store.

type OtpRecord = { code: string; expiresAt: Date };

declare global {
  // eslint-disable-next-line no-var
  var __medhelp_otp_store__: Map<string, OtpRecord> | undefined;
}

if (!globalThis.__medhelp_otp_store__) {
  globalThis.__medhelp_otp_store__ = new Map<string, OtpRecord>();
}

export const otpStore: Map<string, OtpRecord> = globalThis.__medhelp_otp_store__;
