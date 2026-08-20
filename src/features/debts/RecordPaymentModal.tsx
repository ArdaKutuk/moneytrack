import { useEffect, useState } from "react";
import { formatISO } from "date-fns";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldWrap, Select, TextInput } from "@/components/ui/Field";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/useToast";
import { unwrap } from "@/hooks/useApi";
import { moneyToMinorUnits } from "@shared/money";
import { formatCurrency } from "@shared/money";
import type { Debt } from "@shared/types";

interface RecordPaymentModalProps {
  debt: Debt | null;
  onClose: () => void;
}

export function RecordPaymentModal({ debt, onClose }: RecordPaymentModalProps) {
  const { currency, categories, bumpData } = useAppContext();
  const { showToast } = useToast();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(formatISO(new Date(), { representation: "date" }));
  const [note, setNote] = useState("");
  const [createExpense, setCreateExpense] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const expenseCategories = categories.filter((c) => c.type === "expense");

  useEffect(() => {
    if (debt) {
      setAmount(String(debt.monthly_payment / 100 || ""));
      setDate(formatISO(new Date(), { representation: "date" }));
      setNote("");
      setCreateExpense(false);
      setCategoryId(expenseCategories[0] ? String(expenseCategories[0].id) : "");
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debt]);

  async function handleSubmit() {
    if (!debt) return;
    const amountValue = Number(amount);
    if (!amount || !Number.isFinite(amountValue) || amountValue <= 0) {
      setError("Enter a payment amount greater than zero.");
      return;
    }
    setSubmitting(true);
    try {
      await unwrap(
        window.api.debts.recordPayment({
          debtId: debt.id,
          amount: moneyToMinorUnits(amountValue),
          paymentDate: date,
          note: note.trim() || null,
          createExpense,
          categoryId: createExpense && categoryId ? Number(categoryId) : undefined,
        })
      );
      showToast("Debt payment recorded");
      bumpData();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not record payment.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={!!debt}
      onClose={onClose}
      title="Record Payment"
      subtitle={debt ? `${debt.name} · ${formatCurrency(debt.remaining_amount, currency)} remaining` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            className="!bg-accent-orange !text-[#1a0d05] !border-none hover:!bg-[#fb9d6f]"
            onClick={handleSubmit}
            disabled={submitting}
          >
            Record Payment
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FieldWrap label="Amount" error={error ?? undefined}>
          <div className="flex items-center bg-surface-alt border border-border rounded-control px-3 py-2.5 focus-within:border-accent-orange">
            <span className="text-lg font-bold mr-1 text-accent-orange">₺</span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0"
              className="flex-1 bg-transparent text-lg font-bold text-text outline-none"
            />
          </div>
        </FieldWrap>

        <FieldWrap label="Payment Date">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FieldWrap>

        <FieldWrap label="Note (optional)">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" />
        </FieldWrap>

        <div className="flex items-start justify-between bg-surface-alt border border-border rounded-control px-3.5 py-3">
          <div>
            <div className="text-[13px] font-bold">Record as expense</div>
            <div className="text-[11.5px] text-text-muted mt-0.5 leading-relaxed">
              This payment is off by default — turn it on only if you want it counted in your balance
              and spending too.
            </div>
          </div>
          <button
            onClick={() => setCreateExpense((v) => !v)}
            className="w-9 h-5 rounded-full relative transition-colors shrink-0 mt-0.5"
            style={{ background: createExpense ? "#fb923c" : "#2a3038" }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
              style={{ transform: createExpense ? "translateX(16px)" : "translateX(0px)" }}
            />
          </button>
        </div>

        {createExpense && (
          <FieldWrap label="Category">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FieldWrap>
        )}
      </div>
    </Modal>
  );
}
