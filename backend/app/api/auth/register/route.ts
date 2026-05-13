import { NextRequest } from "next/server";
import { registerSchema } from "@/lib/validators/auth";
import { success, validationError, error } from "@/lib/responses";
import { prisma } from "@/lib/prisma";
import { generateTokenPair, hashPin as hashPassword, saveRefreshToken } from "@/lib/auth";

// POST /api/auth/register — create a new account with phone OR email + password.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const { phone, password } = parsed.data;
    const email = parsed.data.email?.toLowerCase();

    const existing = phone
      ? await prisma.user.findUnique({ where: { phone } })
      : await prisma.user.findUnique({ where: { email: email! } });

    if (existing) {
      return error("მომხმარებელი უკვე არსებობს — შედი", 409, "ALREADY_REGISTERED");
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: phone ? { phone, pinHash: passwordHash } : { email: email!, pinHash: passwordHash },
    });

    const { accessToken, refreshToken } = generateTokenPair(user.id, user.role);
    await saveRefreshToken(user.id, refreshToken);

    return success(
      {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      },
      201
    );
  } catch {
    return error("Internal server error", 500);
  }
}
