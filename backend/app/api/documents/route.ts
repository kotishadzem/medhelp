import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { error, success, validationError } from "@/lib/responses";
import {
  createDocumentMetadataSchema,
  documentTypeSchema,
  listDocumentsQuerySchema,
} from "@/lib/validators/documents";
import {
  deleteDocumentFile,
  getExtensionForMime,
  isAllowedMime,
  MAX_FILE_SIZE_BYTES,
  saveDocumentFile,
} from "@/lib/storage/documents";
import type { Prisma } from "@/app/generated/prisma/client";

const FILE_FIELD = "file";
const METADATA_FIELD = "metadata";

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const queryInput: Record<string, string> = {};
    for (const key of ["from", "to", "clinic", "type", "q", "forUserId"]) {
      const value = searchParams.get(key);
      if (value) queryInput[key] = value;
    }

    const parsed = listDocumentsQuerySchema.safeParse(queryInput);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const { from, to, clinic, type, q, forUserId } = parsed.data;
    const ownerId = forUserId ?? user.userId;

    if (forUserId && forUserId !== user.userId) {
      const link = await prisma.familyLink.findUnique({
        where: {
          requesterId_targetId: {
            requesterId: user.userId,
            targetId: forUserId,
          },
        },
      });
      if (!link || link.status !== "ACCEPTED") {
        return error("Not authorized to view documents for this user", 403, "NOT_FAMILY");
      }
    }

    const where: Prisma.MedicalDocumentWhereInput = { userId: ownerId };
    if (from || to) {
      where.studyDate = {};
      if (from) where.studyDate.gte = from;
      if (to) where.studyDate.lte = to;
    }
    if (clinic) where.clinic = clinic;
    if (type) where.documentType = type;
    if (q) {
      where.OR = [
        { fileName: { contains: q, mode: "insensitive" } },
        { customType: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
        { clinic: { contains: q, mode: "insensitive" } },
      ];
    }

    const documents = await prisma.medicalDocument.findMany({
      where,
      orderBy: { studyDate: "desc" },
    });

    return success({ documents });
  } catch {
    return error("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  let savedRelativePath: string | null = null;
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const formData = await request.formData();
    const filePart = formData.get(FILE_FIELD);
    const metadataPart = formData.get(METADATA_FIELD);

    if (!(filePart instanceof Blob)) {
      return validationError("file field is required");
    }
    if (typeof metadataPart !== "string") {
      return validationError("metadata field is required");
    }

    let metadataJson: unknown;
    try {
      metadataJson = JSON.parse(metadataPart);
    } catch {
      return validationError("metadata must be valid JSON");
    }

    const parsed = createDocumentMetadataSchema.safeParse(metadataJson);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const { documentType, customType, clinic, studyDate, notes, forUserId } =
      parsed.data;

    const mimeType = (filePart.type || "application/octet-stream").toLowerCase();
    if (!isAllowedMime(mimeType)) {
      return validationError(
        "Unsupported file type — allowed: PDF, JPG, PNG, HEIC"
      );
    }
    if (filePart.size > MAX_FILE_SIZE_BYTES) {
      return validationError("File exceeds 15 MB limit");
    }
    if (filePart.size === 0) {
      return validationError("File is empty");
    }

    const extension = getExtensionForMime(mimeType);
    if (!extension) {
      return validationError("Unsupported file extension");
    }

    let ownerId = user.userId;
    if (forUserId && forUserId !== user.userId) {
      const link = await prisma.familyLink.findUnique({
        where: {
          requesterId_targetId: {
            requesterId: user.userId,
            targetId: forUserId,
          },
        },
      });
      if (!link || link.status !== "ACCEPTED") {
        return error(
          "Not authorized to add a document for this user",
          403,
          "NOT_FAMILY"
        );
      }
      ownerId = forUserId;
    }

    const docId = randomUUID();
    const arrayBuffer = await filePart.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const originalName =
      filePart instanceof File && filePart.name ? filePart.name : `document.${extension}`;

    savedRelativePath = await saveDocumentFile(ownerId, docId, extension, buffer);

    const document = await prisma.medicalDocument.create({
      data: {
        id: docId,
        userId: ownerId,
        documentType,
        customType: customType ?? null,
        clinic,
        studyDate,
        notes: notes ?? null,
        fileName: originalName.slice(0, 255),
        storagePath: savedRelativePath,
        mimeType,
        fileSize: buffer.length,
      },
    });

    return success({ document }, 201);
  } catch {
    if (savedRelativePath) {
      await deleteDocumentFile(savedRelativePath).catch(() => {});
    }
    return error("Internal server error", 500);
  }
}

// Re-export to keep tree-shake friendly if needed in tests
export { documentTypeSchema };
