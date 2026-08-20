import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { format } from "date-fns";
import type { Category, Settings } from "@shared/types";
import { unwrap } from "@/hooks/useApi";

export type PageId = "dashboard" | "transactions" | "budgets" | "bills" | "debts" | "reports" | "settings";

interface AppContextValue {
  page: PageId;
  navigate: (page: PageId) => void;
  categories: Category[];
  settings: Settings | null;
  refreshSettings: () => void;
  currency: string;
  /** Bumped after any successful mutation. Pages depend on this in their
   * query effects so switching data anywhere refreshes what's on screen,
   * without a full query-cache library. */
  dataVersion: number;
  bumpData: () => void;
  txModal: { open: boolean; editId: number | null };
  openAddTransaction: (editId?: number | null) => void;
  closeTransactionModal: () => void;
  selectedMonth: number;
  selectedYear: number;
  monthLabel: string;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageId>("dashboard");
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [txModal, setTxModal] = useState<{ open: boolean; editId: number | null }>({
    open: false,
    editId: null,
  });

  const bumpData = useCallback(() => setDataVersion((v) => v + 1), []);

  const refreshSettings = useCallback(() => {
    unwrap(window.api.settings.get())
      .then(setSettings)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    unwrap(window.api.categories.list())
      .then(setCategories)
      .catch(() => undefined);
    refreshSettings();
  }, [refreshSettings]);

  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    const resolved =
      settings.theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : settings.theme;
    root.classList.toggle("dark", resolved === "dark");
    root.classList.toggle("light", resolved === "light");
  }, [settings]);

  const now = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const goToPrevMonth = useCallback(() => {
    setSelectedMonth((m) => (m === 1 ? 12 : m - 1));
    setSelectedYear((y) => (selectedMonth === 1 ? y - 1 : y));
  }, [selectedMonth]);
  const goToNextMonth = useCallback(() => {
    setSelectedMonth((m) => (m === 12 ? 1 : m + 1));
    setSelectedYear((y) => (selectedMonth === 12 ? y + 1 : y));
  }, [selectedMonth]);
  const monthLabel = useMemo(
    () => format(new Date(selectedYear, selectedMonth - 1, 1), "MMMM yyyy"),
    [selectedMonth, selectedYear]
  );

  const openAddTransaction = useCallback((editId: number | null = null) => {
    setTxModal({ open: true, editId });
  }, []);
  const closeTransactionModal = useCallback(() => setTxModal({ open: false, editId: null }), []);

  useEffect(() => {
    const off = window.api.shortcuts.onNewTransaction(() => openAddTransaction(null));
    return off;
  }, [openAddTransaction]);

  useEffect(() => {
    const off = window.api.shortcuts.onOpenSettings(() => setPage("settings"));
    return off;
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      page,
      navigate: setPage,
      categories,
      settings,
      refreshSettings,
      currency: settings?.currency ?? "TRY",
      dataVersion,
      bumpData,
      txModal,
      openAddTransaction,
      closeTransactionModal,
      selectedMonth,
      selectedYear,
      monthLabel,
      goToPrevMonth,
      goToNextMonth,
    }),
    [
      page,
      categories,
      settings,
      refreshSettings,
      dataVersion,
      bumpData,
      txModal,
      openAddTransaction,
      closeTransactionModal,
      selectedMonth,
      selectedYear,
      monthLabel,
      goToPrevMonth,
      goToNextMonth,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
