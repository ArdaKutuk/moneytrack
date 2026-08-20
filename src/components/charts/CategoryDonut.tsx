import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { CategorySpend } from "@shared/types";
import { formatCurrency } from "@shared/money";

interface CategoryDonutProps {
  data: CategorySpend[];
  currency: string;
  size?: number;
}

export function CategoryDonut({ data, currency, size = 156 }: CategoryDonutProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const total = data.reduce((sum, d) => sum + d.total, 0);
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width={size} height={size}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="category_name"
            innerRadius={size * 0.38}
            outerRadius={size * 0.5}
            paddingAngle={2}
            stroke="none"
            isAnimationActive
            onMouseEnter={(_, index) => setHoverIndex(index)}
            onMouseLeave={() => setHoverIndex(null)}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.category_id}
                fill={entry.color}
                opacity={hoverIndex === null || hoverIndex === index ? 1 : 0.28}
                cursor="pointer"
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-[10px] uppercase tracking-wide text-text-muted font-bold">
          {hovered ? hovered.category_name : "Total spent"}
        </div>
        <div className="text-[21px] font-extrabold tracking-[-0.8px] mt-0.5">
          {formatCurrency(hovered ? hovered.total : total, currency)}
        </div>
      </div>
    </div>
  );
}
