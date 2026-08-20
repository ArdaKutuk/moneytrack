import { useState } from "react";
import { History, Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DebtModal } from "@/features/debts/DebtModal";
import { RecordPaymentModal } from "@/features/debts/RecordPaymentModal";
import { PaymentHistoryModal } from "@/features/debts/PaymentHistoryModal";
import { useAppContext } from "@/context/AppContext";
import { useQuery, unwrap } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@shared/money";
import { initials } from "@/utils/format";
import type { Debt } from "@shared/types";

export function Debts() {
  const { currency, dataVersion, bumpData } = useAppContext();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [historyDebt, setHistoryDebt] = useState<Debt | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Debt | null>(null);

  const { data: debts } = useQuery(() => window.api.debts.list(), [dataVersion]);
  const list = debts ?? [];

  const totalOriginal = list.reduce((s, d) => s + d.original_amount, 0);
  const totalRemaining = list.reduce((s, d) => s + d.remaining_amount, 0);
  const totalMonthly = list.reduce((s, d) => s + d.monthly_payment, 0);
  const paidOffPct = totalOriginal > 0 ? Math.round(((totalOriginal - totalRemaining) / totalOriginal) * 100) : 0;

  const stats = [
    { label: "Total Debt", value: formatCurrency(totalOriginal, currency), sub: `${list.length} active obligations`, color: "#e7e9ed" },
    { label: "Monthly Payments", value: formatCurrency(totalMonthly, currency), sub: "Scheduled this month", color: "#fb923c" },
    { label: "Remaining", value: formatCurrency(totalRemaining, currency), sub: totalOriginal ? `${paidOffPct}% paid off` : "Nothing owed", color: "#34d399" },
  ];

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await unwrap(window.api.debts.remove(deleteTarget.id));
      showToast("Debt deleted");
      bumpData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not delete debt.", "error");
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="px-7 py-[30px] pb-11 animate-mtFade">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[26px] font-extrabold tracking-[-0.7px]">Debts</div>
          <div className="text-[13.5px] text-text-secondary mt-1.5 font-medium">Payoff progress across your obligations</div>
        </div>
        <Button
          variant="secondary"
          className="!bg-accent-orange !text-[#1a0d05] !border-none hover:!bg-[#fb9d6f]"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus size={14} strokeWidth={3} /> Add Debt
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <div className="text-[11px] uppercase tracking-wide text-text-muted font-bold">{s.label}</div>
            <div className="text-[26px] font-extrabold tracking-[-1px] mt-3" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-[11.5px] text-text-faint font-semibold mt-1">{s.sub}</div>
          </Card>
        ))}
      </div>

      {list.length === 0 ? (
        <Card className="!border-dashed">
          <EmptyState
            title="No debts tracked."
            description="Add a debt to track payoff progress and monthly payments."
            action={
              <Button variant="secondary" className="!bg-accent-orange !text-[#1a0d05] !border-none hover:!bg-[#fb9d6f]" onClick={() => setModalOpen(true)}>
                <Plus size={14} strokeWidth={3} /> Add Debt
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {list.map((d) => {
            const pct = d.original_amount > 0 ? Math.round(((d.original_amount - d.remaining_amount) / d.original_amount) * 100) : 0;
            const paidOff = d.remaining_amount <= 0;
            const color = paidOff ? "#34d399" : pct >= 60 ? "#34d399" : pct >= 35 ? "#fbbf24" : "#fb923c";
            const monthsLeft = d.monthly_payment > 0 ? Math.ceil(d.remaining_amount / d.monthly_payment) : null;

            return (
              <Card key={d.id} className="hover:-translate-y-0.5 transition-all">
                <div className="flex items-center gap-2.5">
                  <div className="w-[34px] h-[34px] rounded-[10px] bg-[rgba(251,146,60,0.14)] text-accent-orange-alt flex items-center justify-center font-mono text-[10px] font-extrabold shrink-0">
                    {initials(d.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{d.name}</div>
                    <div className="text-[11.5px] text-text-faint font-semibold mt-0.5">Due {d.due_date}</div>
                  </div>
                  {paidOff && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-[rgba(52,211,153,0.14)] text-accent-green shrink-0">
                      Paid Off
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <div className="text-[10.5px] uppercase tracking-wide text-text-muted font-bold">Remaining</div>
                  <div className="text-2xl font-extrabold tracking-[-1px] mt-1" style={{ color: paidOff ? "#34d399" : "#e7e9ed" }}>
                    {formatCurrency(d.remaining_amount, currency)}
                  </div>
                </div>

                <div className="mt-3.5">
                  <ProgressBar percent={pct} color={color} />
                </div>
                <div className="flex justify-between mt-2">
                  <div className="text-[11.5px] text-text-faint font-semibold">{pct}% paid</div>
                  {monthsLeft !== null && !paidOff && (
                    <div className="text-[11.5px] font-bold text-text-secondary">{monthsLeft} mo left</div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border-soft text-center">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-text-muted font-bold">Original</div>
                    <div className="text-[12.5px] font-bold mt-1">{formatCurrency(d.original_amount, currency)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-text-muted font-bold">Paid</div>
                    <div className="text-[12.5px] font-bold mt-1 text-accent-green">
                      {formatCurrency(d.original_amount - d.remaining_amount, currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-text-muted font-bold">Monthly</div>
                    <div className="text-[12.5px] font-bold mt-1">{formatCurrency(d.monthly_payment, currency)}</div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  {!paidOff && (
                    <Button
                      variant="secondary"
                      className="flex-1 !bg-accent-orange !text-[#1a0d05] !border-none hover:!bg-[#fb9d6f]"
                      onClick={() => setPayingDebt(d)}
                    >
                      Record Payment
                    </Button>
                  )}
                  <button
                    onClick={() => setHistoryDebt(d)}
                    aria-label="Payment history"
                    className="w-9 h-9 rounded-control border border-border flex items-center justify-center text-text-secondary hover:border-[#3a4150] hover:text-text hover:bg-[color:var(--mt-surface-alt)] transition-colors shrink-0"
                  >
                    <History size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setEditing(d);
                      setModalOpen(true);
                    }}
                    aria-label="Edit"
                    className="w-9 h-9 rounded-control border border-border flex items-center justify-center text-text-secondary hover:border-[#3a4150] hover:text-text hover:bg-[color:var(--mt-surface-alt)] transition-colors shrink-0"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(d)}
                    aria-label="Delete"
                    className="w-9 h-9 rounded-control border border-border flex items-center justify-center text-text-secondary hover:border-[#5c2a34] hover:text-accent-red hover:bg-[rgba(251,113,133,0.08)] transition-colors shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <DebtModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
      <RecordPaymentModal debt={payingDebt} onClose={() => setPayingDebt(null)} />
      <PaymentHistoryModal debt={historyDebt} onClose={() => setHistoryDebt(null)} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this debt?"
        message={`This will permanently remove "${deleteTarget?.name ?? ""}" and its payment history.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
