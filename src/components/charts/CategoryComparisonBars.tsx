import { formatCurrency } from "@shared/money";

export interface ComparisonRow {
  id: number;
  name: string;
  color: string;
  amount: number;
  widthPct: number;
  trendLabel: string | null;
  trendPositive: boolean | null;
}

export function CategoryComparisonBars({ rows, currency }: { rows: ComparisonRow[]; currency: string }) {
  return (
    <div className="flex flex-col gap-3.5">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-3">
          <div className="w-24 shrink-0 text-[12.5px] font-semibold text-text-secondary truncate">{row.name}</div>
          <div className="flex-1 h-2 rounded-md bg-[color:var(--mt-border-soft)] overflow-hidden">
            <div
              className="h-full rounded-md origin-left animate-mtGrow"
              style={{ width: `${row.widthPct}%`, background: row.color }}
            />
          </div>
          <div className="w-20 shrink-0 text-right text-[12.5px] font-bold">
            {formatCurrency(row.amount, currency)}
          </div>
          <div
            className={`w-12 shrink-0 text-right text-[11.5px] font-bold ${
              row.trendPositive === null
                ? "text-text-muted"
                : row.trendPositive
                  ? "text-accent-red"
                  : "text-accent-green"
            }`}
          >
            {row.trendLabel ?? "—"}
          </div>
        </div>
      ))}
    </div>
  );
}
