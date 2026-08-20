import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldWrap, Select } from "@/components/ui/Field";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/useToast";
import { unwrap } from "@/hooks/useApi";
import { moneyToMinorUnits, minorUnitsToMoney } from "@shared/money";
import type { BudgetWithSpend } from "@shared/types";

interface BudgetModalProps {
  open: boolean;
  onClose: () => void;
  editing: BudgetWithSpend | null;
  month: number;
  year: number;
  existingCategoryIds: number[];
}

export function BudgetModal({ open, onClose, editing, month, year, existingCategoryIds }: BudgetModalProps) {
  const { categories, bumpData } = useAppContext();
  const { showToast } = useToast();
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const availableCategories = editing
    ? expenseCategories
    : expenseCategories.filter((c) => !existingCategoryIds.includes(c.id));

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setCategoryId(String(editing.category_id));
      setAmount(String(minorUnitsToMoney(editing.amount)));
    } else {
      setCategoryId(availableCategories[0] ? String(availableCategories[0].id) : "");
      setAmount("");
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  async function handleSubmit() {
    const amountValue = Number(amount);
    if (!categoryId) {
      setError("Select a category.");
      return;
    }
    if (!amount || !Number.isFinite(amountValue) || amountValue < 0) {
      setError("Enter a budget amount of zero or more.");
      return;
    }
    setSubmitting(true);
    try {
      await unwrap(
        window.api.budgets.upsert({
          category_id: Number(categoryId),
          amount: moneyToMinorUnits(amountValue),
          month,
          year,
        })
      );
      showToast("Budget saved");
      bumpData();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save budget.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Budget" : "Create Budget"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="purple" onClick={handleSubmit} disabled={submitting}>
            {editing ? "Save Changes" : "Create Budget"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FieldWrap label="Category">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={!!editing}>
            {availableCategories.length === 0 && !editing && <option value="">All categories already budgeted</option>}
            {(editing ? expenseCategories : availableCategories).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FieldWrap>
        <FieldWrap label="Monthly Limit" error={error ?? undefined}>
          <div className="flex items-center bg-surface-alt border border-border rounded-control px-3 py-2.5 focus-within:border-accent-purple">
            <span className="text-lg font-bold mr-1 text-accent-purple">₺</span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0"
              className="flex-1 bg-transparent text-lg font-bold text-text outline-none"
            />
          </div>
        </FieldWrap>
      </div>
    </Modal>
  );
}
