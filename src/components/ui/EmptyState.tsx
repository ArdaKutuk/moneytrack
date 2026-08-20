import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div className={`text-center ${compact ? "py-9" : "py-16"}`}>
      <div className="w-11 h-11 mx-auto mb-3.5 rounded-2xl border border-dashed border-[#333a45] flex items-center justify-center text-text-muted">
        <Icon size={18} />
      </div>
      <div className="text-[14.5px] font-bold text-text">{title}</div>
      <div className="text-[13px] text-text-faint mt-1.5 max-w-xs mx-auto">{description}</div>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
