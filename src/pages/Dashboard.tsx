import { useMemo, useState } from "react";
import { endOfMonth, formatISO, startOfMonth } from "date-fns";
import { ArrowDownRight, ArrowUpRight, PiggyBank, Plus } from "lucide-react";
import { Card, CardHeader, CardLink } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { CashFlowChart } from "@/components/charts/CashFlowChart";
import { CategoryDonut } from "@/components/charts/CategoryDonut";
import { useAppContext } from "@/context/AppContext";
import { useQuery } from "@/hooks/useApi";
import { formatCurrency, formatSignedCurrency } from "@shared/money";
import { budgetPercentage, budgetState } from "@shared/calculations";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { hexAlpha, relativeDateLabel, dueLabel } from "@/utils/format";
import { BUDGET_STATE_COLOR, BUDGET_STATE_LABEL } from "@/utils/budgetVisuals";
import type { ReportRange } from "@shared/types";

const RANGES: ReportRange[] = ["Week", "Month", "Year"];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function Dashboard() {
  const { currency, dataVersion, selectedMonth, selectedYear, navigate, openAddTransaction } = useAppContext();
  const [range, setRange] = useState<ReportRange>("Month");
  const todayISO = formatISO(new Date(), { representation: "date" });

  const { data: summary } = useQuery(
    () => window.api.dashboard.summary(selectedMonth, selectedYear),
    [dataVersion, selectedMonth, selectedYear]
  );

  const { data: flow } = useQuery(() => window.api.reports.timeSeries(range), [dataVersion, range]);

  const monthStart = useMemo(
    () => formatISO(startOfMonth(new Date(selectedYear, selectedMonth - 1, 1)), { representation: "date" }),
    [selectedMonth, selectedYear]
  );
  const monthEnd = useMemo(
    () => formatISO(endOfMonth(new Date(selectedYear, selectedMonth - 1, 1)), { representation: "date" }),
    [selectedMonth, selectedYear]
  );

  const { data: categorySpend } = useQuery(
    () => window.api.reports.categorySpend(monthStart, monthEnd, "expense"),
    [dataVersion, monthStart, monthEnd]
  );

  const { data: budgets } = useQuery(
    () => window.api.budgets.listForMonth(selectedMonth, selectedYear),
    [dataVersion, selectedMonth, selectedYear]
  );

  const { data: bills } = useQuery(() => window.api.bills.list(), [dataVersion]);
  const { data: transactions } = useQuery(() => window.api.transactions.list({ sort: "newest" }), [dataVersion]);

  const upcomingBills = (bills ?? []).filter((b) => b.status !== "paid").slice(0, 4);
  const recentTx = (transactions ?? []).slice(0, 4);
  const topBudgets = (budgets ?? []).slice(0, 4);

  const kpiCards = summary
    ? [
        {
          label: "Monthly Income",
          value: formatCurrency(summary.monthlyIncome, currency),
          icon: ArrowUpRight,
          color: "#34d399",
        },
        {
          label: "Monthly Expenses",
          value: formatCurrency(summary.monthlyExpenses, currency),
          icon: ArrowDownRight,
          color: "#fb7185",
        },
        {
          label: "Savings",
          value: formatCurrency(summary.monthlySavings, currency),
          icon: PiggyBank,
          color: "#60a5fa",
        },
      ]
    : [];

  return (
    <div className="px-7 py-[30px] pb-11 animate-mtFade">
      <div className="flex items-end justify-between mb-[22px]">
        <div>
          <div className="text-[26px] font-extrabold tracking-[-0.7px]">{greeting()}</div>
          <div className="text-sm text-text-secondary mt-1.5 font-medium">Here's your financial overview.</div>
        </div>
        <div className="text-xs text-text-muted font-semibold font-mono">Today · {todayISO}</div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#16211d] to-[#141a1e] !border-[#26382f] hover:!border-accent-green hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wide text-[#7f8b86] font-bold">Total Balance</div>
            <div className="w-1.5 h-1.5 rounded-full bg-accent-green shadow-[0_0_0_4px_rgba(52,211,153,.12)]" />
          </div>
          <div className="text-[38px] font-extrabold tracking-[-1.6px] mt-3.5 leading-none">
            {summary ? formatCurrency(summary.totalBalance, currency) : "—"}
          </div>
          <div className="flex items-center gap-1.5 mt-2.5">
            <div className="text-[12.5px] font-bold text-accent-green">
              {summary ? formatSignedCurrency(summary.monthlySavings, currency) : ""}
            </div>
            <div className="text-xs text-[#7f8b86] font-medium">this month</div>
          </div>
        </Card>

        {kpiCards.map((k) => (
          <Card key={k.label} className="hover:!border-[#2f3540] hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wide text-text-muted font-bold">{k.label}</div>
              <div
                className="w-[22px] h-[22px] rounded-[7px] flex items-center justify-center"
                style={{ background: hexAlpha(k.color), color: k.color }}
              >
                <k.icon size={12} strokeWidth={2.5} />
              </div>
            </div>
            <div className="text-[28px] font-extrabold tracking-[-1.1px] mt-3.5 leading-none">{k.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-[1.6fr_1fr] gap-4 mt-4">
        <Card padding="p-5 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[15px] font-bold tracking-[-0.3px]">Cash Flow</div>
              {flow && (
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm bg-accent-green" />
                    <div className="text-xs text-text-secondary font-semibold">Income</div>
                    <div className="text-xs font-bold">
                      {formatCurrency(flow.reduce((s, p) => s + p.income, 0), currency)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm bg-accent-red" />
                    <div className="text-xs text-text-secondary font-semibold">Expenses</div>
                    <div className="text-xs font-bold">
                      {formatCurrency(flow.reduce((s, p) => s + p.expense, 0), currency)}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-0.5 bg-surface-alt border border-border rounded-[9px] p-[3px]">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 rounded-[7px] text-[11.5px] font-bold transition-colors ${
                    range === r ? "bg-[#1f2630] text-text" : "text-text-faint hover:text-text"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3.5">
            {flow && flow.length > 0 ? (
              <CashFlowChart data={flow} currency={currency} />
            ) : (
              <EmptyState title="No cash flow yet" description="Add transactions to see income vs expenses." compact />
            )}
          </div>
        </Card>

        <Card>
          <div className="text-[15px] font-bold tracking-[-0.3px]">Spending by Category</div>
          {categorySpend && categorySpend.length > 0 ? (
            <div className="flex items-center gap-4.5 mt-3.5">
              <CategoryDonut data={categorySpend} currency={currency} />
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                {categorySpend.slice(0, 6).map((s) => {
                  const total = categorySpend.reduce((sum, x) => sum + x.total, 0);
                  const pct = total > 0 ? Math.round((s.total / total) * 100) : 0;
                  return (
                    <div key={s.category_id} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: s.color }} />
                      <div className="flex-1 min-w-0 text-[12.5px] font-semibold text-[#c3c8d1] truncate">
                        {s.category_name}
                      </div>
                      <div className="text-[12.5px] font-bold">{formatCurrency(s.total, currency)}</div>
                      <div className="text-[11px] text-text-muted font-semibold w-8 text-right font-mono">
                        {pct}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <EmptyState title="No spending yet" description="Expense categories will show up here." compact />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader title="Budget Status" action={<CardLink label="Manage" onClick={() => navigate("budgets")} />} />
          {topBudgets.length === 0 ? (
            <EmptyState title="No budgets yet." description="Set a monthly limit to stay on track." compact />
          ) : (
            <div className="flex flex-col gap-4 mt-4">
              {topBudgets.map((b) => {
                const pct = budgetPercentage(b.spent, b.amount);
                const state = budgetState(pct);
                const color = BUDGET_STATE_COLOR[state];
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="text-[13px] font-bold">{b.category_name}</div>
                        {pct >= 75 && (
                          <span
                            className="text-[10px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-md"
                            style={{ background: hexAlpha(color, 0.14), color }}
                          >
                            {BUDGET_STATE_LABEL[state]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <div className="text-[12.5px] font-bold">{formatCurrency(b.spent, currency)}</div>
                        <div className="text-[11.5px] text-text-muted font-semibold">
                          / {formatCurrency(b.amount, currency)}
                        </div>
                        <div className="text-[11.5px] font-extrabold font-mono w-9 text-right" style={{ color }}>
                          {pct}%
                        </div>
                      </div>
                    </div>
                    <ProgressBar percent={pct} color={color} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Upcoming Bills" action={<CardLink label="All bills" onClick={() => navigate("bills")} />} />
          {upcomingBills.length === 0 ? (
            <EmptyState title="No bills yet." description="Add a bill to never miss a due date." compact />
          ) : (
            <div className="flex flex-col gap-0.5 mt-3">
              {upcomingBills.map((b) => {
                const Icon = getCategoryIcon(b.category_icon);
                const statusColor =
                  b.status === "overdue" ? "#fb7185" : b.status === "upcoming" ? "#60a5fa" : "#fbbf24";
                return (
                  <div key={b.id} className="flex items-center gap-3 py-2.5 px-2.5 rounded-[11px] hover:bg-[color:var(--mt-surface-alt)] transition-colors">
                    <div
                      className="w-[34px] h-[34px] shrink-0 rounded-[10px] flex items-center justify-center"
                      style={{ background: hexAlpha(b.category_color), color: b.category_color }}
                    >
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold truncate">{b.name}</div>
                      <div className="text-[11.5px] text-text-faint font-semibold mt-0.5">
                        {dueLabel(b.due_date, todayISO)}
                      </div>
                    </div>
                    <div
                      className="text-[10px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-md"
                      style={{ background: hexAlpha(statusColor, 0.14), color: statusColor }}
                    >
                      {b.status}
                    </div>
                    <div className="text-[13.5px] font-extrabold tracking-[-0.3px] w-20 text-right">
                      {formatCurrency(b.amount, currency)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Recent Transactions"
          action={<CardLink label="View all transactions" onClick={() => navigate("transactions")} />}
        />
        {recentTx.length === 0 ? (
          <EmptyState
            title="No transactions yet."
            description="Add your first transaction to start understanding your spending."
            action={
              <Button onClick={() => openAddTransaction(null)}>
                <Plus size={14} strokeWidth={3} /> Add Transaction
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-0.5 mt-2.5">
            {recentTx.map((t) => {
              const Icon = getCategoryIcon(t.category_icon);
              const income = t.type === "income";
              return (
                <div key={t.id} className="flex items-center gap-3.5 py-2.5 px-2.5 rounded-[11px] hover:bg-[color:var(--mt-surface-alt)] transition-colors">
                  <div
                    className="w-[34px] h-[34px] shrink-0 rounded-[10px] flex items-center justify-center"
                    style={{ background: hexAlpha(t.category_color), color: t.category_color }}
                  >
                    <Icon size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold truncate">{t.description}</div>
                    <div className="text-[11.5px] text-text-faint font-semibold mt-0.5">
                      {t.category_name} · {t.account}
                    </div>
                  </div>
                  <div className="text-[11.5px] text-text-muted font-semibold font-mono w-[70px] text-right">
                    {relativeDateLabel(t.date, todayISO)}
                  </div>
                  <div
                    className={`text-sm font-extrabold tracking-[-0.3px] w-[100px] text-right ${
                      income ? "text-accent-green" : "text-accent-red"
                    }`}
                  >
                    {formatSignedCurrency(income ? t.amount : -t.amount, currency)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
