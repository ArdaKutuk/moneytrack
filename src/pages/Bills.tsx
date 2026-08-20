import { useState } from "react";
import { formatISO } from "date-fns";
import { CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BillModal } from "@/features/bills/BillModal";
import { MarkPaidDialog } from "@/features/bills/MarkPaidDialog";
import { useAppContext } from "@/context/AppContext";
import { useQuery, unwrap } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@shared/money";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { hexAlpha, dueLabel } from "@/utils/format";
import type { BillWithCategory } from "@shared/types";

const STATUS_COLOR: Record<string, string> = { "due soon": "#fbbf24", upcoming: "#60a5fa", paid: "#34d399", overdue: "#fb7185" };

export function Bills() {
  const { currency, dataVersion, bumpData } = useAppContext();
  const { showToast } = useToast();
  const todayISO = formatISO(new Date(), { representation: "date" });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BillWithCategory | null>(null);
  const [payingBill, setPayingBill] = useState<BillWithCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BillWithCategory | null>(null);

  const { data: bills } = useQuery(() => window.api.bills.list(), [dataVersion]);
  const list = bills ?? [];

  const unpaid = list.filter((b) => b.status !== "paid");
  const dueSoon = list.filter((b) => {
    const days = Math.round((new Date(b.due_date).getTime() - new Date(todayISO).getTime()) / 86_400_000);
    return b.status === "upcoming" && days >= 0 && days <= 3;
  });
  const paidThisMonth = list.filter((b) => b.status === "paid");
  const overdue = list.filter((b) => b.status === "overdue");

  const stats = [
    { label: "Upcoming Bills", value: formatCurrency(unpaid.reduce((s, b) => s + b.amount, 0), currency), sub: `${unpaid.length} bills scheduled`, color: "#60a5fa" },
    { label: "Due Soon", value: formatCurrency(dueSoon.reduce((s, b) => s + b.amount, 0), currency), sub: `${dueSoon.length} within 3 days`, color: "#fbbf24" },
    { label: "Paid", value: formatCurrency(paidThisMonth.reduce((s, b) => s + b.amount, 0), currency), sub: `${paidThisMonth.length} payments cleared`, color: "#34d399" },
    { label: "Overdue", value: formatCurrency(overdue.reduce((s, b) => s + b.amount, 0), currency), sub: `${overdue.length} need attention`, color: "#fb7185" },
  ];

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await unwrap(window.api.bills.remove(deleteTarget.id));
      showToast("Bill deleted");
      bumpData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not delete bill.", "error");
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="px-7 py-[30px] pb-11 animate-mtFade">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[26px] font-extrabold tracking-[-0.7px]">Bills</div>
          <div className="text-[13.5px] text-text-secondary mt-1.5 font-medium">Recurring payments and due dates</div>
        </div>
        <Button
          variant="yellow"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus size={14} strokeWidth={3} /> Add Bill
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        {stats.map((s) => (
          <Card key={s.label} className="hover:-translate-y-0.5 hover:!border-[#2f3540] transition-all">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wide text-text-muted font-bold">{s.label}</div>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
            </div>
            <div className="text-[26px] font-extrabold tracking-[-1px] mt-3" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-[11.5px] text-text-faint font-semibold mt-1">{s.sub}</div>
          </Card>
        ))}
      </div>

      <Card padding="p-0">
        <div className="px-4.5 py-4 border-b border-border-soft text-sm font-bold">All Bills</div>
        {list.length === 0 ? (
          <EmptyState
            title="No bills yet."
            description="Add a bill and Moneytrack will remind you before it's due."
            action={
              <Button variant="yellow" onClick={() => setModalOpen(true)}>
                <Plus size={14} strokeWidth={3} /> Add Bill
              </Button>
            }
          />
        ) : (
          list.map((b) => {
            const Icon = getCategoryIcon(b.category_icon);
            const statusColor = STATUS_COLOR[b.status] ?? "#8b929e";
            return (
              <div
                key={b.id}
                className="grid grid-cols-[minmax(0,1fr)_150px_120px_108px_150px] gap-3 items-center px-4.5 py-3.5 border-b border-border-soft hover:bg-[color:var(--mt-surface-alt)] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-[34px] h-[34px] shrink-0 rounded-[10px] flex items-center justify-center"
                    style={{ background: hexAlpha(b.category_color), color: b.category_color }}
                  >
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-bold truncate">{b.name}</div>
                    <div className="text-[11.5px] text-text-faint font-semibold mt-0.5">
                      {b.category_name} · {b.is_recurring ? b.recurrence_frequency : "One-time"}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-text-secondary font-semibold">
                  Due {b.due_date}
                  <div className="text-text-faint mt-0.5">{dueLabel(b.due_date, todayISO)}</div>
                </div>
                <div>
                  <span
                    className="text-[10px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-md"
                    style={{ background: hexAlpha(statusColor, 0.14), color: statusColor }}
                  >
                    {b.status}
                  </span>
                </div>
                <div className="text-[13.5px] font-extrabold tracking-[-0.3px]">{formatCurrency(b.amount, currency)}</div>
                <div className="flex items-center gap-1.5 justify-end">
                  {b.status !== "paid" && (
                    <button
                      onClick={() => setPayingBill(b)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[7px] border border-border text-xs font-bold text-text-secondary hover:border-[#34d399] hover:text-accent-green hover:bg-[rgba(52,211,153,0.08)] transition-colors"
                    >
                      <CheckCircle2 size={12} /> Mark Paid
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditing(b);
                      setModalOpen(true);
                    }}
                    aria-label="Edit"
                    className="w-[26px] h-[26px] rounded-[7px] border border-border flex items-center justify-center text-text-secondary hover:border-[#3a4150] hover:text-text hover:bg-[color:var(--mt-surface-alt)] transition-colors"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(b)}
                    aria-label="Delete"
                    className="w-[26px] h-[26px] rounded-[7px] border border-border flex items-center justify-center text-text-secondary hover:border-[#5c2a34] hover:text-accent-red hover:bg-[rgba(251,113,133,0.08)] transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </Card>

      <BillModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
      <MarkPaidDialog bill={payingBill} onClose={() => setPayingBill(null)} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this bill?"
        message={`This will permanently remove "${deleteTarget?.name ?? ""}". Past payments already recorded stay in your transactions.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
