import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useAppContext, type PageId } from "@/context/AppContext";

const PAGE_TITLES: Record<PageId, string> = {
  dashboard: "Dashboard",
  transactions: "Transactions",
  budgets: "Budgets",
  bills: "Bills",
  debts: "Debts",
  reports: "Reports",
  settings: "Settings",
};

const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform ?? navigator.userAgent);
const SHORTCUT = isMac ? "⌘N" : "Ctrl+N";

const MONTH_PAGES: PageId[] = ["dashboard", "budgets"];

export function TopBar() {
  const { page, monthLabel, goToPrevMonth, goToNextMonth, openAddTransaction } = useAppContext();

  return (
    <div className="h-[62px] shrink-0 border-b border-border-soft bg-topbar flex items-center justify-between px-7">
      <div className="flex items-center gap-3">
        <div className="text-[13px] font-bold text-text">{PAGE_TITLES[page]}</div>
        <div className="w-px h-3.5 bg-border" />
        <div className="text-xs text-text-muted font-medium">Single user workspace</div>
      </div>
      <div className="flex items-center gap-2.5">
        {MONTH_PAGES.includes(page) && (
          <div className="flex items-center gap-0.5 bg-surface-alt border border-border rounded-[10px] p-[3px]">
            <button
              onClick={goToPrevMonth}
              aria-label="Previous month"
              className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center text-text-secondary hover:bg-[color:var(--mt-border-soft)] hover:text-text transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="px-3 text-[12.5px] font-bold tracking-[-0.1px] min-w-[104px] text-center">
              {monthLabel}
            </div>
            <button
              onClick={goToNextMonth}
              aria-label="Next month"
              className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center text-text-secondary hover:bg-[color:var(--mt-border-soft)] hover:text-text transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
        <button
          onClick={() => openAddTransaction(null)}
          className="flex items-center gap-2 bg-accent-green text-[#07120e] px-3.5 py-2.5 rounded-[10px] text-[12.5px] font-extrabold cursor-pointer transition-all hover:bg-accent-green-hover hover:shadow-[0_8px_22px_-10px_rgba(52,211,153,.75)] active:translate-y-px"
        >
          <Plus size={14} strokeWidth={3} />
          <span>Add Transaction</span>
          <span className="font-mono text-[10.5px] bg-black/15 px-1.5 py-0.5 rounded-md font-medium">
            {SHORTCUT}
          </span>
        </button>
      </div>
    </div>
  );
}
