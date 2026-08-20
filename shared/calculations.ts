import { addWeeks, addMonths, addYears, isBefore, parseISO, formatISO } from "date-fns";
import type { RecurrenceFrequency, TransactionType } from "./types";

/** Pure, framework-agnostic financial calculations. Used by both the
 * Electron main process (repositories) and unit tests, so the math is
 * defined exactly once. */

export type BudgetState = "normal" | "warning" | "critical" | "exceeded";

/** spent / budget * 100, rounded. A zero budget with any spend is treated
 * as fully exceeded (100) rather than dividing by zero. */
export function budgetPercentage(spent: number, budget: number): number {
  if (budget <= 0) return spent > 0 ? 100 : 0;
  return Math.round((spent / budget) * 100);
}

export function budgetState(pct: number): BudgetState {
  if (pct >= 100) return "exceeded";
  if (pct >= 90) return "critical";
  if (pct >= 75) return "warning";
  return "normal";
}

/** Percentage of income retained after expenses, rounded. Can go negative
 * when expenses exceed income — that is meaningful, not an error. */
export function savingsRate(income: number, expenses: number): number {
  if (income <= 0) return 0;
  return Math.round(((income - expenses) / income) * 100);
}

export function totalBalance(totalIncome: number, totalExpenses: number): number {
  return totalIncome - totalExpenses;
}

export function sumByType(
  transactions: Array<{ type: TransactionType; amount: number }>,
  type?: TransactionType
): number {
  return transactions
    .filter((t) => !type || t.type === type)
    .reduce((sum, t) => sum + t.amount, 0);
}

/** Sums amounts per category_id — a pure equivalent of the SQL `GROUP BY`
 * the real repositories use, kept here so category-total math has a unit
 * test that doesn't need a database fixture. */
export function categoryTotals<T extends { category_id: number; amount: number }>(
  transactions: T[]
): Record<number, number> {
  const totals: Record<number, number> = {};
  for (const t of transactions) {
    totals[t.category_id] = (totals[t.category_id] ?? 0) + t.amount;
  }
  return totals;
}

/** Inclusive filter over ISO (YYYY-MM-DD) date strings, which compare
 * correctly with plain string comparison. */
export function filterByDateRange<T extends { date: string }>(
  items: T[],
  start: string,
  end: string
): T[] {
  return items.filter((i) => i.date >= start && i.date <= end);
}

/** Never allow a debt's remaining balance to go below zero. */
export function applyDebtPayment(remaining: number, payment: number): number {
  return Math.max(0, remaining - payment);
}

/** Given a bill's current due date and recurrence frequency, returns the
 * next ISO due date after it is paid. */
export function nextRecurringDate(dueDateISO: string, frequency: RecurrenceFrequency): string {
  const current = parseISO(dueDateISO);
  const next =
    frequency === "weekly"
      ? addWeeks(current, 1)
      : frequency === "yearly"
        ? addYears(current, 1)
        : addMonths(current, 1);
  return formatISO(next, { representation: "date" });
}

/** A bill is overdue when its due date has passed and it hasn't been paid
 * for the current cycle. `todayISO` is injected so this stays pure/testable. */
export function computeBillStatus(
  dueDateISO: string,
  currentStatus: "upcoming" | "paid" | "overdue",
  todayISO: string
): "upcoming" | "paid" | "overdue" {
  if (currentStatus === "paid") return "paid";
  return isBefore(parseISO(dueDateISO), parseISO(todayISO)) ? "overdue" : "upcoming";
}

/** Percent change from a previous period value to a current one, rounded.
 * Returns null when there's no meaningful prior value to compare against. */
export function percentChange(previous: number, current: number): number | null {
  if (previous === 0) return current === 0 ? null : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}
