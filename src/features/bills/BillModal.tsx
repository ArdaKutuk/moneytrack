import { useEffect, useState } from "react";
import { formatISO } from "date-fns";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldWrap, Select, TextInput } from "@/components/ui/Field";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/useToast";
import { unwrap } from "@/hooks/useApi";
import { moneyToMinorUnits, minorUnitsToMoney } from "@shared/money";
import type { BillInput, BillWithCategory, RecurrenceFrequency } from "@shared/types";

interface BillModalProps {
  open: boolean;
  onClose: () => void;
  editing: BillWithCategory | null;
}

interface FormState {
  name: string;
  amount: string;
  category_id: string;
  due_date: string;
  is_recurring: boolean;
  recurrence_frequency: RecurrenceFrequency;
}

function emptyForm(): FormState {
  return {
    name: "",
    amount: "",
    category_id: "",
    due_date: formatISO(new Date(), { representation: "date" }),
    is_recurring: true,
    recurrence_frequency: "monthly",
  };
}

export function BillModal({ open, onClose, editing }: BillModalProps) {
  const { categories, bumpData } = useAppContext();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const expenseCategories = categories.filter((c) => c.type === "expense");

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (editing) {
      setForm({
        name: editing.name,
        amount: String(minorUnitsToMoney(editing.amount)),
        category_id: String(editing.category_id),
        due_date: editing.due_date,
        is_recurring: !!editing.is_recurring,
        recurrence_frequency: editing.recurrence_frequency ?? "monthly",
      });
    } else {
      setForm({ ...emptyForm(), category_id: expenseCategories[0] ? String(expenseCategories[0].id) : "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    const amountValue = Number(form.amount);
    if (!form.name.trim()) next.name = "Bill name is required.";
    if (!form.amount || !Number.isFinite(amountValue) || amountValue <= 0) next.amount = "Enter an amount greater than zero.";
    if (!form.category_id) next.category_id = "Category is required.";
    if (!form.due_date) next.due_date = "Due date is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const input: BillInput = {
        name: form.name.trim(),
        amount: moneyToMinorUnits(Number(form.amount)),
        category_id: Number(form.category_id),
        due_date: form.due_date,
        is_recurring: form.is_recurring ? 1 : 0,
        recurrence_frequency: form.is_recurring ? form.recurrence_frequency : null,
      };
      if (editing) {
        await unwrap(window.api.bills.update(editing.id, input));
        showToast("Bill updated");
      } else {
        await unwrap(window.api.bills.create(input));
        showToast("Bill added");
      }
      bumpData();
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not save bill.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Bill" : "Add Bill"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="yellow" onClick={handleSubmit} disabled={submitting}>
            {editing ? "Save Changes" : "Add Bill"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FieldWrap label="Bill Name" error={errors.name}>
          <TextInput
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Internet"
          />
        </FieldWrap>

        <FieldWrap label="Amount" error={errors.amount}>
          <div className="flex items-center bg-surface-alt border border-border rounded-control px-3 py-2.5 focus-within:border-accent-yellow">
            <span className="text-lg font-bold mr-1 text-accent-yellow">₺</span>
            <input
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/[^0-9.]/g, "") }))}
              placeholder="0"
              className="flex-1 bg-transparent text-lg font-bold text-text outline-none"
            />
          </div>
        </FieldWrap>

        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Category" error={errors.category_id}>
            <Select value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FieldWrap>
          <FieldWrap label="Due Date" error={errors.due_date}>
            <TextInput
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
            />
          </FieldWrap>
        </div>

        <div className="flex items-center justify-between bg-surface-alt border border-border rounded-control px-3.5 py-3">
          <div>
            <div className="text-[13px] font-bold">Recurring</div>
            <div className="text-[11.5px] text-text-muted mt-0.5">Automatically schedule the next due date</div>
          </div>
          <button
            onClick={() => setForm((f) => ({ ...f, is_recurring: !f.is_recurring }))}
            className="w-9 h-5 rounded-full relative transition-colors shrink-0"
            style={{ background: form.is_recurring ? "#fbbf24" : "#2a3038" }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
              style={{ transform: form.is_recurring ? "translateX(16px)" : "translateX(0px)" }}
            />
          </button>
        </div>

        {form.is_recurring && (
          <FieldWrap label="Frequency">
            <Select
              value={form.recurrence_frequency}
              onChange={(e) => setForm((f) => ({ ...f, recurrence_frequency: e.target.value as RecurrenceFrequency }))}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </Select>
          </FieldWrap>
        )}
      </div>
    </Modal>
  );
}
