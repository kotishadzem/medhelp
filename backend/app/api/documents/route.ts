import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { error, success, validationError } from "@/lib/responses";
import {
  createDocumentMetadataSchema,
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
        { customType: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
        { clinic: { contains: q, mode: "insensitive" } },
        { files: { some: { fileName: { contains: q, mode: "insensitive" } } } },
      ];
    }

    const documents = await prisma.medicalDocument.findMany({
      where,
      orderBy: { studyDate: "desc" },
      include: {
        files: { orderBy: { uploadedAt: "asc" } },
      },
    });

    return success({ documents });
  } catch {
    return error("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const savedPaths: string[] = [];
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const formData = await request.formData();
    const fileParts = formData
      .getAll(FILE_FIELD)
      .filter((p): p is File => p instanceof Blob) as File[];
    const metadataPart = formData.get(METADATA_FIELD);

    if (fileParts.length === 0) {
      return validationError("at least one file is required");
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

    const { documentType, customType, clinic, studyDate, notes, forUserId } = parsed.data;

    // Validate every file up-front before we write any of them.
    const prepared: {
      buffer: Buffer;
      mimeType: string;
      extension: string;
      fileName: string;
    }[] = [];
    for (const part of fileParts) {
      const mimeType = (part.type || "application/octet-stream").toLowerCase();
      if (!isAllowedMime(mimeType)) {
        return validationError("Unsupported file type — allowed: PDF, JPG, PNG, HEIC");
      }
      if (part.size > MAX_FILE_SIZE_BYTES) {
        return validationError("File exceeds 15 MB limit");
      }
      if (part.size === 0) {
        return validationError("File is empty");
      }
      const extension = getExtensionForMime(mimeType);
      if (!extension) return validationError("Unsupported file extension");
      const buffer = Buffer.from(await part.arrayBuffer());
      const originalName = part.name ? part.name : `document.${extension}`;
      prepared.push({ buffer, mimeType, extension, fileName: originalName.slice(0, 255) });
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

    // Write each file to disk and accumulate file rows.
    const filesData: Prisma.MedicalDocumentFileCreateWithoutDocumentInput[] = [];
    for (const item of prepared) {
      const fileId = randomUUID();
      const storagePath = await saveDocumentFile(
        ownerId,
        fileId,
        item.extension,
        item.buffer
      );
      savedPaths.push(storagePath);
      filesData.push({
        id: fileId,
        fileName: item.fileName,
        storagePath,
        mimeType: item.mimeType,
        fileSize: item.buffer.length,
      });
    }

    const document = await prisma.medicalDocument.create({
      data: {
        userId: ownerId,
        documentType,
        customType: customType ?? null,
        clinic,
        studyDate,
        notes: notes ?? null,
        files: { create: filesData },
      },
      include: { files: { orderBy: { uploadedAt: "asc" } } },
    });

    return success({ document }, 201);
  } catch {
    for (const path of savedPaths) {
      await deleteDocumentFile(path).catch(() => {});
    }
    return error("Internal server error", 500);
  }
}
