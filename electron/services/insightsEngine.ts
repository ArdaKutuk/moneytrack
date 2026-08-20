import type Database from "better-sqlite3";
import { endOfMonth, formatISO, startOfMonth, subMonths } from "date-fns";
import type { Insight } from "@shared/types";
import { percentChange, savingsRate, budgetPercentage } from "@shared/calculations";
import { listCategories } from "../database/repositories/categoriesRepo";
import { getCategoryTotalForRange, getTotalForRange } from "../database/repositories/reportsRepo";
import { listBudgetsForMonth } from "../database/repositories/budgetsRepo";

function iso(d: Date): string {
  return formatISO(d, { representation: "date" });
}

const MEANINGFUL_CHANGE_THRESHOLD = 10; // percent
const MAX_INSIGHTS = 4;

/** A small local, rule-based insight engine — no AI, no network. Reads
 * straight from SQLite and only surfaces an insight when there's enough
 * history to make it meaningful (e.g. a category needs spend in both the
 * current and prior month before a "vs last month" comparison is shown). */
export function generateInsights(db: Database.Database, referenceDate: Date = new Date()): Insight[] {
  const insights: Insight[] = [];

  const curStart = iso(startOfMonth(referenceDate));
  const curEnd = iso(endOfMonth(referenceDate));
  const prevMonthDate = subMonths(referenceDate, 1);
  const prevStart = iso(startOfMonth(prevMonthDate));
  const prevEnd = iso(endOfMonth(prevMonthDate));

  for (const category of listCategories(db).filter((c) => c.type === "expense")) {
    const current = getCategoryTotalForRange(db, category.id, curStart, curEnd);
    const previous = getCategoryTotalForRange(db, category.id, prevStart, prevEnd);
    if (previous <= 0 || current <= 0) continue; // not enough history to compare

    const change = percentChange(previous, current);
    if (change === null || Math.abs(change) < MEANINGFUL_CHANGE_THRESHOLD) continue;

    insights.push({
      id: `cat-${category.id}`,
      tag: category.name,
      delta: `${change > 0 ? "+" : ""}${change}%`,
      tone: change > 0 ? "negative" : "positive",
      text: `You spent ${Math.abs(change)}% ${change > 0 ? "more" : "less"} on ${category.name} compared with last month.`,
    });
  }

  const monthlyIncome = getTotalForRange(db, "income", curStart, curEnd);
  const monthlyExpenses = getTotalForRange(db, "expense", curStart, curEnd);
  if (monthlyIncome > 0) {
    const rate = savingsRate(monthlyIncome, monthlyExpenses);
    insights.push({
      id: "savings-rate",
      tag: "Savings rate",
      delta: `${rate}%`,
      tone: rate >= 0 ? "positive" : "negative",
      text:
        rate >= 0
          ? `You saved ${rate}% of your income this month.`
          : `You spent ${Math.abs(rate)}% more than you earned this month.`,
    });
  }

  const budgets = listBudgetsForMonth(db, referenceDate.getMonth() + 1, referenceDate.getFullYear());
  for (const budget of budgets) {
    const pct = budgetPercentage(budget.spent, budget.amount);
    if (pct < 90) continue;
    insights.push({
      id: `budget-${budget.id}`,
      tag: budget.category_name,
      delta: `${pct}%`,
      tone: pct >= 100 ? "negative" : "neutral",
      text: `${budget.category_name} has reached ${pct}% of its monthly budget.`,
    });
  }

  const priority: Record<Insight["tone"], number> = { negative: 0, neutral: 1, positive: 2 };
  insights.sort((a, b) => priority[a.tone] - priority[b.tone]);

  return insights.slice(0, MAX_INSIGHTS);
}
