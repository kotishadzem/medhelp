import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { error, notFound } from "@/lib/responses";
import { readDocumentFile } from "@/lib/storage/documents";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

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
