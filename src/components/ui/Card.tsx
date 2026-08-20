import type { CSSProperties, ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: string;
  style?: CSSProperties;
}

export function Card({ children, className = "", padding = "p-5", style }: CardProps) {
  return (
    <div
      className={`bg-surface border border-border rounded-card shadow-card ${padding} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  action?: ReactNode;
}

export function CardHeader({ title, action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-[15px] font-bold tracking-[-0.3px]">{title}</div>
      {action}
    </div>
  );
}

interface CardLinkProps {
  label: string;
  onClick: () => void;
}

export function CardLink({ label, onClick }: CardLinkProps) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-bold text-text-secondary hover:text-text transition-colors"
    >
      {label} →
    </button>
  );
}
