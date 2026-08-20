import { useEffect, useMemo, useRef, useState } from "react";
import { formatISO } from "date-fns";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAppContext } from "@/context/AppContext";
import { useQuery, unwrap } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import { formatSignedCurrency, formatCurrency } from "@shared/money";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { hexAlpha, relativeDateLabel } from "@/utils/format";
import type { TransactionFilters, TransactionType } from "@shared/types";

const SORTS: Array<{ value: NonNullable<TransactionFilters["sort"]>; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "highest", label: "Highest amount" },
  { value: "lowest", label: "Lowest amount" },
];

export function Transactions() {
  const { currency, categories, dataVersion, bumpData, openAddTransaction } = useAppContext();
  const { showToast } = useToast();
  const todayISO = formatISO(new Date(), { representation: "date" });

  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [categoryId, setCategoryId] = useState<number | "all">("all");
  const [sort, setSort] = useState<NonNullable<TransactionFilters["sort"]>>("newest");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filters: TransactionFilters = useMemo(
    () => ({
      type: typeFilter,
      categoryId,
      sort,
      search: search.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [typeFilter, categoryId, sort, search, startDate, endDate]
  );

  const { data: rows, loading } = useQuery(
    () => window.api.transactions.list(filters),
    [dataVersion, JSON.stringify(filters)]
  );

  async function handleDelete() {
    if (deleteId === null) return;
    try {
      await unwrap(window.api.transactions.remove(deleteId));
      showToast("Transaction deleted");
      bumpData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not delete transaction.", "error");
    } finally {
      setDeleteId(null);
    }
  }

  const sumIn = (rows ?? []).filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const sumOut = (rows ?? []).filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const hasActiveFilters = typeFilter !== "all" || categoryId !== "all" || !!search || !!startDate || !!endDate;

  return (
    <div className="px-7 py-[30px] pb-11 animate-mtFade">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[26px] font-extrabold tracking-[-0.7px]">Transactions</div>
          <div className="text-[13.5px] text-text-secondary mt-1.5 font-medium">
            {rows ? `${rows.length} records` : " "}
          </div>
        </div>
        <Button onClick={() => openAddTransaction(null)}>
          <Plus size={14} strokeWidth={3} /> Add Transaction
        </Button>
      </div>

      <Card padding="p-0">
        <div className="flex items-center gap-3 p-3.5 border-b border-border-soft flex-wrap">
          <div className="flex gap-0.5 bg-surface-alt border border-border rounded-[9px] p-[3px]">
            {(["all", "income", "expense"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3.5 py-1.5 rounded-[7px] text-[11.5px] font-bold capitalize transition-colors ${
                  typeFilter === t ? "bg-[#1f2630] text-text" : "text-text-faint hover:text-text"
                }`}
              >
                {t === "all" ? "All" : t}
              </button>
            ))}
          </div>

          <Select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="w-auto"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="w-auto">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-surface-alt border border-border text-text-secondary text-xs font-semibold px-2.5 py-2 rounded-[9px]"
              aria-label="From date"
            />
            <span className="text-text-muted text-xs">–</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-surface-alt border border-border text-text-secondary text-xs font-semibold px-2.5 py-2 rounded-[9px]"
              aria-label="To date"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setTypeFilter("all");
                setCategoryId("all");
                setSearch("");
                setStartDate("");
                setEndDate("");
              }}
              className="flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-text transition-colors"
            >
              <X size={12} /> Clear
            </button>
          )}

          <div className="flex-1" />

          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, category…"
              className="w-[250px] bg-surface-alt border border-border rounded-[9px] pl-8 pr-3 py-2.5 text-text text-[12.5px] font-medium focus:border-accent-green transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-[104px_minmax(0,1fr)_132px_148px_96px_118px_76px] gap-2.5 px-4.5 py-2.5 border-b border-border-soft bg-surface-alt text-[10.5px] uppercase tracking-wide text-text-muted font-bold">
          <div>Date</div>
          <div>Description</div>
          <div>Category</div>
          <div>Account</div>
          <div>Type</div>
          <div className="text-right">Amount</div>
          <div className="text-right">Actions</div>
        </div>

        {!loading && (rows ?? []).length === 0 ? (
          <EmptyState
            title="No transactions yet."
            description="Add your first transaction to start understanding your spending."
            action={
              <Button onClick={() => openAddTransaction(null)}>
                <Plus size={14} strokeWidth={3} /> Add Transaction
              </Button>
            }
          />
        ) : (
          <div>
            {(rows ?? []).map((t) => {
              const Icon = getCategoryIcon(t.category_icon);
              const income = t.type === "income";
              return (
                <div
                  key={t.id}
                  className="grid grid-cols-[104px_minmax(0,1fr)_132px_148px_96px_118px_76px] gap-2.5 items-center px-4.5 py-3.5 border-b border-border-soft hover:bg-[color:var(--mt-surface-alt)] transition-colors"
                >
                  <div className="text-xs text-text-secondary font-semibold font-mono">
                    {relativeDateLabel(t.date, todayISO)}
                  </div>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 shrink-0 rounded-[9px] flex items-center justify-center"
                      style={{ background: hexAlpha(t.category_color), color: t.category_color }}
                    >
                      <Icon size={13} />
                    </div>
                    <div className="text-[13px] font-bold truncate">{t.description}</div>
                  </div>
                  <div>
                    <span
                      className="text-[11.5px] font-bold px-2 py-0.5 rounded-md"
                      style={{ background: hexAlpha(t.category_color), color: t.category_color }}
                    >
                      {t.category_name}
                    </span>
                  </div>
                  <div className="text-xs text-[#a8aeb9] font-semibold truncate">{t.account}</div>
                  <div className={`text-xs font-bold ${income ? "text-accent-green" : "text-accent-red"}`}>
                    {income ? "Income" : "Expense"}
                  </div>
                  <div className={`text-[13.5px] font-extrabold tracking-[-0.3px] text-right ${income ? "text-accent-green" : "text-accent-red"}`}>
                    {formatSignedCurrency(income ? t.amount : -t.amount, currency)}
                  </div>
                  <div className="flex gap-1.5 justify-end">
                    <button
                      onClick={() => openAddTransaction(t.id)}
                      aria-label="Edit"
                      className="w-[26px] h-[26px] rounded-[7px] border border-border flex items-center justify-center text-text-secondary hover:border-[#3a4150] hover:text-text hover:bg-[color:var(--mt-surface-alt)] transition-colors"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => setDeleteId(t.id)}
                      aria-label="Delete"
                      className="w-[26px] h-[26px] rounded-[7px] border border-border flex items-center justify-center text-text-secondary hover:border-[#5c2a34] hover:text-accent-red hover:bg-[rgba(251,113,133,0.08)] transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(rows ?? []).length > 0 && (
          <div className="flex items-center justify-between px-4.5 py-3.5">
            <div className="text-xs text-text-muted font-semibold">Showing {rows?.length} transactions</div>
            <div className="flex items-center gap-5.5">
              <div className="text-xs font-semibold text-text-secondary">
                Inflow <span className="text-accent-green font-extrabold">{formatCurrency(sumIn, currency)}</span>
              </div>
              <div className="text-xs font-semibold text-text-secondary">
                Outflow <span className="text-accent-red font-extrabold">{formatCurrency(sumOut, currency)}</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete this transaction?"
        message="This will permanently remove the transaction. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
