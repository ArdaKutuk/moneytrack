import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { TimeSeriesPoint } from "@shared/types";
import { formatCurrency } from "@shared/money";

function BarTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-[10px] px-3 py-2 shadow-card">
      <div className="text-[10.5px] font-bold text-text-secondary font-mono mb-1">{label}</div>
      <div className="text-xs font-bold">{formatCurrency(payload[0].value, currency)}</div>
    </div>
  );
}

export function SpendBarChart({ data, currency }: { data: TimeSeriesPoint[]; currency: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="mtSpendBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb7185" stopOpacity={1} />
            <stop offset="100%" stopColor="#fb7185" stopOpacity={0.55} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--mt-text-muted)", fontSize: 10.5, fontFamily: "IBM Plex Mono, monospace" }}
        />
        <Tooltip content={<BarTooltip currency={currency} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="expense" fill="url(#mtSpendBar)" radius={[6, 6, 0, 0]} isAnimationActive />
      </BarChart>
    </ResponsiveContainer>
  );
}
