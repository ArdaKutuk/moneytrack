import { useEffect, useMemo, useState } from "react";
import { formatISO } from "date-fns";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldWrap, Select, TextInput } from "@/components/ui/Field";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/useToast";
import { unwrap } from "@/hooks/useApi";
import { moneyToMinorUnits, minorUnitsToMoney } from "@shared/money";
import type { TransactionInput, TransactionType } from "@shared/types";

const ACCOUNT_SUGGESTIONS = ["Cash", "Main Account", "Credit Card", "Savings"];

interface FormState {
  type: TransactionType;
  amount: string;
  description: string;
  category_id: string;
  date: string;
  account: string;
  note: string;
}

function emptyForm(): FormState {
  return {
    type: "expense",
    amount: "",
    description: "",
    category_id: "",
    date: formatISO(new Date(), { representation: "date" }),
    account: "Cash",
    note: "",
  };
}

export function AddTransactionModal() {
  const { txModal, closeTransactionModal, categories, bumpData } = useAppContext();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const isEdit = txModal.editId !== null;

  useEffect(() => {
    if (!txModal.open) return;
    setErrors({});
    if (txModal.editId === null) {
      setForm(emptyForm());
      return;
    }
    setLoadingExisting(true);
    unwrap(window.api.transactions.get(txModal.editId))
      .then((tx) => {
        setForm({
          type: tx.type,
          amount: String(minorUnitsToMoney(tx.amount)),
          description: tx.description,
          category_id: String(tx.category_id),
          date: tx.date,
          account: tx.account,
          note: tx.note ?? "",
        });
      })
      .catch((error: unknown) => {
        showToast(error instanceof Error ? error.message : "Could not load transaction.", "error");
        closeTransactionModal();
      })
      .finally(() => setLoadingExisting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txModal.open, txModal.editId]);

  const categoryOptions = useMemo(
    () => categories.filter((c) => c.type === form.type),
    [categories, form.type]
  );

  useEffect(() => {
    if (!txModal.open || loadingExisting) return;
    if (!categoryOptions.some((c) => String(c.id) === form.category_id)) {
      setForm((f) => ({ ...f, category_id: categoryOptions[0] ? String(categoryOptions[0].id) : "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.type, categoryOptions, txModal.open, loadingExisting]);

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    const amountValue = Number(form.amount);
    if (!form.amount || !Number.isFinite(amountValue) || amountValue <= 0) {
      next.amount = "Enter an amount greater than zero.";
    }
    if (!form.description.trim()) next.description = "Description is required.";
    if (!form.category_id) next.category_id = "Category is required.";
    if (!form.date) next.date = "Date is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const input: TransactionInput = {
        type: form.type,
        amount: moneyToMinorUnits(Number(form.amount)),
        description: form.description.trim(),
        category_id: Number(form.category_id),
        date: form.date,
        account: form.account.trim() || "Cash",
        note: form.note.trim() || null,
      };

      if (isEdit && txModal.editId !== null) {
        await unwrap(window.api.transactions.update(txModal.editId, input));
        showToast("Transaction updated");
      } else {
        await unwrap(window.api.transactions.create(input));
        showToast("Transaction added");
      }
      bumpData();
      closeTransactionModal();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not save transaction.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const isExpense = form.type === "expense";

  return (
    <Modal
      open={txModal.open}
      onClose={closeTransactionModal}
      title={isEdit ? "Edit Transaction" : "Add Transaction"}
      subtitle={isEdit ? undefined : "Entry takes about five seconds."}
      footer={
        <>
          <Button variant="secondary" onClick={closeTransactionModal}>
            Cancel
          </Button>
          <Button
            variant={isExpense ? "danger" : "primary"}
            onClick={handleSubmit}
            disabled={submitting || loadingExisting}
          >
            {isEdit ? "Save Changes" : "Add Transaction"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-1 bg-surface-alt border border-border rounded-control p-1">
          <button
            onClick={() => setForm((f) => ({ ...f, type: "expense" }))}
            className={`py-2 rounded-[7px] text-[12.5px] font-bold transition-colors ${
              isExpense ? "bg-[rgba(251,113,133,0.16)] text-accent-red" : "text-text-faint"
            }`}
          >
            Expense
          </button>
          <button
            onClick={() => setForm((f) => ({ ...f, type: "income" }))}
            className={`py-2 rounded-[7px] text-[12.5px] font-bold transition-colors ${
              !isExpense ? "bg-[rgba(52,211,153,0.16)] text-accent-green" : "text-text-faint"
            }`}
          >
            Income
          </button>
        </div>

        <FieldWrap label="Amount" error={errors.amount}>
          <div className="flex items-center bg-surface-alt border border-border rounded-control px-3 py-2.5 focus-within:border-accent-green">
            <span className={`text-lg font-bold mr-1 ${isExpense ? "text-accent-red" : "text-accent-green"}`}>
              ₺
            </span>
            <input
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/[^0-9.]/g, "") }))}
              placeholder="0"
              className="flex-1 bg-transparent text-lg font-bold text-text outline-none"
            />
          </div>
        </FieldWrap>

        <FieldWrap label="Description" error={errors.description}>
          <TextInput
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="e.g. Migros"
          />
        </FieldWrap>

        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Category" error={errors.category_id}>
            <Select
              value={form.category_id}
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
            >
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FieldWrap>
          <FieldWrap label="Date" error={errors.date}>
            <TextInput
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </FieldWrap>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Account">
            <TextInput
              list="account-suggestions"
              value={form.account}
              onChange={(e) => setForm((f) => ({ ...f, account: e.target.value }))}
            />
            <datalist id="account-suggestions">
              {ACCOUNT_SUGGESTIONS.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </FieldWrap>
          <FieldWrap label="Note (optional)">
            <TextInput
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Add a note"
            />
          </FieldWrap>
        </div>
      </div>
    </Modal>
  );
}
