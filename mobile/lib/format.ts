import i18n from "@/lib/i18n";

const KA_MONTHS = [
  "იანვარი",
  "თებერვალი",
  "მარტი",
  "აპრილი",
  "მაისი",
  "ივნისი",
  "ივლისი",
  "აგვისტო",
  "სექტემბერი",
  "ოქტომბერი",
  "ნოემბერი",
  "დეკემბერი",
];

const KA_MONTHS_SHORT = [
  "იან",
  "თებ",
  "მარ",
  "აპრ",
  "მაი",
  "ივნ",
  "ივლ",
  "აგვ",
  "სექ",
  "ოქტ",
  "ნოე",
  "დეკ",
];

// JS Date.getDay(): 0 = Sunday, 1 = Monday, …
const KA_WEEKDAYS = [
  "კვირა",
  "ორშაბათი",
  "სამშაბათი",
  "ოთხშაბათი",
  "ხუთშაბათი",
  "პარასკევი",
  "შაბათი",
];

function currentLang(): string {
  return i18n.language || "ka";
}

function localeFor(lang: string): string {
  if (lang === "en") return "en-GB";
  if (lang === "de") return "de-DE";
  return "ka-GE";
}

// Intake scheduledAt is stored as wall-clock UTC by the backend — read it
// the same way so a "08:00" pill always shows as 08:00 regardless of where
// the user or the server is.
export function formatTimeHHMM(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function formatDateLong(iso: string): string {
  const d = new Date(iso);
  const lang = currentLang();
  if (lang === "ka") {
    return `${KA_WEEKDAYS[d.getDay()]}, ${d.getDate()} ${KA_MONTHS[d.getMonth()]}`;
  }
  return d.toLocaleDateString(localeFor(lang), {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  const lang = currentLang();
  if (lang === "ka") {
    return `${d.getDate()} ${KA_MONTHS_SHORT[d.getMonth()]}`;
  }
  return d.toLocaleDateString(localeFor(lang), {
    day: "numeric",
    month: "short",
  });
}

export function formatWeekdayDayMonth(iso: string): string {
  const d = new Date(iso);
  const lang = currentLang();
  if (lang === "ka") {
    return `${KA_WEEKDAYS[d.getDay()]}, ${d.getDate()} ${KA_MONTHS[d.getMonth()]}`;
  }
  return d.toLocaleDateString(localeFor(lang), {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

export function timePeriod(iso: string): "morning" | "afternoon" | "evening" {
  const h = new Date(iso).getUTCHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

export function ymdLocal(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function isTomorrow(iso: string): boolean {
  const d = new Date(iso);
  const t = new Date();
  t.setUTCDate(t.getUTCDate() + 1);
  return (
    d.getUTCFullYear() === t.getUTCFullYear() &&
    d.getUTCMonth() === t.getUTCMonth() &&
    d.getUTCDate() === t.getUTCDate()
  );
}

export type DerivedIntakeStatus =
  | "TAKEN"
  | "SKIPPED"
  | "MISSED"
  | "IMMINENT" // PENDING within the next 30 minutes
  | "PENDING";

function nowAsWallClockUtc(now: number): number {
  // Convert the user's local wall-clock into a UTC epoch so we can compare
  // against `scheduledAt` (which is stored as wall-clock UTC). Without this,
  // a user-typed "08:00 pill" would flip to MISSED 4h late in Tbilisi.
  const d = new Date(now);
  return Date.UTC(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds()
  );
}

export function deriveIntakeStatus(
  status: "PENDING" | "TAKEN" | "MISSED" | "SKIPPED",
  scheduledAt: string,
  now: number = Date.now()
): DerivedIntakeStatus {
  if (status === "TAKEN") return "TAKEN";
  if (status === "SKIPPED") return "SKIPPED";
  if (status === "MISSED") return "MISSED";
  const scheduled = new Date(scheduledAt).getTime();
  const localNow = nowAsWallClockUtc(now);
  if (scheduled < localNow) return "MISSED";
  if (scheduled - localNow <= 30 * 60 * 1000) return "IMMINENT";
  return "PENDING";
}

export function dateInputToISO(yyyymmdd: string): string {
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
