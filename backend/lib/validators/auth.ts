import { z } from "zod/v4";

const phoneSchema = z.string().min(7).max(20);
const emailSchema = z.string().email().max(254);

export const sendOtpSchema = z
  .object({
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
  })
  .refine((d) => !!d.phone || !!d.email, {
    message: "phone or email is required",
  });

export const verifyOtpSchema = z
  .object({
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    code: z.string().length(4, "OTP must be 4 digits"),
  })
  .refine((d) => !!d.phone || !!d.email, {
    message: "phone or email is required",
  });

export const setupPinSchema = z.object({
  pin: z
    .string()
    .length(4, "PIN must be 4 digits")
    .regex(/^\d{4}$/, "PIN must contain only digits"),
});

export const loginPinSchema = z
  .object({
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    pin: z.string().length(4),
  })
  .refine((d) => !!d.phone || !!d.email, {
    message: "phone or email is required",
  });

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
});

export function identifierKey(input: { phone?: string; email?: string }): string {
  if (input.phone) return `phone:${input.phone}`;
  if (input.email) return `email:${input.email.toLowerCase()}`;
  throw new Error("either phone or email must be provided");
}
