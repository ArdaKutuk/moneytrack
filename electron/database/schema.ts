/** Initial schema (migration 1). All money columns are integer minor units. */
export const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income','expense')),
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('income','expense')),
  amount INTEGER NOT NULL CHECK(amount > 0),
  description TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  date TEXT NOT NULL,
  account TEXT NOT NULL DEFAULT '',
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  amount INTEGER NOT NULL CHECK(amount >= 0),
  month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(category_id, month, year)
);

CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK(amount > 0),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  due_date TEXT NOT NULL,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurrence_frequency TEXT CHECK(recurrence_frequency IN ('weekly','monthly','yearly') OR recurrence_frequency IS NULL),
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming','paid','overdue')),
  last_paid_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS debts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  original_amount INTEGER NOT NULL CHECK(original_amount > 0),
  remaining_amount INTEGER NOT NULL CHECK(remaining_amount >= 0),
  monthly_payment INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS debt_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  debt_id INTEGER NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK(amount > 0),
  payment_date TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  currency TEXT NOT NULL DEFAULT 'TRY',
  theme TEXT NOT NULL DEFAULT 'dark',
  week_start TEXT NOT NULL DEFAULT 'monday',
  date_format TEXT NOT NULL DEFAULT 'DD.MM.YYYY'
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(year, month);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments(debt_id);
`;

export const DEFAULT_EXPENSE_CATEGORIES: Array<{ name: string; icon: string; color: string }> = [
  { name: "Food", icon: "utensils", color: "#f97362" },
  { name: "Transport", icon: "car", color: "#60a5fa" },
  { name: "Shopping", icon: "shopping-bag", color: "#a78bfa" },
  { name: "Entertainment", icon: "film", color: "#f472b6" },
  { name: "Bills", icon: "receipt", color: "#fbbf24" },
  { name: "Health", icon: "heart-pulse", color: "#2dd4bf" },
  { name: "Education", icon: "graduation-cap", color: "#818cf8" },
  { name: "Other", icon: "more-horizontal", color: "#8b929e" },
];

export const DEFAULT_INCOME_CATEGORIES: Array<{ name: string; icon: string; color: string }> = [
  { name: "Salary", icon: "wallet", color: "#34d399" },
  { name: "Freelance", icon: "briefcase", color: "#60a5fa" },
  { name: "Investment", icon: "trending-up", color: "#a78bfa" },
  { name: "Gift", icon: "gift", color: "#f472b6" },
  { name: "Other Income", icon: "plus-circle", color: "#fbbf24" },
];
