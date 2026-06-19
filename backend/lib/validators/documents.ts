import { z } from "zod/v4";

export const DOCUMENT_TYPES = [
  "FORM_100",
  "PRESCRIPTION",
  "BLOOD_TEST",
  "CT_SCAN",
  "MRI_SCAN",
  "ULTRASOUND",
  "ECG",
  "LAB_ANALYSIS",
  "OTHER",
] as const;

export const documentTypeSchema = z.enum(DOCUMENT_TYPES);

export const createDocumentMetadataSchema = z.object({
  documentType: documentTypeSchema,
  customType: z.string().max(120).optional(),
  clinic: z.string().min(1, "Clinic is required").max(200),
  studyDate: z.coerce.date(),
  notes: z.string().max(2000).optional(),
  forUserId: z.string().optional(),
});

export const updateDocumentSchema = z.object({
  documentType: documentTypeSchema.optional(),
  customType: z.string().max(120).nullable().optional(),
  clinic: z.string().min(1).max(200).optional(),
  studyDate: z.coerce.date().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const listDocumentsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  clinic: z.string().optional(),
  type: documentTypeSchema.optional(),
  q: z.string().max(200).optional(),
  forUserId: z.string().optional(),
});

export type CreateDocumentMetadata = z.infer<typeof createDocumentMetadataSchema>;
export type UpdateDocumentMetadata = z.infer<typeof updateDocumentSchema>;
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;
