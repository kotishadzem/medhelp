import { z } from "zod/v4";

export const createFamilyLinkSchema = z
  .object({
    customName: z.string().min(1, "customName is required").max(100),
    phone: z.string().min(7).max(20).optional(),
    email: z.string().email().max(254).optional(),
  })
  .refine((d) => !!d.phone || !!d.email, {
    message: "phone or email is required",
  });

export const updateFamilyLinkSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"]),
});
