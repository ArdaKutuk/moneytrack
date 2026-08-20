import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { TimeSeriesPoint } from "@shared/types";
import { formatCurrency } from "@shared/money";

function Tip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  const savings = payload[0].value as number;
  return (
    <div className="bg-surface border border-border rounded-[10px] px-3 py-2 shadow-card">
      <div className="text-[10.5px] font-bold text-text-secondary font-mono mb-1">{label}</div>
      <div className={`text-xs font-bold ${savings >= 0 ? "text-accent-blue" : "text-accent-red"}`}>
        {formatCurrency(savings, currency)}
      </div>
    </div>
  );
}

export function SavingsLineChart({ data, currency }: { data: TimeSeriesPoint[]; currency: string }) {
  const points = data.map((d) => ({ label: d.label, savings: d.income - d.expense }));
  return (
    <ResponsiveContainer width="100%" height={210}>
      <LineChart data={points} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid stroke="var(--mt-border-soft)" vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--mt-text-muted)", fontSize: 10.5, fontFamily: "IBM Plex Mono, monospace" }}
        />
        <Tooltip content={<Tip currency={currency} />} cursor={{ stroke: "#3a4150", strokeWidth: 1 }} />
        <Line
          type="monotone"
          dataKey="savings"
          stroke="#60a5fa"
          strokeWidth={2.25}
          dot={false}
          activeDot={{ r: 4, fill: "#0d0f12", stroke: "#60a5fa", strokeWidth: 2.5 }}
          isAnimationActive
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
