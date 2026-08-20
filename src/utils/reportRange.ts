import {
  differenceInCalendarDays,
  endOfMonth,
  endOfYear,
  formatISO,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";
import type { ReportRange } from "@shared/types";

function iso(d: Date): string {
  return formatISO(d, { representation: "date" });
}

export interface RangeBounds {
  start: string;
  end: string;
  prevStart: string;
  prevEnd: string;
}

/** Current-period and equivalent-length prior-period date bounds for a
 * report range, used for both the current totals and "vs previous period"
 * comparisons. */
export function getRangeBounds(range: ReportRange, referenceDate: Date = new Date()): RangeBounds {
  let start: Date;
  let end: Date;

  switch (range) {
    case "Week":
      start = subDays(referenceDate, 6);
      end = referenceDate;
      break;
    case "Month":
      start = startOfMonth(referenceDate);
      end = endOfMonth(referenceDate);
      break;
    case "3 Months":
      start = startOfMonth(subMonths(referenceDate, 2));
      end = endOfMonth(referenceDate);
      break;
    case "6 Months":
      start = startOfMonth(subMonths(referenceDate, 5));
      end = endOfMonth(referenceDate);
      break;
    case "Year":
      start = startOfYear(referenceDate);
      end = endOfYear(referenceDate);
      break;
  }

  const spanDays = differenceInCalendarDays(end, start) + 1;
  const prevEnd = subDays(start, 1);
  const prevStart = subDays(prevEnd, spanDays - 1);

  return { start: iso(start), end: iso(end), prevStart: iso(prevStart), prevEnd: iso(prevEnd) };
}
