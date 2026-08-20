import type Database from "better-sqlite3";
import type { Budget, BudgetInput, BudgetWithSpend } from "@shared/types";

/** Budgets for a given month joined with actual spend for that same month,
 * computed straight from transactions so it can never drift from reality. */
export function listBudgetsForMonth(
  db: Database.Database,
  month: number,
  year: number
): BudgetWithSpend[] {
  return db
    .prepare(
      `SELECT b.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
              COALESCE((
                SELECT SUM(t.amount) FROM transactions t
                WHERE t.category_id = b.category_id
                  AND t.type = 'expense'
                  AND CAST(strftime('%m', t.date) AS INTEGER) = b.month
                  AND CAST(strftime('%Y', t.date) AS INTEGER) = b.year
              ), 0) AS spent
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       WHERE b.month = ? AND b.year = ?
       ORDER BY spent DESC`
    )
    .all(month, year) as BudgetWithSpend[];
}

export function upsertBudget(db: Database.Database, input: BudgetInput): Budget {
  db.prepare(
    `INSERT INTO budgets (category_id, amount, month, year, updated_at)
     VALUES (@category_id, @amount, @month, @year, datetime('now'))
     ON CONFLICT(category_id, month, year)
     DO UPDATE SET amount = excluded.amount, updated_at = datetime('now')`
  ).run(input);

  return db
    .prepare("SELECT * FROM budgets WHERE category_id = ? AND month = ? AND year = ?")
    .get(input.category_id, input.month, input.year) as Budget;
}

export function deleteBudget(db: Database.Database, id: number): void {
  db.prepare("DELETE FROM budgets WHERE id = ?").run(id);
}
