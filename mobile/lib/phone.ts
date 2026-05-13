import { COUNTRIES } from "./countries";

export function normalizePhone(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

export function formatPhoneForDisplay(phone: string): string {
  // Group as 3-2-2-2-2-... e.g. "5551234567" → "555 12 34 56 7"
  const d = normalizePhone(phone);
  if (d.length === 0) return "";
  if (d.length <= 3) return d;
  let out = d.slice(0, 3);
  let i = 3;
  while (i < d.length) {
    out += " " + d.slice(i, i + 2);
    i += 2;
  }
  return out;
}

export function splitE164(phone: string): { dial: string; local: string; flag: string } {
  if (!phone.startsWith("+")) {
    return { dial: "", local: phone, flag: "" };
  }
  const matches = COUNTRIES.filter((c) => phone.startsWith(c.dial)).sort(
    (a, b) => b.dial.length - a.dial.length
  );
  if (matches.length === 0) {
    return { dial: "", local: phone.slice(1), flag: "" };
  }
  const c = matches[0];
  return { dial: c.dial, local: phone.slice(c.dial.length), flag: c.flag };
}

export function formatPhonePretty(phone: string): string {
  const { dial, local, flag } = splitE164(phone);
  const parts = [flag, dial, formatPhoneForDisplay(local)].filter(Boolean);
  return parts.join(" ");
}

export function maskPhone(phone: string): string {
  const { dial, local, flag } = splitE164(phone);
  if (local.length < 4) return [flag, dial, local].filter(Boolean).join(" ");
  const visible = `${local.slice(0, 3)} ⋯ ${local.slice(-2)}`;
  return [flag, dial, visible].filter(Boolean).join(" ");
}
