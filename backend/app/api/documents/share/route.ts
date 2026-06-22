import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { requireAuth } from "@/lib/auth";
import { canAccessOwner } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { error, success, validationError } from "@/lib/responses";
import {
  DEFAULT_SHARE_TTL_HOURS,
  createShareSchema,
} from "@/lib/validators/documents";

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

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const body = await request.json().catch(() => null);
    if (!body) return validationError("body is required");
    const parsed = createShareSchema.safeParse({
      ...body,
      ttlHours: body.ttlHours ?? DEFAULT_SHARE_TTL_HOURS,
    });
    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }
    const { documentIds, ttlHours } = parsed.data;

    const uniqueIds = Array.from(new Set(documentIds));
    const docs = await prisma.medicalDocument.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, userId: true },
    });
    if (docs.length !== uniqueIds.length) {
      return validationError("One or more documents not found");
    }
    for (const d of docs) {
      const ok = await canAccessOwner(user.userId, d.userId);
      if (!ok) {
        return error(
          "Not authorized to share one of these documents",
          403,
          "NOT_FAMILY"
        );
      }
    }

    const token = crypto.randomBytes(SHARE_TOKEN_BYTES).toString("hex");
    const expiresAt = new Date();
    expiresAt.setUTCHours(expiresAt.getUTCHours() + ttlHours);

    const share = await prisma.documentShare.create({
      data: {
        createdById: user.userId,
        token,
        expiresAt,
        documents: { create: docs.map((d) => ({ documentId: d.id })) },
      },
    });

    return success(
      {
        share: {
          id: share.id,
          token: share.token,
          expiresAt: share.expiresAt,
          documentCount: docs.length,
        },
        url: buildShareUrl(request, share.token),
      },
      201
    );
  } catch {
    return error("Internal server error", 500);
  }
}
