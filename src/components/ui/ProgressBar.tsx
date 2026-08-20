import type { ReactNode } from "react";

interface ProgressBarProps {
  percent: number;
  color: string;
  height?: number;
}

export function ProgressBar({ percent, color, height = 7 }: ProgressBarProps) {
  const width = Math.max(0, Math.min(100, percent));
  return (
    <div className="rounded-md bg-[color:var(--mt-border-soft)] overflow-hidden" style={{ height }}>
      <div
        className="h-full rounded-md origin-left animate-mtGrow"
        style={{ background: color, width: `${width}%` }}
      />
    </div>
  );
}

interface BadgeProps {
  label: string;
  color: string;
  tint: string;
}

export function Badge({ label, color, tint }: BadgeProps) {
  return (
    <span
      className="text-[10px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-md"
      style={{ background: tint, color }}
    >
      {label}
    </span>
  );
}

interface IconTileProps {
  icon: ReactNode;
  color: string;
  tint: string;
  size?: number;
}

export function IconTile({ icon, color, tint, size = 34 }: IconTileProps) {
  return (
    <div
      className="rounded-[10px] flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: tint, color }}
    >
      {icon}
    </div>
  );
}
