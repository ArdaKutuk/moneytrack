import type Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { format } from "date-fns";
import { dialog, type BrowserWindow } from "electron";
import type { BackupResult, DataSnapshot } from "@shared/types";
import { getDatabasePath, seedDefaultsIfEmpty } from "../database/database";
import { listCategories } from "../database/repositories/categoriesRepo";
import { getSettings } from "../database/repositories/settingsRepo";

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function buildTransactionsCsv(db: Database.Database): string {
  const rows = db
    .prepare(
      `SELECT t.date, t.type, c.name AS category, t.description, t.account, t.amount, t.note
       FROM transactions t JOIN categories c ON c.id = t.category_id
       ORDER BY t.date DESC, t.id DESC`
    )
    .all() as Array<{
    date: string;
    type: string;
    category: string;
    description: string;
    account: string;
    amount: number;
    note: string | null;
  }>;

  const header = ["Date", "Type", "Category", "Description", "Account", "Amount (minor units)", "Note"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [r.date, r.type, r.category, r.description, r.account, r.amount, r.note ?? ""]
        .map(csvEscape)
        .join(",")
    );
  }
  return lines.join("\n");
}

export function buildDataSnapshot(db: Database.Database): DataSnapshot {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: listCategories(db),
    transactions: db.prepare("SELECT * FROM transactions").all() as DataSnapshot["transactions"],
    budgets: db.prepare("SELECT * FROM budgets").all() as DataSnapshot["budgets"],
    bills: db.prepare("SELECT * FROM bills").all() as DataSnapshot["bills"],
    debts: db.prepare("SELECT * FROM debts").all() as DataSnapshot["debts"],
    debtPayments: db.prepare("SELECT * FROM debt_payments").all() as DataSnapshot["debtPayments"],
    settings: getSettings(db),
  };
}

/** Prompts a native Save dialog and writes the requested export format.
 * Returns null if the user cancels. */
export async function exportData(
  db: Database.Database,
  win: BrowserWindow,
  exportFormat: "csv" | "json"
): Promise<{ filePath: string } | null> {
  const defaultName = `moneytrack-export-${format(new Date(), "yyyy-MM-dd")}.${exportFormat}`;
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: "Export Moneytrack Data",
    defaultPath: defaultName,
    filters:
      exportFormat === "csv"
        ? [{ name: "CSV", extensions: ["csv"] }]
        : [{ name: "JSON", extensions: ["json"] }],
  });
  if (canceled || !filePath) return null;

  const content =
    exportFormat === "csv"
      ? buildTransactionsCsv(db)
      : JSON.stringify(buildDataSnapshot(db), null, 2);

  fs.writeFileSync(filePath, content, "utf-8");
  return { filePath };
}

/** Prompts a native Save dialog and copies a consistent snapshot of the
 * live SQLite file to the chosen location using better-sqlite3's backup API
 * (safe under WAL, doesn't require closing the live connection). */
export async function backupDatabase(db: Database.Database, win: BrowserWindow): Promise<BackupResult | null> {
  const defaultName = `moneytrack-backup-${format(new Date(), "yyyy-MM-dd")}.db`;
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: "Back Up Moneytrack Database",
    defaultPath: defaultName,
    filters: [{ name: "SQLite Database", extensions: ["db"] }],
  });
  if (canceled || !filePath) return null;

  await db.backup(filePath);
  return { filePath };
}

function fail(message: string): never {
  throw new Error(message);
}

/** Hand-rolled structural validation — deliberately not a schema library,
 * this is the only place import data gets checked before it ever touches
 * the database. Throws with a human-readable reason on the first problem. */
export function validateDataSnapshot(data: unknown): asserts data is DataSnapshot {
  if (typeof data !== "object" || data === null) fail("Import file is not a valid JSON object.");
  const d = data as Record<string, unknown>;

  if (d.version !== 1) fail("Unsupported or missing export version.");

  const arrayFields = ["categories", "transactions", "budgets", "bills", "debts", "debtPayments"] as const;
  for (const field of arrayFields) {
    if (!Array.isArray(d[field])) fail(`Missing or invalid "${field}" array.`);
  }

  if (typeof d.settings !== "object" || d.settings === null) fail("Missing or invalid settings object.");
  const settings = d.settings as Record<string, unknown>;
  for (const key of ["currency", "theme", "week_start", "date_format"]) {
    if (typeof settings[key] !== "string") fail(`Settings is missing "${key}".`);
  }

  for (const c of d.categories as unknown[]) {
    const cat = c as Record<string, unknown>;
    if (typeof cat.id !== "number" || typeof cat.name !== "string" || (cat.type !== "income" && cat.type !== "expense")) {
      fail("A category entry is malformed.");
    }
  }

  for (const t of d.transactions as unknown[]) {
    const tx = t as Record<string, unknown>;
    if (
      typeof tx.id !== "number" ||
      (tx.type !== "income" && tx.type !== "expense") ||
      typeof tx.amount !== "number" ||
      tx.amount <= 0 ||
      typeof tx.description !== "string" ||
      typeof tx.category_id !== "number" ||
      typeof tx.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(tx.date)
    ) {
      fail("A transaction entry is malformed.");
    }
  }
}

/** Replaces all application data with the contents of a validated snapshot.
 * Runs inside a single SQLite transaction: if anything throws partway
 * through, better-sqlite3 rolls the whole thing back and the existing
 * database is left untouched. */
export function importDataSnapshot(db: Database.Database, snapshot: DataSnapshot): void {
  const run = db.transaction(() => {
    db.prepare("DELETE FROM debt_payments").run();
    db.prepare("DELETE FROM transactions").run();
    db.prepare("DELETE FROM budgets").run();
    db.prepare("DELETE FROM bills").run();
    db.prepare("DELETE FROM debts").run();
    db.prepare("DELETE FROM categories").run();

    const insertCategory = db.prepare(
      "INSERT INTO categories (id, name, type, icon, color, created_at) VALUES (@id, @name, @type, @icon, @color, @created_at)"
    );
    for (const c of snapshot.categories) insertCategory.run(c);

    const insertTx = db.prepare(
      `INSERT INTO transactions (id, type, amount, description, category_id, date, account, note, created_at, updated_at)
       VALUES (@id, @type, @amount, @description, @category_id, @date, @account, @note, @created_at, @updated_at)`
    );
    for (const t of snapshot.transactions) insertTx.run(t);

    const insertBudget = db.prepare(
      `INSERT INTO budgets (id, category_id, amount, month, year, created_at, updated_at)
       VALUES (@id, @category_id, @amount, @month, @year, @created_at, @updated_at)`
    );
    for (const b of snapshot.budgets) insertBudget.run(b);

    const insertBill = db.prepare(
      `INSERT INTO bills (id, name, amount, category_id, due_date, is_recurring, recurrence_frequency, status, last_paid_date, created_at, updated_at)
       VALUES (@id, @name, @amount, @category_id, @due_date, @is_recurring, @recurrence_frequency, @status, @last_paid_date, @created_at, @updated_at)`
    );
    for (const b of snapshot.bills) insertBill.run(b);

    const insertDebt = db.prepare(
      `INSERT INTO debts (id, name, original_amount, remaining_amount, monthly_payment, due_date, note, created_at, updated_at)
       VALUES (@id, @name, @original_amount, @remaining_amount, @monthly_payment, @due_date, @note, @created_at, @updated_at)`
    );
    for (const d of snapshot.debts) insertDebt.run(d);

    const insertPayment = db.prepare(
      `INSERT INTO debt_payments (id, debt_id, amount, payment_date, note, created_at)
       VALUES (@id, @debt_id, @amount, @payment_date, @note, @created_at)`
    );
    for (const p of snapshot.debtPayments) insertPayment.run(p);

    db.prepare(
      "UPDATE settings SET currency = @currency, theme = @theme, week_start = @week_start, date_format = @date_format WHERE id = 1"
    ).run(snapshot.settings);
  });

  run();
}

/** Prompts a native Open dialog, reads + validates the file, and imports it.
 * Returns null if the user cancels; throws on invalid/corrupt input, before
 * any write has happened. */
export async function importDataFromFile(db: Database.Database, win: BrowserWindow): Promise<void | null> {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: "Import Moneytrack Data",
    filters: [{ name: "JSON", extensions: ["json"] }],
    properties: ["openFile"],
  });
  if (canceled || filePaths.length === 0) return null;

  const raw = fs.readFileSync(filePaths[0], "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    fail("Selected file is not valid JSON.");
  }
  validateDataSnapshot(parsed);
  importDataSnapshot(db, parsed);
}

/** Wipes every table and reseeds first-run defaults (default categories +
 * settings). Destructive — the renderer must have already confirmed with
 * the user before this is ever called. */
export function resetApplicationData(db: Database.Database): void {
  const run = db.transaction(() => {
    db.prepare("DELETE FROM debt_payments").run();
    db.prepare("DELETE FROM transactions").run();
    db.prepare("DELETE FROM budgets").run();
    db.prepare("DELETE FROM bills").run();
    db.prepare("DELETE FROM debts").run();
    db.prepare("DELETE FROM categories").run();
    db.prepare("DELETE FROM settings").run();
    seedDefaultsIfEmpty(db);
  });
  run();
}

export function getDatabaseFilePath(): string {
  return getDatabasePath();
}

export function ensureDir(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}
