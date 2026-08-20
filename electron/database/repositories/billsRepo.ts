import type Database from "better-sqlite3";
import { formatISO } from "date-fns";
import type { Bill, BillInput, BillWithCategory, MarkBillPaidOptions, Transaction } from "@shared/types";
import { nextRecurringDate } from "@shared/calculations";
import { createExpenseFromPayment } from "./transactionsRepo";

const SELECT_WITH_CATEGORY = `
  SELECT b.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
  FROM bills b
  JOIN categories c ON c.id = b.category_id
`;

function todayISO(): string {
  return formatISO(new Date(), { representation: "date" });
}

/** Recomputes overdue status for any bill whose due date has passed —
 * called before every read so the list is always accurate without a
 * background job. */
function refreshOverdueStatuses(db: Database.Database): void {
  db.prepare(
    `UPDATE bills SET status = 'overdue', updated_at = datetime('now')
     WHERE status = 'upcoming' AND due_date < ?`
  ).run(todayISO());
}

export function listBills(db: Database.Database): BillWithCategory[] {
  refreshOverdueStatuses(db);
  return db.prepare(`${SELECT_WITH_CATEGORY} ORDER BY b.due_date ASC`).all() as BillWithCategory[];
}

export function getBill(db: Database.Database, id: number): Bill | undefined {
  return db.prepare("SELECT * FROM bills WHERE id = ?").get(id) as Bill | undefined;
}

export function createBill(db: Database.Database, input: BillInput): Bill {
  const result = db
    .prepare(
      `INSERT INTO bills (name, amount, category_id, due_date, is_recurring, recurrence_frequency, status, updated_at)
       VALUES (@name, @amount, @category_id, @due_date, @is_recurring, @recurrence_frequency, 'upcoming', datetime('now'))`
    )
    .run({ ...input, recurrence_frequency: input.is_recurring ? input.recurrence_frequency : null });
  return db.prepare("SELECT * FROM bills WHERE id = ?").get(result.lastInsertRowid) as Bill;
}

export function updateBill(db: Database.Database, id: number, input: BillInput): Bill {
  db.prepare(
    `UPDATE bills
     SET name = @name, amount = @amount, category_id = @category_id, due_date = @due_date,
         is_recurring = @is_recurring, recurrence_frequency = @recurrence_frequency, updated_at = datetime('now')
     WHERE id = @id`
  ).run({ ...input, recurrence_frequency: input.is_recurring ? input.recurrence_frequency : null, id });
  return db.prepare("SELECT * FROM bills WHERE id = ?").get(id) as Bill;
}

export function deleteBill(db: Database.Database, id: number): void {
  db.prepare("DELETE FROM bills WHERE id = ?").run(id);
}

export interface MarkBillPaidResult {
  bill: Bill;
  transaction: Transaction | null;
}

/** Marks a bill paid, rolls a recurring bill's due date forward, and —
 * only if the caller opts in — records the payment as an expense
 * transaction. Never silently touches the user's balance. */
export function markBillPaid(
  db: Database.Database,
  id: number,
  options: MarkBillPaidOptions
): MarkBillPaidResult {
  const bill = getBill(db, id);
  if (!bill) throw new Error(`Bill ${id} not found`);

  const run = db.transaction(() => {
    if (bill.is_recurring && bill.recurrence_frequency) {
      const nextDue = nextRecurringDate(bill.due_date, bill.recurrence_frequency);
      db.prepare(
        `UPDATE bills SET status = 'upcoming', due_date = ?, last_paid_date = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(nextDue, options.paymentDate, id);
    } else {
      db.prepare(
        `UPDATE bills SET status = 'paid', last_paid_date = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(options.paymentDate, id);
    }

    let transaction: Transaction | null = null;
    if (options.createExpense) {
      transaction = createExpenseFromPayment(db, {
        description: bill.name,
        amount: bill.amount,
        categoryId: bill.category_id,
        date: options.paymentDate,
        account: options.account ?? "Cash",
        note: "Bill payment",
      });
    }

    const updatedBill = getBill(db, id)!;
    return { bill: updatedBill, transaction };
  });

  return run();
}
