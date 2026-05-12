import { z } from "zod/v4";

export const sendOtpSchema = z.object({
  phone: z
    .string()
    .min(9, "Phone number is too short")
    .max(15, "Phone number is too long"),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(9).max(15),
  code: z.string().length(4, "OTP must be 4 digits"),
});

export const setupPinSchema = z.object({
  pin: z
    .string()
    .length(4, "PIN must be 4 digits")
    .regex(/^\d{4}$/, "PIN must contain only digits"),
});

export const loginPinSchema = z.object({
  phone: z.string().min(9).max(15),
  pin: z.string().length(4),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
});
