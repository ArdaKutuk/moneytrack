import { LayoutDashboard, ArrowLeftRight, PiggyBank, Receipt, CreditCard, BarChart3, Settings as SettingsIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAppContext, type PageId } from "@/context/AppContext";
import { useQuery } from "@/hooks/useApi";
import { formatCurrency } from "@shared/money";

const NAV_ITEMS: Array<{ id: PageId; label: string; icon: LucideIcon }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { id: "budgets", label: "Budgets", icon: PiggyBank },
  { id: "bills", label: "Bills", icon: Receipt },
  { id: "debts", label: "Debts", icon: CreditCard },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

export function Sidebar() {
  const { page, navigate, currency, dataVersion } = useAppContext();
  const { data: summary } = useQuery(() => window.api.dashboard.summary(), [dataVersion]);

  return (
    <div className="w-[236px] shrink-0 bg-sidebar border-r border-border-soft flex flex-col py-[22px] px-[14px] pb-[18px]">
      <div className="flex items-center gap-[11px] px-2 pb-[26px]">
        <div className="w-[26px] h-[26px] rounded-lg bg-gradient-to-br from-accent-green via-accent-teal to-accent-blue flex items-center justify-center">
          <div className="w-[9px] h-[9px] bg-bg rounded-[2px] rotate-45" />
        </div>
        <div className="text-[16px] font-extrabold tracking-[-0.35px]">Moneytrack</div>
      </div>

      <nav className="flex flex-col gap-[3px]">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const active = page === id;
          return (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={`relative flex items-center gap-[11px] px-3 py-2.5 rounded-[10px] text-[13.5px] font-semibold transition-colors text-left ${
                active ? "bg-[color:var(--mt-surface-alt)] text-text" : "text-text-secondary hover:bg-[color:var(--mt-surface-alt)] hover:text-text"
              }`}
            >
              <Icon size={15} strokeWidth={2} opacity={active ? 1 : 0.65} />
              <span>{label}</span>
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-full bg-accent-green" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="p-3.5 border border-border rounded-xl bg-surface-alt mb-2.5">
        <div className="text-[10.5px] tracking-wide uppercase text-text-muted font-bold">Net worth</div>
        <div className="text-[19px] font-extrabold tracking-[-0.5px] mt-1">
          {summary ? formatCurrency(summary.netWorth, currency) : "—"}
        </div>
        <div className="text-[11.5px] text-accent-green font-semibold mt-0.5">
          {summary ? formatCurrency(summary.totalBalance, currency) + " balance" : ""}
        </div>
      </div>

      <button
        onClick={() => navigate("settings")}
        className={`flex items-center gap-[11px] px-3 py-2.5 rounded-[10px] text-[13.5px] font-semibold transition-colors text-left ${
          page === "settings" ? "bg-[color:var(--mt-surface-alt)] text-text" : "text-text-secondary hover:bg-[color:var(--mt-surface-alt)] hover:text-text"
        }`}
      >
        <SettingsIcon size={15} strokeWidth={2} opacity={0.75} />
        <span>Settings</span>
      </button>
    </div>
  );
}
