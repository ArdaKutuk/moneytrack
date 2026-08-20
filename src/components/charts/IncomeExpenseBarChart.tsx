import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { TimeSeriesPoint } from "@shared/types";
import { formatCurrency } from "@shared/money";

function Tip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-[10px] px-3 py-2.5 shadow-card">
      <div className="text-[10.5px] font-bold text-text-secondary font-mono mb-1.5">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-1.5 text-xs font-bold mt-0.5">
          <span className="w-1.5 h-1.5 rounded-sm" style={{ background: p.fill }} />
          {formatCurrency(p.value, currency)}
        </div>
      ))}
    </div>
  );
}

export function IncomeExpenseBarChart({ data, currency }: { data: TimeSeriesPoint[]; currency: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barGap={3}>
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--mt-text-muted)", fontSize: 10.5, fontFamily: "IBM Plex Mono, monospace" }}
        />
        <Tooltip content={<Tip currency={currency} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Legend
          verticalAlign="top"
          align="right"
          height={24}
          iconType="square"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, fontWeight: 600, color: "var(--mt-text-secondary)" }}
        />
        <Bar dataKey="income" name="Income" fill="#34d399" radius={[4, 4, 0, 0]} isAnimationActive />
        <Bar dataKey="expense" name="Expenses" fill="#fb7185" radius={[4, 4, 0, 0]} isAnimationActive />
      </BarChart>
    </ResponsiveContainer>
  );
}
