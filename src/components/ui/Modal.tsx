import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export function Modal({ open, onClose, title, subtitle, children, footer, width = "440px" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-mtVeil"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-card shadow-card p-6 animate-mtPop max-h-[85vh] overflow-y-auto"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="text-lg font-bold tracking-[-0.3px]">{title}</div>
            {subtitle && <div className="text-xs text-text-muted mt-1">{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-text-muted hover:text-text transition-colors -mt-1 -mr-1 p-1"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 mt-6">{footer}</div>}
      </div>
    </div>
  );
}
