import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppContext } from "@/context/AppContext";
import { useQuery } from "@/hooks/useApi";
import { formatCurrency } from "@shared/money";
import { formatDate } from "@/utils/format";
import type { Debt } from "@shared/types";

interface PaymentHistoryModalProps {
  debt: Debt | null;
  onClose: () => void;
}

export function PaymentHistoryModal({ debt, onClose }: PaymentHistoryModalProps) {
  const { currency, settings, dataVersion } = useAppContext();
  const { data: payments } = useQuery(
    () => (debt ? window.api.debts.payments(debt.id) : Promise.resolve({ success: true as const, data: [] })),
    [debt?.id, dataVersion]
  );

  return (
    <Modal open={!!debt} onClose={onClose} title="Payment History" subtitle={debt?.name} width="420px">
      {!payments || payments.length === 0 ? (
        <EmptyState title="No payments yet." description="Recorded payments for this debt will appear here." compact />
      ) : (
        <div className="flex flex-col gap-1 max-h-[360px] overflow-y-auto -mx-1 px-1">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2.5 px-2 rounded-[10px] hover:bg-[color:var(--mt-surface-alt)]">
              <div>
                <div className="text-[13px] font-bold">{formatDate(p.payment_date, settings?.date_format)}</div>
                {p.note && <div className="text-[11.5px] text-text-faint font-medium mt-0.5">{p.note}</div>}
              </div>
              <div className="text-[13.5px] font-extrabold text-accent-orange-alt">{formatCurrency(p.amount, currency)}</div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
