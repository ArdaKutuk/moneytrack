import { useEffect, useState, type ReactNode } from "react";
import { Database, Download, FlaskConical, Upload } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/useToast";
import { unwrap } from "@/hooks/useApi";
import type { DateFormat, Theme, WeekStart } from "@shared/types";

const CURRENCIES = [
  { code: "TRY", label: "Turkish Lira (₺)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
];

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card padding="p-0" className="overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border-soft text-[11px] font-bold uppercase tracking-wide text-text-muted">
        {title}
      </div>
      <div className="divide-y divide-[color:var(--mt-border-soft)]">{children}</div>
    </Card>
  );
}

function Row({ title, description, control }: { title: string; description: string; control: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 gap-6">
      <div>
        <div className="text-[13.5px] font-bold">{title}</div>
        <div className="text-[12px] text-text-faint font-medium mt-0.5">{description}</div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

export function Settings() {
  const { settings, refreshSettings, bumpData } = useAppContext();
  const { showToast } = useToast();
  const [isPackaged, setIsPackaged] = useState(true);
  const [resetOpen, setResetOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    unwrap(window.api.app.isPackaged())
      .then(setIsPackaged)
      .catch(() => undefined);
  }, []);

  async function updateSetting(patch: Partial<{ currency: string; theme: Theme; week_start: WeekStart; date_format: DateFormat }>) {
    try {
      await unwrap(window.api.settings.update(patch));
      refreshSettings();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not save settings.", "error");
    }
  }

  async function handleExport(format: "csv" | "json") {
    setBusy(`export-${format}`);
    try {
      const result = await unwrap(window.api.data.exportData(format));
      if (result) showToast(`Exported to ${result.filePath}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Export failed.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleBackup() {
    setBusy("backup");
    try {
      const result = await unwrap(window.api.data.backup());
      if (result) showToast("Backup completed");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Backup failed.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleImport() {
    setBusy("import");
    try {
      await unwrap(window.api.data.importData());
      showToast("Data imported");
      bumpData();
      refreshSettings();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Import failed — file was not modified.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleReset() {
    setBusy("reset");
    try {
      await unwrap(window.api.data.reset());
      showToast("Application data has been reset");
      bumpData();
      refreshSettings();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Reset failed.", "error");
    } finally {
      setBusy(null);
      setResetOpen(false);
    }
  }

  async function handleSeedDemo() {
    setBusy("seed");
    try {
      await unwrap(window.api.data.seedDemo());
      showToast("Demo data loaded");
      bumpData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not seed demo data.", "error");
    } finally {
      setBusy(null);
    }
  }

  if (!settings) return null;

  return (
    <div className="px-7 py-[30px] pb-11 animate-mtFade max-w-[720px]">
      <div className="mb-6">
        <div className="text-[26px] font-extrabold tracking-[-0.7px]">Settings</div>
        <div className="text-[13.5px] text-text-secondary mt-1.5 font-medium">Preferences, data and appearance</div>
      </div>

      <div className="flex flex-col gap-5">
        <SectionCard title="General">
          <Row
            title="Currency"
            description="Used across all screens and reports"
            control={
              <Select value={settings.currency} onChange={(e) => updateSetting({ currency: e.target.value })} className="w-48">
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </Select>
            }
          />
          <Row
            title="First day of week"
            description="Affects weekly cash flow grouping"
            control={
              <Select value={settings.week_start} onChange={(e) => updateSetting({ week_start: e.target.value as WeekStart })} className="w-48">
                <option value="monday">Monday</option>
                <option value="sunday">Sunday</option>
              </Select>
            }
          />
          <Row
            title="Date format"
            description="How dates appear in tables"
            control={
              <Select value={settings.date_format} onChange={(e) => updateSetting({ date_format: e.target.value as DateFormat })} className="w-48">
                <option value="DD.MM.YYYY">DD.MM.YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </Select>
            }
          />
        </SectionCard>

        <SectionCard title="Appearance">
          <Row
            title="Theme"
            description="Dark is enabled by default"
            control={
              <div className="flex gap-0.5 bg-surface-alt border border-border rounded-[9px] p-[3px]">
                {(["dark", "light", "system"] as Theme[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => updateSetting({ theme: t })}
                    className={`px-3.5 py-1.5 rounded-[7px] text-[11.5px] font-bold capitalize transition-colors ${
                      settings.theme === t ? "bg-[#1f2630] text-text" : "text-text-faint hover:text-text"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            }
          />
        </SectionCard>

        <SectionCard title="Data">
          <Row
            title="Export Data"
            description="Save your transactions as CSV or a full JSON snapshot"
            control={
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => handleExport("csv")} disabled={busy === "export-csv"}>
                  <Download size={13} /> CSV
                </Button>
                <Button variant="secondary" onClick={() => handleExport("json")} disabled={busy === "export-json"}>
                  <Download size={13} /> JSON
                </Button>
              </div>
            }
          />
          <Row
            title="Import Data"
            description="Restore from a Moneytrack JSON export"
            control={
              <Button variant="secondary" onClick={handleImport} disabled={busy === "import"}>
                <Upload size={13} /> Import JSON
              </Button>
            }
          />
          <Row
            title="Backup Database"
            description="Save a copy of your SQLite database file"
            control={
              <Button variant="secondary" onClick={handleBackup} disabled={busy === "backup"}>
                <Database size={13} /> Back Up
              </Button>
            }
          />
          {!isPackaged && (
            <Row
              title="Seed Demo Data"
              description="Development only — fills the database with sample data for testing charts"
              control={
                <Button variant="secondary" onClick={handleSeedDemo} disabled={busy === "seed"}>
                  <FlaskConical size={13} /> Seed Demo Data
                </Button>
              }
            />
          )}
        </SectionCard>

        <SectionCard title="Danger Zone">
          <Row
            title="Reset Application Data"
            description="Permanently deletes all transactions, budgets, bills and debts"
            control={
              <Button variant="danger" onClick={() => setResetOpen(true)}>
                Reset Data
              </Button>
            }
          />
        </SectionCard>
      </div>

      <ConfirmDialog
        open={resetOpen}
        title="Reset all application data?"
        message="This permanently deletes every transaction, budget, bill, debt and payment. Categories and settings are restored to defaults. This cannot be undone."
        confirmLabel="Reset Everything"
        onConfirm={handleReset}
        onCancel={() => setResetOpen(false)}
      />
    </div>
  );
}
