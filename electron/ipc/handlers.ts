import { app, ipcMain, type BrowserWindow } from "electron";
import type Database from "better-sqlite3";
import { IPC } from "@shared/ipc-channels";
import type {
  ApiResult,
  BillInput,
  BudgetInput,
  DebtInput,
  MarkBillPaidOptions,
  RecordDebtPaymentOptions,
  ReportRange,
  SettingsInput,
  TransactionFilters,
  TransactionInput,
} from "@shared/types";
import { logError } from "../utils/logger";
import { assertField, isNonEmptyString, isNonNegativeInt, isOneOf, isPositiveInt, isISODate, ValidationError } from "../utils/validate";
import * as transactionsRepo from "../database/repositories/transactionsRepo";
import * as categoriesRepo from "../database/repositories/categoriesRepo";
import * as budgetsRepo from "../database/repositories/budgetsRepo";
import * as billsRepo from "../database/repositories/billsRepo";
import * as debtsRepo from "../database/repositories/debtsRepo";
import * as settingsRepo from "../database/repositories/settingsRepo";
import * as dashboardRepo from "../database/repositories/dashboardRepo";
import * as reportsRepo from "../database/repositories/reportsRepo";
import { generateInsights } from "../services/insightsEngine";
import { backupDatabase, exportData, importDataFromFile, resetApplicationData } from "../services/dataService";
import { seedDemoData } from "../database/seed";

const TRANSACTION_TYPES = ["income", "expense"] as const;
const RECURRENCE = ["weekly", "monthly", "yearly"] as const;
const THEMES = ["dark", "light", "system"] as const;
const WEEK_STARTS = ["monday", "sunday"] as const;
const DATE_FORMATS = ["DD.MM.YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const;
const REPORT_RANGES: ReportRange[] = ["Week", "Month", "3 Months", "6 Months", "Year"];

function validateTransactionInput(input: unknown): asserts input is TransactionInput {
  const t = input as Partial<TransactionInput> | null;
  assertField(!!t && typeof t === "object", "Transaction payload is missing.");
  assertField(isOneOf(t!.type, TRANSACTION_TYPES), "Transaction type must be income or expense.");
  assertField(isPositiveInt(t!.amount), "Amount must be a positive whole number of minor units.");
  assertField(isNonEmptyString(t!.description), "Description is required.");
  assertField(isPositiveInt(t!.category_id), "Category is required.");
  assertField(isISODate(t!.date), "A valid date is required.");
}

function validateBudgetInput(input: unknown): asserts input is BudgetInput {
  const b = input as Partial<BudgetInput> | null;
  assertField(!!b && typeof b === "object", "Budget payload is missing.");
  assertField(isPositiveInt(b!.category_id), "Category is required.");
  assertField(isNonNegativeInt(b!.amount), "Budget amount must be zero or more.");
  assertField(typeof b!.month === "number" && b!.month >= 1 && b!.month <= 12, "Month must be 1-12.");
  assertField(typeof b!.year === "number" && b!.year >= 2000 && b!.year <= 2100, "Year is invalid.");
}

function validateBillInput(input: unknown): asserts input is BillInput {
  const b = input as Partial<BillInput> | null;
  assertField(!!b && typeof b === "object", "Bill payload is missing.");
  assertField(isNonEmptyString(b!.name), "Bill name is required.");
  assertField(isPositiveInt(b!.amount), "Amount must be a positive whole number of minor units.");
  assertField(isPositiveInt(b!.category_id), "Category is required.");
  assertField(isISODate(b!.due_date), "A valid due date is required.");
  assertField(b!.is_recurring === 0 || b!.is_recurring === 1, "is_recurring must be 0 or 1.");
  if (b!.is_recurring === 1) {
    assertField(isOneOf(b!.recurrence_frequency, RECURRENCE), "Recurrence frequency is required for recurring bills.");
  }
}

function validateDebtInput(input: unknown): asserts input is DebtInput {
  const d = input as Partial<DebtInput> | null;
  assertField(!!d && typeof d === "object", "Debt payload is missing.");
  assertField(isNonEmptyString(d!.name), "Debt name is required.");
  assertField(isPositiveInt(d!.original_amount), "Original amount must be a positive whole number of minor units.");
  assertField(isNonNegativeInt(d!.monthly_payment), "Monthly payment must be zero or more.");
}

/** Wraps a handler so it always resolves to an ApiResult — the renderer
 * never has to catch a rejected IPC promise for an expected failure (bad
 * input, DB constraint, cancelled dialog). Unexpected errors are logged
 * locally (error only, never the request payload). */
function handle<Args extends unknown[], T>(
  channel: string,
  fn: (...args: Args) => T | Promise<T>
): void {
  ipcMain.handle(channel, async (_event, ...args: Args): Promise<ApiResult<T>> => {
    try {
      const data = await fn(...args);
      return { success: true, data };
    } catch (error) {
      if (!(error instanceof ValidationError)) logError(channel, error);
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return { success: false, error: message };
    }
  });
}

export function registerIpcHandlers(db: Database.Database, getWindow: () => BrowserWindow | null): void {
  handle(IPC.transactions.list, (filters: TransactionFilters) => transactionsRepo.listTransactions(db, filters));
  handle(IPC.transactions.get, (id: number) => {
    assertField(isPositiveInt(id), "Invalid transaction id.");
    const tx = transactionsRepo.getTransaction(db, id);
    assertField(!!tx, "Transaction not found.");
    return tx;
  });
  handle(IPC.transactions.create, (input: TransactionInput) => {
    validateTransactionInput(input);
    return transactionsRepo.createTransaction(db, input);
  });
  handle(IPC.transactions.update, (id: number, input: TransactionInput) => {
    assertField(isPositiveInt(id), "Invalid transaction id.");
    validateTransactionInput(input);
    return transactionsRepo.updateTransaction(db, id, input);
  });
  handle(IPC.transactions.delete, (id: number) => {
    assertField(isPositiveInt(id), "Invalid transaction id.");
    transactionsRepo.deleteTransaction(db, id);
    return null;
  });

  handle(IPC.categories.list, () => categoriesRepo.listCategories(db));

  handle(IPC.budgets.listForMonth, (month: number, year: number) => {
    assertField(typeof month === "number" && month >= 1 && month <= 12, "Invalid month.");
    assertField(typeof year === "number", "Invalid year.");
    return budgetsRepo.listBudgetsForMonth(db, month, year);
  });
  handle(IPC.budgets.upsert, (input: BudgetInput) => {
    validateBudgetInput(input);
    return budgetsRepo.upsertBudget(db, input);
  });
  handle(IPC.budgets.delete, (id: number) => {
    assertField(isPositiveInt(id), "Invalid budget id.");
    budgetsRepo.deleteBudget(db, id);
    return null;
  });

  handle(IPC.bills.list, () => billsRepo.listBills(db));
  handle(IPC.bills.create, (input: BillInput) => {
    validateBillInput(input);
    return billsRepo.createBill(db, input);
  });
  handle(IPC.bills.update, (id: number, input: BillInput) => {
    assertField(isPositiveInt(id), "Invalid bill id.");
    validateBillInput(input);
    return billsRepo.updateBill(db, id, input);
  });
  handle(IPC.bills.delete, (id: number) => {
    assertField(isPositiveInt(id), "Invalid bill id.");
    billsRepo.deleteBill(db, id);
    return null;
  });
  handle(IPC.bills.markPaid, (id: number, options: MarkBillPaidOptions) => {
    assertField(isPositiveInt(id), "Invalid bill id.");
    assertField(isISODate(options?.paymentDate), "A valid payment date is required.");
    assertField(typeof options?.createExpense === "boolean", "createExpense must be a boolean.");
    return billsRepo.markBillPaid(db, id, options);
  });

  handle(IPC.debts.list, () => debtsRepo.listDebts(db));
  handle(IPC.debts.create, (input: DebtInput) => {
    validateDebtInput(input);
    return debtsRepo.createDebt(db, input);
  });
  handle(IPC.debts.update, (id: number, input: DebtInput) => {
    assertField(isPositiveInt(id), "Invalid debt id.");
    validateDebtInput(input);
    return debtsRepo.updateDebt(db, id, input);
  });
  handle(IPC.debts.delete, (id: number) => {
    assertField(isPositiveInt(id), "Invalid debt id.");
    debtsRepo.deleteDebt(db, id);
    return null;
  });
  handle(IPC.debts.payments, (debtId: number) => {
    assertField(isPositiveInt(debtId), "Invalid debt id.");
    return debtsRepo.listDebtPayments(db, debtId);
  });
  handle(IPC.debts.recordPayment, (options: RecordDebtPaymentOptions) => {
    assertField(isPositiveInt(options?.debtId), "Invalid debt id.");
    assertField(isPositiveInt(options?.amount), "Payment amount must be a positive whole number of minor units.");
    assertField(isISODate(options?.paymentDate), "A valid payment date is required.");
    assertField(typeof options?.createExpense === "boolean", "createExpense must be a boolean.");
    return debtsRepo.recordDebtPayment(db, options);
  });

  handle(IPC.settings.get, () => settingsRepo.getSettings(db));
  handle(IPC.settings.update, (input: SettingsInput) => {
    if (input.theme !== undefined) assertField(isOneOf(input.theme, THEMES), "Invalid theme.");
    if (input.week_start !== undefined) assertField(isOneOf(input.week_start, WEEK_STARTS), "Invalid week start.");
    if (input.date_format !== undefined) assertField(isOneOf(input.date_format, DATE_FORMATS), "Invalid date format.");
    if (input.currency !== undefined) assertField(isNonEmptyString(input.currency), "Invalid currency.");
    return settingsRepo.updateSettings(db, input);
  });

  handle(IPC.dashboard.summary, (month?: number, year?: number) => {
    const referenceDate =
      typeof month === "number" && typeof year === "number" ? new Date(year, month - 1, 1) : new Date();
    return dashboardRepo.getDashboardSummary(db, referenceDate);
  });

  handle(IPC.reports.timeSeries, (range: ReportRange) => {
    assertField(REPORT_RANGES.includes(range), "Invalid report range.");
    return reportsRepo.getTimeSeries(db, range);
  });
  handle(IPC.reports.categorySpend, (startDate: string, endDate: string, type: "income" | "expense") => {
    assertField(isISODate(startDate) && isISODate(endDate), "Invalid date range.");
    return reportsRepo.getCategorySpend(db, startDate, endDate, type);
  });
  handle(IPC.reports.insights, () => generateInsights(db));

  handle(IPC.data.exportData, async (exportFormat: "csv" | "json") => {
    assertField(isOneOf(exportFormat, ["csv", "json"] as const), "Invalid export format.");
    const win = getWindow();
    assertField(!!win, "No window available.");
    return exportData(db, win!, exportFormat);
  });
  handle(IPC.data.backup, async () => {
    const win = getWindow();
    assertField(!!win, "No window available.");
    return backupDatabase(db, win!);
  });
  handle(IPC.data.importData, async () => {
    const win = getWindow();
    assertField(!!win, "No window available.");
    await importDataFromFile(db, win!);
    return null;
  });
  handle(IPC.data.reset, () => {
    resetApplicationData(db);
    return null;
  });
  handle(IPC.data.seedDemo, () => {
    assertField(!app.isPackaged, "Demo data seeding is disabled in production builds.");
    seedDemoData(db);
    return null;
  });

  handle(IPC.app.getVersion, () => app.getVersion());
  handle(IPC.app.getPlatform, () => process.platform);
  handle(IPC.app.isPackaged, () => app.isPackaged);
}
