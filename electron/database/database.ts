import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { app } from "electron";
import { runMigrations } from "./migrations";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "./schema";

let db: Database.Database | null = null;

/** Path to the SQLite file inside the OS's per-user app data directory.
 * Never inside the app's install/resources folder — that's read-only once
 * packaged and would also get wiped on reinstall/update. */
export function getDatabasePath(): string {
  return path.join(app.getPath("userData"), "moneytrack.db");
}

export function seedDefaultsIfEmpty(database: Database.Database): void {
  const categoryCount = (
    database.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number }
  ).count;

  if (categoryCount === 0) {
    const insert = database.prepare(
      "INSERT INTO categories (name, type, icon, color) VALUES (?, 'expense', ?, ?)"
    );
    const insertIncome = database.prepare(
      "INSERT INTO categories (name, type, icon, color) VALUES (?, 'income', ?, ?)"
    );
    const seedTx = database.transaction(() => {
      for (const c of DEFAULT_EXPENSE_CATEGORIES) insert.run(c.name, c.icon, c.color);
      for (const c of DEFAULT_INCOME_CATEGORIES) insertIncome.run(c.name, c.icon, c.color);
    });
    seedTx();
  }

  const settingsRow = database.prepare("SELECT id FROM settings WHERE id = 1").get();
  if (!settingsRow) {
    database
      .prepare(
        "INSERT INTO settings (id, currency, theme, week_start, date_format) VALUES (1, 'TRY', 'dark', 'monday', 'DD.MM.YYYY')"
      )
      .run();
  }
}

/** Opens (or creates) the database, applies migrations, and seeds first-run
 * defaults. Safe to call once at startup; subsequent calls return the same
 * open connection. */
export function getDatabase(): Database.Database {
  if (db) return db;

  const dbPath = getDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  runMigrations(db);
  seedDefaultsIfEmpty(db);

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
