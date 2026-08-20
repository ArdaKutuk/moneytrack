import type Database from "better-sqlite3";
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  endOfYear,
  format,
  formatISO,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";
import type { CategorySpend, ReportRange, TimeSeriesPoint } from "@shared/types";

function iso(d: Date): string {
  return formatISO(d, { representation: "date" });
}

interface Bucket {
  label: string;
  start: string;
  end: string;
}

function buildBuckets(range: ReportRange, referenceDate: Date): Bucket[] {
  if (range === "Week") {
    const start = subDays(referenceDate, 6);
    return eachDayOfInterval({ start, end: referenceDate }).map((d) => ({
      label: format(d, "EEE"),
      start: iso(d),
      end: iso(d),
    }));
  }

  if (range === "Month") {
    const start = startOfMonth(referenceDate);
    const end = endOfMonth(referenceDate);
    return eachDayOfInterval({ start, end }).map((d) => ({
      label: format(d, "d"),
      start: iso(d),
      end: iso(d),
    }));
  }

  const monthsBack = range === "3 Months" ? 2 : range === "6 Months" ? 5 : 11;
  const rangeStart =
    range === "Year" ? startOfYear(referenceDate) : startOfMonth(subMonths(referenceDate, monthsBack));
  const rangeEnd = range === "Year" ? endOfYear(referenceDate) : endOfMonth(referenceDate);

  return eachMonthOfInterval({ start: rangeStart, end: rangeEnd }).map((d) => ({
    label: format(d, "MMM"),
    start: iso(startOfMonth(d)),
    end: iso(endOfMonth(d)),
  }));
}

/** Income vs expense totals bucketed by day (Week/Month) or by month
 * (3/6 Months/Year), used by both the dashboard cash-flow chart and the
 * Reports page. */
export function getTimeSeries(
  db: Database.Database,
  range: ReportRange,
  referenceDate: Date = new Date()
): TimeSeriesPoint[] {
  const buckets = buildBuckets(range, referenceDate);
  const sumStmt = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE type = ? AND date >= ? AND date <= ?"
  );

  return buckets.map((b) => {
    const income = (sumStmt.get("income", b.start, b.end) as { total: number }).total;
    const expense = (sumStmt.get("expense", b.start, b.end) as { total: number }).total;
    return { label: b.label, date: b.start, income, expense };
  });
}

/** Total spend per expense category within [startDate, endDate], descending. */
export function getCategorySpend(
  db: Database.Database,
  startDate: string,
  endDate: string,
  type: "income" | "expense" = "expense"
): CategorySpend[] {
  return db
    .prepare(
      `SELECT c.id AS category_id, c.name AS category_name, c.color, c.icon, COALESCE(SUM(t.amount), 0) AS total
       FROM categories c
       LEFT JOIN transactions t ON t.category_id = c.id AND t.type = ? AND t.date >= ? AND t.date <= ?
       WHERE c.type = ?
       GROUP BY c.id
       HAVING total > 0
       ORDER BY total DESC`
    )
    .all(type, startDate, endDate, type) as CategorySpend[];
}

export function getTotalForRange(
  db: Database.Database,
  type: "income" | "expense",
  startDate: string,
  endDate: string
): number {
  const row = db
    .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE type = ? AND date >= ? AND date <= ?")
    .get(type, startDate, endDate) as { total: number };
  return row.total;
}

export function getCategoryTotalForRange(
  db: Database.Database,
  categoryId: number,
  startDate: string,
  endDate: string
): number {
  const row = db
    .prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE category_id = ? AND date >= ? AND date <= ?"
    )
    .get(categoryId, startDate, endDate) as { total: number };
  return row.total;
}
