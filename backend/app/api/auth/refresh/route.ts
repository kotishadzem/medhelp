import { NextRequest } from "next/server";
import { success, error } from "@/lib/responses";
import { prisma } from "@/lib/prisma";
import {
  hashRefreshToken,
  generateTokenPair,
  saveRefreshToken,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return error("Refresh token is required", 400, "MISSING_TOKEN");
    }

    const hashedToken = hashRefreshToken(refreshToken);
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      if (storedToken) {
        // Revoke all tokens for this user (potential token theft)
        await prisma.refreshToken.updateMany({
          where: { userId: storedToken.userId },
          data: { revoked: true },
        });
      }
      return error("Invalid or expired refresh token", 401, "INVALID_TOKEN");
    }

    // Revoke the used token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    // Issue new token pair
    const user = storedToken.user;
    const tokens = generateTokenPair(user.id, user.role);
    await saveRefreshToken(user.id, tokens.refreshToken);

    return success({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch {
    return error("Internal server error", 500);
  }
}
