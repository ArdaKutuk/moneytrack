import type Database from "better-sqlite3";
import { formatISO } from "date-fns";
import type { DashboardSummary } from "@shared/types";
import { savingsRate, totalBalance } from "@shared/calculations";

function sumWhere(db: Database.Database, where: string, params: unknown[] = []): number {
  const row = db
    .prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM transactions ${where}`)
    .get(...params) as { total: number };
  return row.total;
}

export function getDashboardSummary(db: Database.Database, referenceDate: Date = new Date()): DashboardSummary {
  const monthStr = formatISO(referenceDate, { representation: "date" }).slice(0, 7); // YYYY-MM

  const totalIncome = sumWhere(db, "WHERE type = 'income'");
  const totalExpenses = sumWhere(db, "WHERE type = 'expense'");
  const monthlyIncome = sumWhere(db, "WHERE type = 'income' AND strftime('%Y-%m', date) = ?", [monthStr]);
  const monthlyExpenses = sumWhere(db, "WHERE type = 'expense' AND strftime('%Y-%m', date) = ?", [monthStr]);

  const totalDebtRow = db
    .prepare("SELECT COALESCE(SUM(remaining_amount), 0) AS total FROM debts")
    .get() as { total: number };

  const balance = totalBalance(totalIncome, totalExpenses);
  const monthlySavings = monthlyIncome - monthlyExpenses;

  return {
    totalBalance: balance,
    totalIncome,
    totalExpenses,
    monthlyIncome,
    monthlyExpenses,
    monthlySavings,
    savingsRate: savingsRate(monthlyIncome, monthlyExpenses),
    totalDebt: totalDebtRow.total,
    netWorth: balance - totalDebtRow.total,
  };
}
