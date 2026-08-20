import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

let logPath: string | null = null;

function getLogPath(): string {
  if (!logPath) {
    const dir = path.join(app.getPath("userData"), "logs");
    fs.mkdirSync(dir, { recursive: true });
    logPath = path.join(dir, "error.log");
  }
  return logPath;
}

/** Logs unexpected errors locally so a crash/bug report has something to go
 * on. Deliberately takes only a channel name + error — never a payload —
 * so financial transaction contents never end up on disk in a log file. */
export function logError(context: string, error: unknown): void {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  const line = `[${new Date().toISOString()}] ${context}: ${message}\n`;
  try {
    fs.appendFileSync(getLogPath(), line, "utf-8");
  } catch {
    // Logging must never crash the app.
  }
  // eslint-disable-next-line no-console
  console.error(context, error);
}
