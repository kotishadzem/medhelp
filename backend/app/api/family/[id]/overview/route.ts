import { NextRequest } from "next/server";
import { success, error, notFound, unauthorized } from "@/lib/responses";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/family/[id]/overview — see the target user's medications + intake stats.
// Caller must be the requester of an ACCEPTED link.
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const { id } = await params;
    const link = await prisma.familyLink.findUnique({ where: { id } });
    if (!link) return notFound("Family link not found");
    if (link.requesterId !== user.userId) return unauthorized("Not your link");
    if (link.status !== "ACCEPTED") {
      return error("Link not accepted yet", 403, "LINK_NOT_ACCEPTED");
    }

    const targetId = link.targetId;
    const [target, medications, intakeCounts, todayIntakes] = await Promise.all([
      prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true, phone: true, email: true, firstName: true, lastName: true },
      }),
      prisma.medication.findMany({
        where: { userId: targetId },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { intakes: true } } },
      }),
      prisma.medicationIntake.groupBy({
        by: ["status"],
        where: { medication: { userId: targetId } },
        _count: { status: true },
      }),
      (async () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return prisma.medicationIntake.findMany({
          where: {
            medication: { userId: targetId },
            scheduledAt: { gte: start, lt: end },
          },
          orderBy: { scheduledAt: "asc" },
          include: {
            medication: {
              select: { id: true, name: true, dosage: true, instructions: true, status: true },
            },
          },
        });
      })(),
    ]);

    const totals = { PENDING: 0, TAKEN: 0, MISSED: 0, SKIPPED: 0 };
    for (const c of intakeCounts) {
      totals[c.status as keyof typeof totals] = c._count.status;
    }
    const total = totals.PENDING + totals.TAKEN + totals.MISSED + totals.SKIPPED;
    const completionPct = total === 0 ? 0 : Math.round((totals.TAKEN / total) * 100);

    return success({
      target,
      medications,
      stats: {
        total,
        taken: totals.TAKEN,
        missed: totals.MISSED,
        skipped: totals.SKIPPED,
        pending: totals.PENDING,
        completionPct,
      },
      today: todayIntakes,
    });
  } catch {
    return error("Internal server error", 500);
  }
}
