import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { error, notFound } from "@/lib/responses";
import { readDocumentFile } from "@/lib/storage/documents";

type Params = { params: Promise<{ token: string; fileId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { token, fileId } = await params;
    if (!token || !fileId) return notFound("Share not found");

    const share = await prisma.documentShare.findUnique({
      where: { token },
    });
    if (!share) return notFound("Share not found");
    if (share.expiresAt.getTime() < Date.now()) {
      return notFound("Share has expired");
    }

    const file = await prisma.medicalDocumentFile.findFirst({
      where: { id: fileId, documentId: share.documentId },
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
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return error("Internal server error", 500);
  }
}
