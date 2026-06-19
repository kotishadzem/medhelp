import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { requireAuth } from "@/lib/auth";
import { canAccessOwner } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { error, notFound, success } from "@/lib/responses";

type Params = { params: Promise<{ id: string }> };

const SHARE_TTL_DAYS = 7;
const SHARE_TOKEN_BYTES = 32;

function buildShareUrl(request: NextRequest, token: string): string {
  const envBase = process.env.SHARE_BASE_URL?.trim();
  if (envBase) {
    const trimmed = envBase.endsWith("/") ? envBase.slice(0, -1) : envBase;
    return `${trimmed}/share/${token}`;
  }
  const origin =
    request.headers.get("origin") ??
    `${new URL(request.url).protocol}//${request.headers.get("host") ?? "localhost"}`;
  return `${origin}/share/${token}`;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const { id } = await params;
    const document = await prisma.medicalDocument.findUnique({ where: { id } });
    if (!document) return notFound("Document not found");
    const allowed = await canAccessOwner(user.userId, document.userId);
    if (!allowed) return notFound("Document not found");

    const token = crypto.randomBytes(SHARE_TOKEN_BYTES).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SHARE_TTL_DAYS);

    const share = await prisma.documentShare.create({
      data: {
        documentId: document.id,
        createdById: user.userId,
        token,
        expiresAt,
      },
    });

    return success(
      {
        share: {
          id: share.id,
          token: share.token,
          expiresAt: share.expiresAt,
        },
        url: buildShareUrl(request, share.token),
      },
      201
    );
  } catch {
    return error("Internal server error", 500);
  }
}
