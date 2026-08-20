import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { TimeSeriesPoint } from "@shared/types";
import { formatCurrency } from "@shared/money";

interface CashFlowChartProps {
  data: TimeSeriesPoint[];
  currency: string;
}

function CashFlowTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  const income = payload.find((p: any) => p.dataKey === "income")?.value ?? 0;
  const expense = payload.find((p: any) => p.dataKey === "expense")?.value ?? 0;
  return (
    <div className="bg-surface border border-border rounded-[10px] px-3 py-2.5 shadow-card">
      <div className="text-[10.5px] font-bold text-text-secondary font-mono mb-1.5">{label}</div>
      <div className="flex items-center gap-1.5 text-xs font-bold">
        <span className="w-1.5 h-1.5 rounded-sm bg-accent-green" /> {formatCurrency(income, currency)}
      </div>
      <div className="flex items-center gap-1.5 text-xs font-bold mt-1">
        <span className="w-1.5 h-1.5 rounded-sm bg-accent-red" /> {formatCurrency(expense, currency)}
      </div>
    </div>
  );
}

export function CashFlowChart({ data, currency }: CashFlowChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="mtIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity={0.34} />
            <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="mtExpense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb7185" stopOpacity={0.26} />
            <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--mt-border-soft)" vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--mt-text-muted)", fontSize: 10.5, fontFamily: "IBM Plex Mono, monospace" }}
          interval="preserveStartEnd"
        />
        <Tooltip content={<CashFlowTooltip currency={currency} />} cursor={{ stroke: "#3a4150", strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="expense"
          stroke="#fb7185"
          strokeWidth={2.25}
          fill="url(#mtExpense)"
          isAnimationActive
        />
        <Area
          type="monotone"
          dataKey="income"
          stroke="#34d399"
          strokeWidth={2.25}
          fill="url(#mtIncome)"
          isAnimationActive
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
