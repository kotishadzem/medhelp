import { NextRequest } from "next/server";
import { success, error, validationError } from "@/lib/responses";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// Adherence report: for each ACTIVE/PAUSED/COMPLETED medication owned by the
// caller, returns a per-day breakdown of how many doses were taken vs the
// total scheduled within [from, to]. Range is inclusive at the day level
// (server local time).
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = requireAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    if (!fromStr || !toStr) {
      return validationError("'from' and 'to' query params are required (YYYY-MM-DD)");
    }

    const from = parseYMD(fromStr);
    const to = parseYMD(toStr);
    if (!from || !to || to < from) {
      return validationError("Invalid date range");
    }
    const endExclusive = new Date(to);
    endExclusive.setDate(endExclusive.getDate() + 1);

    const days: string[] = [];
    for (let d = new Date(from); d < endExclusive; d.setDate(d.getDate() + 1)) {
      days.push(toYMD(d));
    }

    const medications = await prisma.medication.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "asc" },
      include: {
        intakes: {
          where: { scheduledAt: { gte: from, lt: endExclusive } },
          select: { scheduledAt: true, status: true },
        },
      },
    });

    const result = medications.map((m) => {
      const empty: Record<string, { taken: number; total: number }> = {};
      for (const d of days) empty[d] = { taken: 0, total: 0 };
      for (const i of m.intakes) {
        const key = toYMD(i.scheduledAt);
        if (!empty[key]) continue;
        empty[key].total += 1;
        if (i.status === "TAKEN") empty[key].taken += 1;
      }
      return {
        id: m.id,
        name: m.name,
        type: m.type,
        status: m.status,
        days: empty,
      };
    });

    return success({ from: fromStr, to: toStr, days, medications: result });
  } catch {
    return error("Internal server error", 500);
  }
}

function parseYMD(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
