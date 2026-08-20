import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BudgetModal } from "@/features/budgets/BudgetModal";
import { useAppContext } from "@/context/AppContext";
import { useQuery, unwrap } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@shared/money";
import { budgetPercentage, budgetState } from "@shared/calculations";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { hexAlpha } from "@/utils/format";
import { BUDGET_STATE_COLOR, BUDGET_STATE_HINT, BUDGET_STATE_LABEL } from "@/utils/budgetVisuals";
import type { BudgetWithSpend } from "@shared/types";

export function Budgets() {
  const { currency, dataVersion, selectedMonth, selectedYear, monthLabel, bumpData } = useAppContext();
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetWithSpend | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetWithSpend | null>(null);

  const { data: budgets } = useQuery(
    () => window.api.budgets.listForMonth(selectedMonth, selectedYear),
    [dataVersion, selectedMonth, selectedYear]
  );

  const list = budgets ?? [];
  const totalBudget = list.reduce((s, b) => s + b.amount, 0);
  const totalSpent = list.reduce((s, b) => s + b.spent, 0);
  const overallPct = budgetPercentage(totalSpent, totalBudget);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await unwrap(window.api.budgets.remove(deleteTarget.id));
      showToast("Budget deleted");
      bumpData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not delete budget.", "error");
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="px-7 py-[30px] pb-11 animate-mtFade">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[26px] font-extrabold tracking-[-0.7px]">Budgets</div>
          <div className="text-[13.5px] text-text-secondary mt-1.5 font-medium">{monthLabel} · category limits</div>
        </div>
        <Button
          variant="purple"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus size={14} strokeWidth={3} /> Create Budget
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card>
          <div className="text-[11px] uppercase tracking-wide text-text-muted font-bold">Total Budget</div>
          <div className="text-[30px] font-extrabold tracking-[-1.2px] mt-3">{formatCurrency(totalBudget, currency)}</div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-wide text-text-muted font-bold">Spent</div>
          <div className="text-[30px] font-extrabold tracking-[-1.2px] mt-3 text-accent-red">
            {formatCurrency(totalSpent, currency)}
          </div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-wide text-text-muted font-bold">Remaining</div>
          <div className="text-[30px] font-extrabold tracking-[-1.2px] mt-3 text-accent-green">
            {formatCurrency(Math.max(0, totalBudget - totalSpent), currency)}
          </div>
        </Card>
      </div>

      {list.length > 0 && (
        <div className="mb-6">
          <ProgressBar percent={overallPct} color="#a78bfa" height={8} />
          <div className="text-[11.5px] text-text-muted font-semibold mt-2">{overallPct}% of monthly budget used</div>
        </div>
      )}

      {list.length === 0 ? (
        <Card className="!border-dashed">
          <EmptyState
            title="No budgets yet."
            description="Create a budget to control spending in your busiest categories."
            action={
              <Button variant="purple" onClick={() => setModalOpen(true)}>
                <Plus size={14} strokeWidth={3} /> Create Budget
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {list.map((b) => {
            const pct = budgetPercentage(b.spent, b.amount);
            const state = budgetState(pct);
            const color = BUDGET_STATE_COLOR[state];
            const Icon = getCategoryIcon(b.category_icon);
            const remaining = b.amount - b.spent;
            return (
              <Card
                key={b.id}
                className="group hover:-translate-y-0.5 transition-all cursor-pointer"
                style={pct >= 90 ? { borderColor: hexAlpha(color, 0.4) } : undefined}
              >
                <div
                  onClick={() => {
                    setEditing(b);
                    setModalOpen(true);
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center shrink-0"
                      style={{ background: hexAlpha(b.category_color), color: b.category_color }}
                    >
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{b.category_name}</div>
                      <div className="text-[11.5px] text-text-faint font-semibold mt-0.5">
                        Monthly limit {formatCurrency(b.amount, currency)}
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-md shrink-0"
                      style={{ background: hexAlpha(color, 0.14), color }}
                    >
                      {BUDGET_STATE_LABEL[state]}
                    </span>
                  </div>

                  <div className="flex items-end justify-between mt-4.5">
                    <div>
                      <div className="text-[10.5px] uppercase tracking-wide text-text-muted font-bold">Spent</div>
                      <div className="text-2xl font-extrabold tracking-[-1px] mt-1">
                        {formatCurrency(b.spent, currency)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10.5px] uppercase tracking-wide text-text-muted font-bold">
                        {remaining < 0 ? "Over by" : "Remaining"}
                      </div>
                      <div
                        className="text-[15px] font-extrabold tracking-[-0.4px] mt-1.5"
                        style={{ color: remaining < 0 ? "#fb7185" : "#34d399" }}
                      >
                        {formatCurrency(Math.abs(remaining), currency)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <ProgressBar percent={pct} color={color} />
                  </div>
                  <div className="flex justify-between mt-2">
                    <div className="text-[11.5px] text-text-faint font-semibold">{pct}% used</div>
                    <div className="text-[11.5px] font-bold" style={{ color }}>
                      {BUDGET_STATE_HINT[state]}
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(b);
                  }}
                  className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-accent-red transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={12} /> Remove budget
                </button>
              </Card>
            );
          })}
        </div>
      )}

      <BudgetModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        month={selectedMonth}
        year={selectedYear}
        existingCategoryIds={list.map((b) => b.category_id)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove this budget?"
        message={`This will remove the ${deleteTarget?.category_name ?? ""} budget for ${monthLabel}. Past spending is not affected.`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
