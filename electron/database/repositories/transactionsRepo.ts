import type Database from "better-sqlite3";
import type { Transaction, TransactionInput, TransactionFilters, TransactionWithCategory } from "@shared/types";

const SELECT_WITH_CATEGORY = `
  SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
  FROM transactions t
  JOIN categories c ON c.id = t.category_id
`;

export function listTransactions(
  db: Database.Database,
  filters: TransactionFilters = {}
): TransactionWithCategory[] {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters.type && filters.type !== "all") {
    clauses.push("t.type = @type");
    params.type = filters.type;
  }
  if (filters.categoryId && filters.categoryId !== "all") {
    clauses.push("t.category_id = @categoryId");
    params.categoryId = filters.categoryId;
  }
  if (filters.startDate) {
    clauses.push("t.date >= @startDate");
    params.startDate = filters.startDate;
  }
  if (filters.endDate) {
    clauses.push("t.date <= @endDate");
    params.endDate = filters.endDate;
  }
  if (filters.search && filters.search.trim()) {
    clauses.push("(t.description LIKE @search OR c.name LIKE @search OR t.account LIKE @search)");
    params.search = `%${filters.search.trim()}%`;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const orderBy =
    filters.sort === "oldest"
      ? "ORDER BY t.date ASC, t.id ASC"
      : filters.sort === "highest"
        ? "ORDER BY t.amount DESC"
        : filters.sort === "lowest"
          ? "ORDER BY t.amount ASC"
          : "ORDER BY t.date DESC, t.id DESC";

  const sql = `${SELECT_WITH_CATEGORY} ${where} ${orderBy}`;
  return db.prepare(sql).all(params) as TransactionWithCategory[];
}

export function getTransaction(db: Database.Database, id: number): TransactionWithCategory | undefined {
  return db
    .prepare(`${SELECT_WITH_CATEGORY} WHERE t.id = ?`)
    .get(id) as TransactionWithCategory | undefined;
}

export function createTransaction(db: Database.Database, input: TransactionInput): Transaction {
  const result = db
    .prepare(
      `INSERT INTO transactions (type, amount, description, category_id, date, account, note, updated_at)
       VALUES (@type, @amount, @description, @category_id, @date, @account, @note, datetime('now'))`
    )
    .run({ ...input, note: input.note ?? null });
  return db.prepare("SELECT * FROM transactions WHERE id = ?").get(result.lastInsertRowid) as Transaction;
}

export function updateTransaction(
  db: Database.Database,
  id: number,
  input: TransactionInput
): Transaction {
  db.prepare(
    `UPDATE transactions
     SET type = @type, amount = @amount, description = @description, category_id = @category_id,
         date = @date, account = @account, note = @note, updated_at = datetime('now')
     WHERE id = @id`
  ).run({ ...input, note: input.note ?? null, id });
  return db.prepare("SELECT * FROM transactions WHERE id = ?").get(id) as Transaction;
}

export function deleteTransaction(db: Database.Database, id: number): void {
  db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
}

/** All transactions, unfiltered — used by dashboard/report aggregations
 * that need to compute over multiple date ranges in one pass. */
export function listAllTransactionsRaw(db: Database.Database): Transaction[] {
  return db.prepare("SELECT * FROM transactions").all() as Transaction[];
}

export function createExpenseFromPayment(
  db: Database.Database,
  params: { description: string; amount: number; categoryId: number; date: string; account: string; note?: string | null }
): Transaction {
  return createTransaction(db, {
    type: "expense",
    amount: params.amount,
    description: params.description,
    category_id: params.categoryId,
    date: params.date,
    account: params.account,
    note: params.note ?? null,
  });
}
