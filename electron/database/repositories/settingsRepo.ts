import type Database from "better-sqlite3";
import type { Settings, SettingsInput } from "@shared/types";

export function getSettings(db: Database.Database): Settings {
  return db.prepare("SELECT * FROM settings WHERE id = 1").get() as Settings;
}

export function updateSettings(db: Database.Database, input: SettingsInput): Settings {
  const current = getSettings(db);
  const next = { ...current, ...input };
  db.prepare(
    `UPDATE settings SET currency = @currency, theme = @theme, week_start = @week_start, date_format = @date_format WHERE id = 1`
  ).run(next);
  return getSettings(db);
}
