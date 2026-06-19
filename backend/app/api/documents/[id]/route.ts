import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { canAccessOwner } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { error, notFound, success, validationError } from "@/lib/responses";
import { deleteDocumentFile } from "@/lib/storage/documents";
import { updateDocumentSchema } from "@/lib/validators/documents";

type Params = { params: Promise<{ id: string }> };

async function findAccessibleDoc(currentUserId: string, id: string) {
  const doc = await prisma.medicalDocument.findUnique({
    where: { id },
    include: { files: { orderBy: { uploadedAt: "asc" } } },
  });
  if (!doc) return null;
  const allowed = await canAccessOwner(currentUserId, doc.userId);
  return allowed ? doc : null;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const { id } = await params;
    const document = await findAccessibleDoc(user.userId, id);
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
    const existing = await findAccessibleDoc(user.userId, id);
    if (!existing) return notFound("Document not found");

    const body = await request.json();
    const parsed = updateDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const document = await prisma.medicalDocument.update({
      where: { id },
      data: parsed.data,
      include: { files: { orderBy: { uploadedAt: "asc" } } },
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
    const existing = await findAccessibleDoc(user.userId, id);
    if (!existing) return notFound("Document not found");

    await prisma.medicalDocument.delete({ where: { id } });
    for (const f of existing.files) {
      await deleteDocumentFile(f.storagePath).catch((err) => {
        console.error("Failed to delete document file", err);
      });
    }

    return success({ message: "Document deleted" });
  } catch {
    return error("Internal server error", 500);
  }
}
