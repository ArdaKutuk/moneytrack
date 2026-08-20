import { contextBridge, ipcRenderer } from "electron";
import { IPC } from "@shared/ipc-channels";
import type {
  ApiResult,
  Bill,
  BillInput,
  BillWithCategory,
  Budget,
  BudgetInput,
  BudgetWithSpend,
  Category,
  CategorySpend,
  DashboardSummary,
  Debt,
  DebtInput,
  DebtPayment,
  Insight,
  MarkBillPaidOptions,
  RecordDebtPaymentOptions,
  ReportRange,
  Settings,
  SettingsInput,
  Transaction,
  TransactionFilters,
  TransactionInput,
  TransactionWithCategory,
  TimeSeriesPoint,
} from "@shared/types";

function invoke<T>(channel: string, ...args: unknown[]): Promise<ApiResult<T>> {
  return ipcRenderer.invoke(channel, ...args);
}

/** The only surface the renderer can reach into Node/Electron through.
 * contextIsolation is on and nodeIntegration is off, so this is genuinely
 * the full extent of what the UI can do outside the DOM. */
const api = {
  transactions: {
    list: (filters?: TransactionFilters) => invoke<TransactionWithCategory[]>(IPC.transactions.list, filters ?? {}),
    get: (id: number) => invoke<TransactionWithCategory>(IPC.transactions.get, id),
    create: (input: TransactionInput) => invoke<Transaction>(IPC.transactions.create, input),
    update: (id: number, input: TransactionInput) => invoke<Transaction>(IPC.transactions.update, id, input),
    remove: (id: number) => invoke<null>(IPC.transactions.delete, id),
  },
  categories: {
    list: () => invoke<Category[]>(IPC.categories.list),
  },
  budgets: {
    listForMonth: (month: number, year: number) => invoke<BudgetWithSpend[]>(IPC.budgets.listForMonth, month, year),
    upsert: (input: BudgetInput) => invoke<Budget>(IPC.budgets.upsert, input),
    remove: (id: number) => invoke<null>(IPC.budgets.delete, id),
  },
  bills: {
    list: () => invoke<BillWithCategory[]>(IPC.bills.list),
    create: (input: BillInput) => invoke<Bill>(IPC.bills.create, input),
    update: (id: number, input: BillInput) => invoke<Bill>(IPC.bills.update, id, input),
    remove: (id: number) => invoke<null>(IPC.bills.delete, id),
    markPaid: (id: number, options: MarkBillPaidOptions) => invoke<{ bill: Bill; transaction: Transaction | null }>(IPC.bills.markPaid, id, options),
  },
  debts: {
    list: () => invoke<Debt[]>(IPC.debts.list),
    create: (input: DebtInput) => invoke<Debt>(IPC.debts.create, input),
    update: (id: number, input: DebtInput) => invoke<Debt>(IPC.debts.update, id, input),
    remove: (id: number) => invoke<null>(IPC.debts.delete, id),
    payments: (debtId: number) => invoke<DebtPayment[]>(IPC.debts.payments, debtId),
    recordPayment: (options: RecordDebtPaymentOptions) =>
      invoke<{ debt: Debt; payment: DebtPayment; transaction: Transaction | null }>(IPC.debts.recordPayment, options),
  },
  settings: {
    get: () => invoke<Settings>(IPC.settings.get),
    update: (input: SettingsInput) => invoke<Settings>(IPC.settings.update, input),
  },
  dashboard: {
    summary: (month?: number, year?: number) => invoke<DashboardSummary>(IPC.dashboard.summary, month, year),
  },
  reports: {
    timeSeries: (range: ReportRange) => invoke<TimeSeriesPoint[]>(IPC.reports.timeSeries, range),
    categorySpend: (startDate: string, endDate: string, type: "income" | "expense" = "expense") =>
      invoke<CategorySpend[]>(IPC.reports.categorySpend, startDate, endDate, type),
    insights: () => invoke<Insight[]>(IPC.reports.insights),
  },
  data: {
    exportData: (format: "csv" | "json") => invoke<{ filePath: string } | null>(IPC.data.exportData, format),
    backup: () => invoke<{ filePath: string } | null>(IPC.data.backup),
    importData: () => invoke<null>(IPC.data.importData),
    reset: () => invoke<null>(IPC.data.reset),
    seedDemo: () => invoke<null>(IPC.data.seedDemo),
  },
  app: {
    getVersion: () => invoke<string>(IPC.app.getVersion),
    getPlatform: () => invoke<NodeJS.Platform>(IPC.app.getPlatform),
    isPackaged: () => invoke<boolean>(IPC.app.isPackaged),
  },
  shortcuts: {
    onNewTransaction: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on("shortcut:new-transaction", listener);
      return () => {
        ipcRenderer.removeListener("shortcut:new-transaction", listener);
      };
    },
    onOpenSettings: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on("shortcut:open-settings", listener);
      return () => {
        ipcRenderer.removeListener("shortcut:open-settings", listener);
      };
    },
  },
};

contextBridge.exposeInMainWorld("api", api);

export type MoneytrackApi = typeof api;
