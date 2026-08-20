import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  tone: "success" | "error";
}

interface ToastContextValue {
  showToast: (message: string, tone?: Toast["tone"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2.5 bg-surface border border-border rounded-control shadow-card px-4 py-3 text-[13px] font-semibold text-text animate-mtPop"
          >
            {t.tone === "success" ? (
              <CheckCircle2 size={16} className="text-accent-green shrink-0" />
            ) : (
              <XCircle size={16} className="text-accent-red shrink-0" />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
