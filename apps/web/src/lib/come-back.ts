export function comeBackAt(retryAfter: string | null, now = Date.now()): Date | null {
  if (!retryAfter || !/^\d+$/.test(retryAfter)) return null;
  return new Date(now + Number(retryAfter) * 1000);
}

export const clockTime = (date: Date, locale?: string, timeZone?: string) =>
  date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", timeZone });
