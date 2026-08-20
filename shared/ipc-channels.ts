/** Central registry of every IPC channel name. Import this on both sides
 * instead of typing string literals so a typo fails at compile time. */
export const IPC = {
  transactions: {
    list: "transactions:list",
    get: "transactions:get",
    create: "transactions:create",
    update: "transactions:update",
    delete: "transactions:delete",
  },
  categories: {
    list: "categories:list",
  },
  budgets: {
    listForMonth: "budgets:listForMonth",
    upsert: "budgets:upsert",
    delete: "budgets:delete",
  },
  bills: {
    list: "bills:list",
    create: "bills:create",
    update: "bills:update",
    delete: "bills:delete",
    markPaid: "bills:markPaid",
  },
  debts: {
    list: "debts:list",
    create: "debts:create",
    update: "debts:update",
    delete: "debts:delete",
    recordPayment: "debts:recordPayment",
    payments: "debts:payments",
  },
  settings: {
    get: "settings:get",
    update: "settings:update",
  },
  dashboard: {
    summary: "dashboard:summary",
  },
  reports: {
    timeSeries: "reports:timeSeries",
    categorySpend: "reports:categorySpend",
    insights: "reports:insights",
  },
  data: {
    exportData: "data:export",
    backup: "data:backup",
    importData: "data:import",
    reset: "data:reset",
    seedDemo: "data:seedDemo",
  },
  app: {
    getVersion: "app:getVersion",
    getPlatform: "app:getPlatform",
    isPackaged: "app:isPackaged",
  },
} as const;
