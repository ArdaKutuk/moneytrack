import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CategoryDonut } from "@/components/charts/CategoryDonut";
import { SpendBarChart } from "@/components/charts/SpendBarChart";
import { IncomeExpenseBarChart } from "@/components/charts/IncomeExpenseBarChart";
import { SavingsLineChart } from "@/components/charts/SavingsLineChart";
import { CategoryComparisonBars, type ComparisonRow } from "@/components/charts/CategoryComparisonBars";
import { useAppContext } from "@/context/AppContext";
import { useQuery } from "@/hooks/useApi";
import { formatCurrency } from "@shared/money";
import { percentChange } from "@shared/calculations";
import { getRangeBounds } from "@/utils/reportRange";
import type { ReportRange } from "@shared/types";

const RANGES: ReportRange[] = ["Week", "Month", "3 Months", "6 Months", "Year"];

export function Reports() {
  const { currency, dataVersion } = useAppContext();
  const [range, setRange] = useState<ReportRange>("6 Months");

  const bounds = useMemo(() => getRangeBounds(range), [range]);

  const { data: timeSeries } = useQuery(() => window.api.reports.timeSeries(range), [dataVersion, range]);
  const { data: categorySpend } = useQuery(
    () => window.api.reports.categorySpend(bounds.start, bounds.end, "expense"),
    [dataVersion, bounds.start, bounds.end]
  );
  const { data: prevCategorySpend } = useQuery(
    () => window.api.reports.categorySpend(bounds.prevStart, bounds.prevEnd, "expense"),
    [dataVersion, bounds.prevStart, bounds.prevEnd]
  );
  const { data: insights } = useQuery(() => window.api.reports.insights(), [dataVersion]);

  const totalIncome = (timeSeries ?? []).reduce((s, p) => s + p.income, 0);
  const totalExpense = (timeSeries ?? []).reduce((s, p) => s + p.expense, 0);
  const avgSavings =
    timeSeries && timeSeries.length > 0
      ? Math.round(timeSeries.reduce((s, p) => s + (p.income - p.expense), 0) / timeSeries.length)
      : 0;

  const comparisonRows: ComparisonRow[] = useMemo(() => {
    const spend = categorySpend ?? [];
    const max = spend[0]?.total ?? 1;
    return spend.slice(0, 8).map((c) => {
      const prev = (prevCategorySpend ?? []).find((p) => p.category_id === c.category_id)?.total ?? 0;
      const change = percentChange(prev, c.total);
      return {
        id: c.category_id,
        name: c.category_name,
        color: c.color,
        amount: c.total,
        widthPct: max > 0 ? Math.round((c.total / max) * 100) : 0,
        trendLabel: change === null ? null : `${change > 0 ? "+" : ""}${change}%`,
        trendPositive: change === null ? null : change > 0,
      };
    });
  }, [categorySpend, prevCategorySpend]);

  return (
    <div className="px-7 py-[30px] pb-11 animate-mtFade">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[26px] font-extrabold tracking-[-0.7px]">Reports</div>
          <div className="text-[13.5px] text-text-secondary mt-1.5 font-medium">Analytics across your accounts</div>
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

      {insights && insights.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-4">
          {insights.map((i) => (
            <Card key={i.id} className={`border-l-2 ${i.tone === "negative" ? "!border-l-accent-red" : i.tone === "positive" ? "!border-l-accent-green" : "!border-l-accent-blue"}`} padding="p-4">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold uppercase tracking-wide text-text-muted">{i.tag}</div>
                <div
                  className={`text-xs font-extrabold ${
                    i.tone === "negative" ? "text-accent-red" : i.tone === "positive" ? "text-accent-green" : "text-accent-blue"
                  }`}
                >
                  {i.delta}
                </div>
              </div>
              <div className="text-[12.5px] text-text-secondary font-medium mt-2 leading-snug">{i.text}</div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div className="text-[15px] font-bold tracking-[-0.3px]">Spending Over Time</div>
            <div className="text-xs text-text-muted font-semibold">{range}</div>
          </div>
          <div className="mt-3">
            {timeSeries && totalExpense > 0 ? (
              <SpendBarChart data={timeSeries} currency={currency} />
            ) : (
              <EmptyState title="No spending yet" description="Expenses over this period will chart here." compact />
            )}
          </div>
        </Card>

        <Card>
          <div className="text-[15px] font-bold tracking-[-0.3px]">Spending Breakdown</div>
          {categorySpend && categorySpend.length > 0 ? (
            <div className="flex items-center gap-4.5 mt-3.5">
              <CategoryDonut data={categorySpend} currency={currency} />
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                {categorySpend.slice(0, 6).map((s) => (
                  <div key={s.category_id} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: s.color }} />
                    <div className="flex-1 min-w-0 text-[12.5px] font-semibold text-[#c3c8d1] truncate">{s.category_name}</div>
                    <div className="text-[12.5px] font-bold">{formatCurrency(s.total, currency)}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="No spending yet" description="Expense categories will show up here." compact />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <Card>
          <div className="flex items-center justify-between">
            <div className="text-[15px] font-bold tracking-[-0.3px]">Income vs Expenses</div>
          </div>
          <div className="mt-3">
            {timeSeries && (totalIncome > 0 || totalExpense > 0) ? (
              <IncomeExpenseBarChart data={timeSeries} currency={currency} />
            ) : (
              <EmptyState title="No data yet" description="Income and expenses over this period will chart here." compact />
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div className="text-[15px] font-bold tracking-[-0.3px]">Monthly Savings</div>
            <div className="text-xs font-bold text-accent-blue">Avg {formatCurrency(avgSavings, currency)}</div>
          </div>
          <div className="mt-3">
            {timeSeries && timeSeries.length > 0 ? (
              <SavingsLineChart data={timeSeries} currency={currency} />
            ) : (
              <EmptyState title="No data yet" description="Your savings trend will chart here." compact />
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="text-[15px] font-bold tracking-[-0.3px] mb-4">Category Comparison</div>
        {comparisonRows.length === 0 ? (
          <EmptyState title="No spending yet" description="Category comparisons will appear once you have expenses." compact />
        ) : (
          <CategoryComparisonBars rows={comparisonRows} currency={currency} />
        )}
      </Card>
    </div>
  );
}
