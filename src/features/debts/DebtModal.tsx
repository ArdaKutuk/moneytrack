import { useEffect, useState } from "react";
import { formatISO } from "date-fns";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldWrap, TextArea, TextInput } from "@/components/ui/Field";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/useToast";
import { unwrap } from "@/hooks/useApi";
import { moneyToMinorUnits, minorUnitsToMoney } from "@shared/money";
import type { Debt, DebtInput } from "@shared/types";

interface DebtModalProps {
  open: boolean;
  onClose: () => void;
  editing: Debt | null;
}

interface FormState {
  name: string;
  original_amount: string;
  monthly_payment: string;
  due_date: string;
  note: string;
}

function emptyForm(): FormState {
  return { name: "", original_amount: "", monthly_payment: "", due_date: formatISO(new Date(), { representation: "date" }), note: "" };
}

export function DebtModal({ open, onClose, editing }: DebtModalProps) {
  const { bumpData } = useAppContext();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (editing) {
      setForm({
        name: editing.name,
        original_amount: String(minorUnitsToMoney(editing.original_amount)),
        monthly_payment: String(minorUnitsToMoney(editing.monthly_payment)),
        due_date: editing.due_date,
        note: editing.note ?? "",
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, editing]);

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    const original = Number(form.original_amount);
    const monthly = Number(form.monthly_payment);
    if (!form.name.trim()) next.name = "Debt name is required.";
    if (!form.original_amount || !Number.isFinite(original) || original <= 0) next.original_amount = "Enter an amount greater than zero.";
    if (form.monthly_payment && (!Number.isFinite(monthly) || monthly < 0)) next.monthly_payment = "Enter a valid monthly payment.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const input: DebtInput = {
        name: form.name.trim(),
        original_amount: moneyToMinorUnits(Number(form.original_amount)),
        monthly_payment: moneyToMinorUnits(Number(form.monthly_payment || 0)),
        due_date: form.due_date,
        note: form.note.trim() || null,
      };
      if (editing) {
        await unwrap(window.api.debts.update(editing.id, input));
        showToast("Debt updated");
      } else {
        await unwrap(window.api.debts.create(input));
        showToast("Debt added");
      }
      bumpData();
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not save debt.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Debt" : "Add Debt"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" className="!bg-accent-orange !text-[#1a0d05] !border-none hover:!bg-[#fb9d6f]" onClick={handleSubmit} disabled={submitting}>
            {editing ? "Save Changes" : "Add Debt"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FieldWrap label="Debt Name" error={errors.name}>
          <TextInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Credit Card" />
        </FieldWrap>

        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label={editing ? "Original Amount" : "Amount Owed"} error={errors.original_amount}>
            <div className="flex items-center bg-surface-alt border border-border rounded-control px-3 py-2.5 focus-within:border-accent-orange">
              <span className="text-lg font-bold mr-1 text-accent-orange">₺</span>
              <input
                inputMode="decimal"
                value={form.original_amount}
                onChange={(e) => setForm((f) => ({ ...f, original_amount: e.target.value.replace(/[^0-9.]/g, "") }))}
                placeholder="0"
                className="flex-1 bg-transparent text-lg font-bold text-text outline-none"
              />
            </div>
          </FieldWrap>
          <FieldWrap label="Monthly Payment" error={errors.monthly_payment}>
            <TextInput
              inputMode="decimal"
              value={form.monthly_payment}
              onChange={(e) => setForm((f) => ({ ...f, monthly_payment: e.target.value.replace(/[^0-9.]/g, "") }))}
              placeholder="0"
            />
          </FieldWrap>
        </div>

        <FieldWrap label="Due Date">
          <TextInput type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
        </FieldWrap>

        <FieldWrap label="Note (optional)">
          <TextArea rows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Add a note" />
        </FieldWrap>
      </div>
    </Modal>
  );
}
