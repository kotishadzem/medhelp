import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { error, notFound, success, validationError } from "@/lib/responses";
import { deleteDocumentFile } from "@/lib/storage/documents";
import { updateDocumentSchema } from "@/lib/validators/documents";

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

    return success({ document });
  } catch {
    return error("Internal server error", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const { id } = await params;

    const existing = await prisma.medicalDocument.findFirst({
      where: { id, userId: user.userId },
    });
    if (!existing) return notFound("Document not found");

    const body = await request.json();
    const parsed = updateDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const document = await prisma.medicalDocument.update({
      where: { id },
      data: parsed.data,
    });

    return success({ document });
  } catch {
    return error("Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const { id } = await params;

    const existing = await prisma.medicalDocument.findFirst({
      where: { id, userId: user.userId },
    });
    if (!existing) return notFound("Document not found");

    await prisma.medicalDocument.delete({ where: { id } });
    await deleteDocumentFile(existing.storagePath).catch((err) => {
      console.error("Failed to delete document file", err);
    });

    return success({ message: "Document deleted" });
  } catch {
    return error("Internal server error", 500);
  }
}
