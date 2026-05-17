export function formatTimeHHMM(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateLong(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ka-GE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ka-GE", {
    day: "numeric",
    month: "short",
  });
}

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function timePeriod(iso: string): "morning" | "afternoon" | "evening" {
  const h = new Date(iso).getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

export function ymdLocal(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isTomorrow(iso: string): boolean {
  const d = new Date(iso);
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
}

export type DerivedIntakeStatus =
  | "TAKEN"
  | "SKIPPED"
  | "MISSED"
  | "IMMINENT" // PENDING within the next 30 minutes
  | "PENDING";

export function deriveIntakeStatus(
  status: "PENDING" | "TAKEN" | "MISSED" | "SKIPPED",
  scheduledAt: string,
  now: number = Date.now()
): DerivedIntakeStatus {
  if (status === "TAKEN") return "TAKEN";
  if (status === "SKIPPED") return "SKIPPED";
  if (status === "MISSED") return "MISSED";
  const scheduled = new Date(scheduledAt).getTime();
  if (scheduled < now) return "MISSED";
  if (scheduled - now <= 30 * 60 * 1000) return "IMMINENT";
  return "PENDING";
}

export function dateInputToISO(yyyymmdd: string): string {
  // Treat as local date midnight, return ISO
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d).toISOString();
}

export function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDaysYMD(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
