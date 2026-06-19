import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { error, notFound, success } from "@/lib/responses";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { token } = await params;
    if (!token) return notFound("Share not found");

    const share = await prisma.documentShare.findUnique({
      where: { token },
      include: {
        document: {
          include: { files: { orderBy: { uploadedAt: "asc" } } },
        },
      },
    });
    if (!share) return notFound("Share not found");
    if (share.expiresAt.getTime() < Date.now()) {
      return notFound("Share has expired");
    }

    return success({
      share: {
        token: share.token,
        expiresAt: share.expiresAt,
      },
      document: {
        id: share.document.id,
        documentType: share.document.documentType,
        customType: share.document.customType,
        clinic: share.document.clinic,
        studyDate: share.document.studyDate,
        notes: share.document.notes,
        uploadedAt: share.document.uploadedAt,
        files: share.document.files.map((f) => ({
          id: f.id,
          fileName: f.fileName,
          mimeType: f.mimeType,
          fileSize: f.fileSize,
        })),
      },
    });
  } catch {
    return error("Internal server error", 500);
  }
}
