export const TIMEZONE_IST = 'Asia/Kolkata';

/**
 * Safely parse date strings from SQLite (which may be UTC like '2026-11-09 13:45:00' without Z)
 * or ISO strings into a proper JavaScript Date object.
 */
export function parseDate(dateInput: string | Date | number | null | undefined): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'number') return new Date(dateInput);

  let s = String(dateInput).trim();
  // If SQLite CURRENT_TIMESTAMP format: "YYYY-MM-DD HH:MM:SS" -> treat as UTC
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
    s = s.replace(' ', 'T') + 'Z';
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) {
    s = s + 'Z';
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Formats time in Indian Standard Time (IST): e.g. "07:15 PM"
 */
export function formatISTTime(dateInput: string | Date | number | null | undefined): string {
  const d = parseDate(dateInput);
  return d.toLocaleTimeString('en-IN', {
    timeZone: TIMEZONE_IST,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).toUpperCase();
}

/**
 * Formats full date in Indian Standard Time (IST): e.g. "Mon, 9 Nov 2026"
 */
export function formatISTDate(dateInput: string | Date | number | null | undefined): string {
  const d = parseDate(dateInput);
  return d.toLocaleDateString('en-IN', {
    timeZone: TIMEZONE_IST,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats short date in IST: e.g. "9 Nov"
 */
export function formatISTShortDate(dateInput: string | Date | number | null | undefined): string {
  const d = parseDate(dateInput);
  return d.toLocaleDateString('en-IN', {
    timeZone: TIMEZONE_IST,
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Get date string in IST ("YYYY-MM-DD") for grouping and comparison
 */
export function getISTDateKey(dateInput: string | Date | number | null | undefined): string {
  const d = parseDate(dateInput);
  return d.toLocaleDateString('en-CA', { timeZone: TIMEZONE_IST });
}

/**
 * Check if a date falls on "Today" in Indian Standard Time
 */
export function isISTToday(dateInput: string | Date | number | null | undefined): boolean {
  if (!dateInput) return false;
  return getISTDateKey(dateInput) === getISTDateKey(new Date());
}

/**
 * Check if a date falls on "Yesterday" in Indian Standard Time
 */
export function isISTYesterday(dateInput: string | Date | number | null | undefined): boolean {
  if (!dateInput) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getISTDateKey(dateInput) === getISTDateKey(yesterday);
}

/**
 * Friendly label for feed sections in IST: "Today", "Yesterday", or "Mon, 9 Nov 2026"
 */
export function getISTDateLabel(dateInput: string | Date | number | null | undefined): string {
  if (isISTToday(dateInput)) return 'Today';
  if (isISTYesterday(dateInput)) return 'Yesterday';
  return formatISTDate(dateInput);
}
