import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { error, notFound, unauthorized } from "@/lib/responses";
import { readDocumentFile } from "@/lib/storage/documents";

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
