import { useEffect, useState } from "react";
import { formatISO } from "date-fns";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldWrap, TextInput } from "@/components/ui/Field";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/useToast";
import { unwrap } from "@/hooks/useApi";
import { formatCurrency } from "@shared/money";
import type { BillWithCategory } from "@shared/types";

interface MarkPaidDialogProps {
  bill: BillWithCategory | null;
  onClose: () => void;
}

export function MarkPaidDialog({ bill, onClose }: MarkPaidDialogProps) {
  const { currency, bumpData } = useAppContext();
  const { showToast } = useToast();
  const [paymentDate, setPaymentDate] = useState(formatISO(new Date(), { representation: "date" }));
  const [createExpense, setCreateExpense] = useState(true);
  const [account, setAccount] = useState("Cash");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (bill) {
      setPaymentDate(formatISO(new Date(), { representation: "date" }));
      setCreateExpense(true);
      setAccount("Cash");
    }
  }, [bill]);

  async function handleConfirm() {
    if (!bill) return;
    setSubmitting(true);
    try {
      await unwrap(window.api.bills.markPaid(bill.id, { paymentDate, createExpense, account }));
      showToast("Bill marked as paid");
      bumpData();
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not update bill.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={!!bill}
      onClose={onClose}
      title="Mark Bill as Paid"
      subtitle={bill ? `${bill.name} · ${formatCurrency(bill.amount, currency)}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="yellow" onClick={handleConfirm} disabled={submitting}>
            Confirm Payment
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FieldWrap label="Payment Date">
          <TextInput type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
        </FieldWrap>

        <div className="flex items-start justify-between bg-surface-alt border border-border rounded-control px-3.5 py-3">
          <div>
            <div className="text-[13px] font-bold">Record as expense</div>
            <div className="text-[11.5px] text-text-muted mt-0.5 leading-relaxed">
              Creates a matching expense transaction so this payment affects your balance. Leave off to
              just mark it paid without touching your totals.
            </div>
          </div>
          <button
            onClick={() => setCreateExpense((v) => !v)}
            className="w-9 h-5 rounded-full relative transition-colors shrink-0 mt-0.5"
            style={{ background: createExpense ? "#fbbf24" : "#2a3038" }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
              style={{ transform: createExpense ? "translateX(16px)" : "translateX(0px)" }}
            />
          </button>
        </div>

        {createExpense && (
          <FieldWrap label="Account">
            <TextInput value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Cash" />
          </FieldWrap>
        )}
      </div>
    </Modal>
  );
}
