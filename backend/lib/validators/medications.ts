import { z } from "zod/v4";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createMedicationSchema = z.object({
  name: z.string().min(1, "Medication name is required").max(200),
  dosage: z.string().min(1, "Dosage is required").max(100),
  instructions: z.string().max(500).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  frequencyPerDay: z.number().int().min(1).max(10),
  timesOfDay: z
    .array(z.string().regex(timeRegex, "Time must be in HH:MM format"))
    .min(1, "At least one time is required"),
  forUserId: z.string().optional(),
});

export const updateMedicationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  dosage: z.string().min(1).max(100).optional(),
  instructions: z.string().max(500).nullable().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED", "PAUSED"]).optional(),
});

export const updateIntakeSchema = z.object({
  status: z.enum(["TAKEN", "MISSED", "SKIPPED"]),
});
