import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAuthUser, requireAuth, verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { error, notFound, success, unauthorized, validationError } from "@/lib/responses";
import {
  deleteDocumentFile,
  getExtensionForMime,
  isAllowedMime,
  MAX_FILE_SIZE_BYTES,
  readDocumentFile,
  saveDocumentFile,
} from "@/lib/storage/documents";

type Params = { params: Promise<{ id: string }> };

function resolveAuthenticatedUser(request: NextRequest): { userId: string } | null {
  const fromHeader = getAuthUser(request);
  if (fromHeader) return fromHeader;
  // Fallback: short-lived access token via query string so the file can be
  // opened directly in a new browser tab (where the JS-supplied Authorization
  // header is not available). Same JWT, same expiry — just a different
  // transport.
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return null;
  try {
    const payload = verifyAccessToken(token);
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = resolveAuthenticatedUser(request);
    if (!user) return unauthorized();

    const { id } = await params;

    const document = await prisma.medicalDocument.findFirst({
      where: { id, userId: user.userId },
    });
    if (!document) return notFound("Document not found");

    const buffer = await readDocumentFile(document.storagePath);
    const safeName = document.fileName.replace(/"/g, "");

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": document.mimeType,
        "Content-Length": String(buffer.length),
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return error("Internal server error", 500);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  let newStoragePath: string | null = null;
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const { id } = await params;
    const existing = await prisma.medicalDocument.findFirst({
      where: { id, userId: user.userId },
    });
    if (!existing) return notFound("Document not found");

    const formData = await request.formData();
    const filePart = formData.get("file");
    if (!(filePart instanceof Blob)) {
      return validationError("file field is required");
    }
    const mimeType = (filePart.type || "application/octet-stream").toLowerCase();
    if (!isAllowedMime(mimeType)) {
      return validationError("Unsupported file type — allowed: PDF, JPG, PNG, HEIC");
    }
    if (filePart.size > MAX_FILE_SIZE_BYTES) {
      return validationError("File exceeds 15 MB limit");
    }
    if (filePart.size === 0) {
      return validationError("File is empty");
    }
    const extension = getExtensionForMime(mimeType);
    if (!extension) return validationError("Unsupported file extension");

    const buffer = Buffer.from(await filePart.arrayBuffer());
    const originalName =
      filePart instanceof File && filePart.name
        ? filePart.name
        : `document.${extension}`;

    const newDocId = randomUUID();
    newStoragePath = await saveDocumentFile(
      existing.userId,
      newDocId,
      extension,
      buffer
    );

    const oldStoragePath = existing.storagePath;
    const updated = await prisma.medicalDocument.update({
      where: { id },
      data: {
        fileName: originalName.slice(0, 255),
        storagePath: newStoragePath,
        mimeType,
        fileSize: buffer.length,
      },
    });
    await deleteDocumentFile(oldStoragePath).catch((err) => {
      console.error("Failed to delete previous document file", err);
    });

    return success({ document: updated });
  } catch {
    if (newStoragePath) {
      await deleteDocumentFile(newStoragePath).catch(() => {});
    }
    return error("Internal server error", 500);
  }
}
