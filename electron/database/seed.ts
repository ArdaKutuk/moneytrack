import type Database from "better-sqlite3";
import { addDays, formatISO, startOfMonth, subDays, subMonths } from "date-fns";
import { nextRecurringDate } from "@shared/calculations";

function iso(d: Date): string {
  return formatISO(d, { representation: "date" });
}

function categoryId(db: Database.Database, name: string, type: "income" | "expense"): number {
  const row = db
    .prepare("SELECT id FROM categories WHERE name = ? AND type = ?")
    .get(name, type) as { id: number } | undefined;
  if (!row) throw new Error(`Seed: category "${name}" (${type}) not found — run migrations first`);
  return row.id;
}

/** Development-only demo data: realistic transactions, budgets, bills and
 * debts spanning a few months so charts/reports have something to show.
 * Never invoked in a packaged production build — the IPC handler that calls
 * this is gated on `!app.isPackaged`. */
export function seedDemoData(db: Database.Database): void {
  const today = new Date();

  const insertTx = db.prepare(
    `INSERT INTO transactions (type, amount, description, category_id, date, account, note)
     VALUES (@type, @amount, @description, @category_id, @date, @account, @note)`
  );

  const seed = db.transaction(() => {
    // Wipe existing demo-able data (keeps categories/settings, which are seeded separately).
    db.prepare("DELETE FROM debt_payments").run();
    db.prepare("DELETE FROM transactions").run();
    db.prepare("DELETE FROM budgets").run();
    db.prepare("DELETE FROM bills").run();
    db.prepare("DELETE FROM debts").run();

    const food = categoryId(db, "Food", "expense");
    const transport = categoryId(db, "Transport", "expense");
    const shopping = categoryId(db, "Shopping", "expense");
    const entertainment = categoryId(db, "Entertainment", "expense");
    const bills = categoryId(db, "Bills", "expense");
    const health = categoryId(db, "Health", "expense");
    const salary = categoryId(db, "Salary", "income");
    const freelance = categoryId(db, "Freelance", "income");

    const accounts = ["Main Account", "Credit Card", "Cash"];
    const pick = <T,>(arr: T[], i: number) => arr[i % arr.length];

    // Six months of income + varied expenses.
    for (let m = 5; m >= 0; m--) {
      const monthDate = startOfMonth(subMonths(today, m));

      insertTx.run({
        type: "income",
        amount: 3250000,
        description: "Salary",
        category_id: salary,
        date: iso(addDays(monthDate, 0)),
        account: "Main Account",
        note: null,
      });
      if (m % 2 === 0) {
        insertTx.run({
          type: "income",
          amount: 450000,
          description: "Freelance project",
          category_id: freelance,
          date: iso(addDays(monthDate, 12)),
          account: "Main Account",
          note: null,
        });
      }

      const expenses: Array<[number, string, number, number]> = [
        [food, "Migros", 8420, 1],
        [food, "Local market", 6200, 8],
        [food, "Restaurant", 14500, 15],
        [transport, "Fuel", 68000, 3],
        [transport, "Metro card top-up", 40000, 10],
        [shopping, "Clothing", 234000, 6],
        [entertainment, "Streaming subscription", 22900, 5],
        [entertainment, "Cinema", 32000, 18],
        [bills, "Electricity", 124000, 20],
        [bills, "Internet", 65000, 22],
        [health, "Pharmacy", 18000, 14],
      ];

      expenses.forEach(([catId, desc, amount, dayOffset], i) => {
        insertTx.run({
          type: "expense",
          amount: Math.round(amount * (0.85 + ((m + i) % 4) * 0.1)),
          description: desc,
          category_id: catId,
          date: iso(addDays(monthDate, dayOffset)),
          account: pick(accounts, i + m),
          note: null,
        });
      });
    }

    // Current-month budgets.
    const budgetTargets: Array<[number, number]> = [
      [food, 700000],
      [transport, 400000],
      [shopping, 500000],
      [entertainment, 250000],
      [bills, 350000],
    ];
    const insertBudget = db.prepare(
      "INSERT INTO budgets (category_id, amount, month, year) VALUES (?, ?, ?, ?)"
    );
    for (const [catId, amount] of budgetTargets) {
      insertBudget.run(catId, amount, today.getMonth() + 1, today.getFullYear());
    }

    // Bills: a mix of overdue / due soon / upcoming / already paid.
    const insertBill = db.prepare(
      `INSERT INTO bills (name, amount, category_id, due_date, is_recurring, recurrence_frequency, status, last_paid_date)
       VALUES (@name, @amount, @category_id, @due_date, @is_recurring, @recurrence_frequency, @status, @last_paid_date)`
    );
    insertBill.run({
      name: "Internet",
      amount: 65000,
      category_id: bills,
      due_date: iso(addDays(today, 2)),
      is_recurring: 1,
      recurrence_frequency: "monthly",
      status: "upcoming",
      last_paid_date: null,
    });
    insertBill.run({
      name: "Water",
      amount: 31000,
      category_id: bills,
      due_date: iso(subDays(today, 6)),
      is_recurring: 1,
      recurrence_frequency: "monthly",
      status: "overdue",
      last_paid_date: null,
    });
    insertBill.run({
      name: "Rent",
      amount: 1800000,
      category_id: bills,
      due_date: iso(addDays(today, 12)),
      is_recurring: 1,
      recurrence_frequency: "monthly",
      status: "upcoming",
      last_paid_date: null,
    });
    insertBill.run({
      name: "Mobile Plan",
      amount: 42000,
      category_id: bills,
      due_date: nextRecurringDate(iso(subDays(today, 20)), "monthly"),
      is_recurring: 1,
      recurrence_frequency: "monthly",
      status: "paid",
      last_paid_date: iso(subDays(today, 20)),
    });

    // Debts with partial payment history.
    const insertDebt = db.prepare(
      `INSERT INTO debts (name, original_amount, remaining_amount, monthly_payment, due_date, note)
       VALUES (@name, @original_amount, @remaining_amount, @monthly_payment, @due_date, @note)`
    );
    const insertPayment = db.prepare(
      "INSERT INTO debt_payments (debt_id, amount, payment_date, note) VALUES (?, ?, ?, ?)"
    );

    const cc = insertDebt.run({
      name: "Credit Card",
      original_amount: 1250000,
      remaining_amount: 1000000,
      monthly_payment: 250000,
      due_date: iso(addDays(today, 16)),
      note: null,
    });
    insertPayment.run(cc.lastInsertRowid, 150000, iso(subDays(today, 40)), null);
    insertPayment.run(cc.lastInsertRowid, 100000, iso(subDays(today, 10)), null);

    const loan = insertDebt.run({
      name: "Personal Loan",
      original_amount: 2000000,
      remaining_amount: 1700000,
      monthly_payment: 300000,
      due_date: iso(addDays(today, 21)),
      note: "0% interest, 12 months",
    });
    insertPayment.run(loan.lastInsertRowid, 300000, iso(subDays(today, 30)), null);
  });

  seed();
}
