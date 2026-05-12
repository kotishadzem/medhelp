export function normalizePhone(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

export function formatPhoneForDisplay(phone: string): string {
  // Georgian-style display: 555 12 34 56
  const d = normalizePhone(phone);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)} ${d.slice(3)}`;
  if (d.length <= 7) return `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
}

export function maskPhone(phone: string): string {
  const d = normalizePhone(phone);
  if (d.length < 4) return d;
  return `${d.slice(0, 3)} ⋯ ${d.slice(-2)}`;
}
