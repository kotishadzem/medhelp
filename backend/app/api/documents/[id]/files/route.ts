import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAuth } from "@/lib/auth";
import { canAccessOwner } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { error, notFound, success, validationError } from "@/lib/responses";
import {
  deleteDocumentFile,
  getExtensionForMime,
  isAllowedMime,
  MAX_FILE_SIZE_BYTES,
  saveDocumentFile,
} from "@/lib/storage/documents";

type Params = { params: Promise<{ id: string }> };

const FILE_FIELD = "file";

export async function POST(request: NextRequest, { params }: Params) {
  const savedPaths: string[] = [];
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const { id } = await params;
    const document = await prisma.medicalDocument.findUnique({ where: { id } });
    if (!document) return notFound("Document not found");
    const allowed = await canAccessOwner(user.userId, document.userId);
    if (!allowed) return notFound("Document not found");

    const formData = await request.formData();
    const fileParts = formData
      .getAll(FILE_FIELD)
      .filter((p): p is File => p instanceof Blob) as File[];
    if (fileParts.length === 0) {
      return validationError("at least one file is required");
    }

    const created = [];
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
      const fileId = randomUUID();
      const storagePath = await saveDocumentFile(
        document.userId,
        fileId,
        extension,
        buffer
      );
      savedPaths.push(storagePath);
      const file = await prisma.medicalDocumentFile.create({
        data: {
          id: fileId,
          documentId: document.id,
          fileName: originalName.slice(0, 255),
          storagePath,
          mimeType,
          fileSize: buffer.length,
        },
      });
      created.push(file);
    }

    return success({ files: created }, 201);
  } catch {
    for (const path of savedPaths) {
      await deleteDocumentFile(path).catch(() => {});
    }
    return error("Internal server error", 500);
  }
}
