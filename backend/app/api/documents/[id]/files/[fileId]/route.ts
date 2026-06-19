import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { error, notFound, success, unauthorized } from "@/lib/responses";
import { deleteDocumentFile, readDocumentFile } from "@/lib/storage/documents";

type Params = { params: Promise<{ id: string; fileId: string }> };

function resolveAuthenticatedUser(request: NextRequest): { userId: string } | null {
  const fromHeader = getAuthUser(request);
  if (fromHeader) return fromHeader;
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

    const { id, fileId } = await params;

    const file = await prisma.medicalDocumentFile.findFirst({
      where: { id: fileId, document: { id, userId: user.userId } },
    });
    if (!file) return notFound("File not found");

    const buffer = await readDocumentFile(file.storagePath);
    const safeName = file.fileName.replace(/"/g, "");

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(buffer.length),
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return error("Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const fromHeader = getAuthUser(request);
    if (!fromHeader) return unauthorized();
    const { id, fileId } = await params;

    const file = await prisma.medicalDocumentFile.findFirst({
      where: { id: fileId, document: { id, userId: fromHeader.userId } },
    });
    if (!file) return notFound("File not found");

    await prisma.medicalDocumentFile.delete({ where: { id: file.id } });
    await deleteDocumentFile(file.storagePath).catch((err) => {
      console.error("Failed to delete file from disk", err);
    });

    return success({ message: "File deleted" });
  } catch {
    return error("Internal server error", 500);
  }
}
