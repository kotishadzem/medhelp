import { NextRequest } from "next/server";
import { success, error } from "@/lib/responses";
import { prisma } from "@/lib/prisma";
import { hashRefreshToken, requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { error: authError } = requireAuth(request);
    if (authError) return authError;

    const body = await request.json();
    const { refreshToken } = body;

    if (refreshToken) {
      const hashedToken = hashRefreshToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { token: hashedToken },
        data: { revoked: true },
      });
    }

    return success({ message: "Logged out successfully" });
  } catch {
    return error("Internal server error", 500);
  }
}
