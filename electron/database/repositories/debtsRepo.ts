import type Database from "better-sqlite3";
import type { Debt, DebtInput, DebtPayment, RecordDebtPaymentOptions, Transaction } from "@shared/types";
import { applyDebtPayment } from "@shared/calculations";
import { createExpenseFromPayment } from "./transactionsRepo";

export function listDebts(db: Database.Database): Debt[] {
  return db.prepare("SELECT * FROM debts ORDER BY due_date ASC").all() as Debt[];
}

export function getDebt(db: Database.Database, id: number): Debt | undefined {
  return db.prepare("SELECT * FROM debts WHERE id = ?").get(id) as Debt | undefined;
}

export function createDebt(db: Database.Database, input: DebtInput): Debt {
  const result = db
    .prepare(
      `INSERT INTO debts (name, original_amount, remaining_amount, monthly_payment, due_date, note, updated_at)
       VALUES (@name, @original_amount, @original_amount, @monthly_payment, @due_date, @note, datetime('now'))`
    )
    .run({ ...input, note: input.note ?? null });
  return db.prepare("SELECT * FROM debts WHERE id = ?").get(result.lastInsertRowid) as Debt;
}

export function updateDebt(db: Database.Database, id: number, input: DebtInput): Debt {
  db.prepare(
    `UPDATE debts
     SET name = @name, original_amount = @original_amount, monthly_payment = @monthly_payment,
         due_date = @due_date, note = @note, updated_at = datetime('now')
     WHERE id = @id`
  ).run({ ...input, note: input.note ?? null, id });
  return db.prepare("SELECT * FROM debts WHERE id = ?").get(id) as Debt;
}

export function deleteDebt(db: Database.Database, id: number): void {
  db.prepare("DELETE FROM debts WHERE id = ?").run(id);
}

export function listDebtPayments(db: Database.Database, debtId: number): DebtPayment[] {
  return db
    .prepare("SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY payment_date DESC, id DESC")
    .all(debtId) as DebtPayment[];
}

function fallbackExpenseCategoryId(db: Database.Database): number {
  const row = db
    .prepare("SELECT id FROM categories WHERE type = 'expense' AND name = 'Other' LIMIT 1")
    .get() as { id: number } | undefined;
  if (row) return row.id;
  const any = db.prepare("SELECT id FROM categories WHERE type = 'expense' LIMIT 1").get() as
    | { id: number }
    | undefined;
  if (!any) throw new Error("No expense category available to attach debt payment expense to");
  return any.id;
}

export interface RecordDebtPaymentResult {
  debt: Debt;
  payment: DebtPayment;
  transaction: Transaction | null;
}

/** Applies a payment to a debt (never below zero remaining), records it in
 * debt_payments, and — only if the caller opts in — creates a matching
 * expense transaction. */
export function recordDebtPayment(
  db: Database.Database,
  options: RecordDebtPaymentOptions
): RecordDebtPaymentResult {
  const debt = getDebt(db, options.debtId);
  if (!debt) throw new Error(`Debt ${options.debtId} not found`);

  const run = db.transaction(() => {
    const newRemaining = applyDebtPayment(debt.remaining_amount, options.amount);
    db.prepare(
      "UPDATE debts SET remaining_amount = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(newRemaining, debt.id);

    const paymentResult = db
      .prepare(
        "INSERT INTO debt_payments (debt_id, amount, payment_date, note) VALUES (?, ?, ?, ?)"
      )
      .run(debt.id, options.amount, options.paymentDate, options.note ?? null);
    const payment = db
      .prepare("SELECT * FROM debt_payments WHERE id = ?")
      .get(paymentResult.lastInsertRowid) as DebtPayment;

    let transaction: Transaction | null = null;
    if (options.createExpense) {
      transaction = createExpenseFromPayment(db, {
        description: `${debt.name} payment`,
        amount: options.amount,
        categoryId: options.categoryId ?? fallbackExpenseCategoryId(db),
        date: options.paymentDate,
        account: options.account ?? "Cash",
        note: options.note ?? "Debt payment",
      });
    }

    const updatedDebt = getDebt(db, debt.id)!;
    return { debt: updatedDebt, payment, transaction };
  });

  return run();
}
