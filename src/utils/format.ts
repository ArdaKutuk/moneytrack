import { format, parseISO } from "date-fns";
import type { DateFormat } from "@shared/types";

const DATE_FNS_PATTERN: Record<DateFormat, string> = {
  "DD.MM.YYYY": "dd.MM.yyyy",
  "MM/DD/YYYY": "MM/dd/yyyy",
  "YYYY-MM-DD": "yyyy-MM-dd",
};

/** Formats an ISO date string using the user's configured display format.
 * Calculations always use the raw ISO string — this is presentation only. */
export function formatDate(isoDate: string, dateFormat: DateFormat = "DD.MM.YYYY"): string {
  try {
    return format(parseISO(isoDate), DATE_FNS_PATTERN[dateFormat]);
  } catch {
    return isoDate;
  }
}

/** Short, human label for transaction rows: "Today", "Yesterday", or "Aug 18". */
export function relativeDateLabel(isoDate: string, todayISO: string): string {
  if (isoDate === todayISO) return "Today";
  const parsed = parseISO(isoDate);
  const today = parseISO(todayISO);
  const diffDays = Math.round((today.getTime() - parsed.getTime()) / 86_400_000);
  if (diffDays === 1) return "Yesterday";
  return format(parsed, "MMM dd");
}

/** "in 2 days" / "6 days ago" / "today" — used for bill due dates. */
export function dueLabel(isoDate: string, todayISO: string): string {
  const due = parseISO(isoDate);
  const today = parseISO(todayISO);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return "due today";
  if (diffDays === 1) return "in 1 day";
  if (diffDays > 1) return `in ${diffDays} days`;
  if (diffDays === -1) return "1 day ago";
  return `${Math.abs(diffDays)} days ago`;
}

/** Translates a hex color to an rgba() tint — matches the design's
 * translucent category chips and icon backgrounds. */
export function hexAlpha(hex: string, alpha = 0.13): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Two-letter monospace badge shown in category/bill/debt icon tiles. */
export function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "??";
  const words = trimmed.split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

/** Compact axis label for charts: ₺20.1k */
export function compactCurrency(minorUnits: number, symbol = "₺"): string {
  const major = minorUnits / 100;
  if (Math.abs(major) >= 1000) return `${symbol}${(major / 1000).toFixed(1)}k`;
  return `${symbol}${Math.round(major)}`;
}
