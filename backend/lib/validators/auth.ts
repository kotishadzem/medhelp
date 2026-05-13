import { z } from "zod/v4";

const phoneSchema = z.string().min(7).max(20);
const emailSchema = z.string().email().max(254);
const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(128, "Password too long");

export const registerSchema = z
  .object({
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    password: passwordSchema,
  })
  .refine((d) => !!d.phone || !!d.email, {
    message: "phone or email is required",
  });

export const loginSchema = z
  .object({
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    password: passwordSchema,
  })
  .refine((d) => !!d.phone || !!d.email, {
    message: "phone or email is required",
  });

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
});

// Kept for legacy /api/auth/identify and friends.
export const sendOtpSchema = z
  .object({
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
  })
  .refine((d) => !!d.phone || !!d.email, {
    message: "phone or email is required",
  });

export function identifierKey(input: { phone?: string; email?: string }): string {
  if (input.phone) return `phone:${input.phone}`;
  if (input.email) return `email:${input.email.toLowerCase()}`;
  throw new Error("either phone or email must be provided");
}
