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
        documents: {
          include: {
            document: {
              include: { files: { orderBy: { uploadedAt: "asc" } } },
            },
          },
          orderBy: { addedAt: "asc" },
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
      documents: share.documents.map(({ document: d }) => ({
        id: d.id,
        documentType: d.documentType,
        customType: d.customType,
        clinic: d.clinic,
        studyDate: d.studyDate,
        notes: d.notes,
        uploadedAt: d.uploadedAt,
        files: d.files.map((f) => ({
          id: f.id,
          fileName: f.fileName,
          mimeType: f.mimeType,
          fileSize: f.fileSize,
        })),
      })),
    });
  } catch {
    return error("Internal server error", 500);
  }
}
