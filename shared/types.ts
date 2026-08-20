/**
 * Shared type contract between the Electron main process and the React
 * renderer. Imported by both `electron/**` (compiled with tsconfig.electron.json)
 * and `src/**` (compiled with tsconfig.json) — this is the single source of
 * truth for the IPC boundary, so the two sides can never silently drift apart.
 */

export type TransactionType = "income" | "expense";

export type Theme = "dark" | "light" | "system";

export type WeekStart = "monday" | "sunday";

export type DateFormat = "DD.MM.YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";

export type BillStatus = "upcoming" | "paid" | "overdue";

export type RecurrenceFrequency = "weekly" | "monthly" | "yearly";

/** All monetary amounts are integer minor units (e.g. kuruş for TRY). Never float. */
export type MinorUnits = number;

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  created_at: string;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: MinorUnits;
  description: string;
  category_id: number;
  date: string; // ISO date, YYYY-MM-DD
  account: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionWithCategory extends Transaction {
  category_name: string;
  category_icon: string;
  category_color: string;
}

export type TransactionInput = Omit<Transaction, "id" | "created_at" | "updated_at">;

export interface Budget {
  id: number;
  category_id: number;
  amount: MinorUnits;
  month: number; // 1-12
  year: number;
  created_at: string;
  updated_at: string;
}

export type BudgetInput = Omit<Budget, "id" | "created_at" | "updated_at">;

export interface BudgetWithSpend extends Budget {
  category_name: string;
  category_icon: string;
  category_color: string;
  spent: MinorUnits;
}

export interface Bill {
  id: number;
  name: string;
  amount: MinorUnits;
  category_id: number;
  due_date: string; // ISO date
  is_recurring: 0 | 1;
  recurrence_frequency: RecurrenceFrequency | null;
  status: BillStatus;
  last_paid_date: string | null;
  created_at: string;
  updated_at: string;
}

export type BillInput = Omit<
  Bill,
  "id" | "created_at" | "updated_at" | "status" | "last_paid_date"
>;

export interface BillWithCategory extends Bill {
  category_name: string;
  category_icon: string;
  category_color: string;
}

export interface Debt {
  id: number;
  name: string;
  original_amount: MinorUnits;
  remaining_amount: MinorUnits;
  monthly_payment: MinorUnits;
  due_date: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export type DebtInput = Omit<
  Debt,
  "id" | "created_at" | "updated_at" | "remaining_amount"
>;

export interface DebtPayment {
  id: number;
  debt_id: number;
  amount: MinorUnits;
  payment_date: string;
  note: string | null;
  created_at: string;
}

export type DebtPaymentInput = Omit<DebtPayment, "id" | "created_at">;

export interface Settings {
  id: number;
  currency: string;
  theme: Theme;
  week_start: WeekStart;
  date_format: DateFormat;
}

export type SettingsInput = Partial<Omit<Settings, "id">>;

/** Every IPC call resolves to this shape — never throws across the bridge. */
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface MarkBillPaidOptions {
  createExpense: boolean;
  paymentDate: string;
  account?: string;
}

export interface RecordDebtPaymentOptions {
  debtId: number;
  amount: MinorUnits;
  paymentDate: string;
  note: string | null;
  createExpense: boolean;
  categoryId?: number;
  account?: string;
}

export interface DashboardSummary {
  totalBalance: MinorUnits;
  totalIncome: MinorUnits;
  totalExpenses: MinorUnits;
  monthlyIncome: MinorUnits;
  monthlyExpenses: MinorUnits;
  monthlySavings: MinorUnits;
  savingsRate: number; // 0-100
  totalDebt: MinorUnits;
  netWorth: MinorUnits;
}

export interface CategorySpend {
  category_id: number;
  category_name: string;
  color: string;
  icon: string;
  total: MinorUnits;
}

export interface TimeSeriesPoint {
  label: string;
  date: string;
  income: MinorUnits;
  expense: MinorUnits;
}

export type ReportRange = "Week" | "Month" | "3 Months" | "6 Months" | "Year";

export interface Insight {
  id: string;
  tag: string;
  delta: string;
  tone: "positive" | "negative" | "neutral";
  text: string;
}

export interface TransactionFilters {
  search?: string;
  type?: TransactionType | "all";
  categoryId?: number | "all";
  startDate?: string;
  endDate?: string;
  sort?: "newest" | "oldest" | "highest" | "lowest";
}

export interface ExportOptions {
  format: "csv" | "json";
}

export interface BackupResult {
  filePath: string;
}

export interface ImportPreview {
  transactions: number;
  categories: number;
  budgets: number;
  bills: number;
  debts: number;
}

/** Full logical snapshot used by JSON export/import and reset validation. */
export interface DataSnapshot {
  version: 1;
  exportedAt: string;
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  bills: Bill[];
  debts: Debt[];
  debtPayments: DebtPayment[];
  settings: Settings;
}
