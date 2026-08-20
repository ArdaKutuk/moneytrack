import fs from "node:fs";
import path from "node:path";
import { app, type BrowserWindow, screen } from "electron";

interface WindowBounds {
  width: number;
  height: number;
  x?: number;
  y?: number;
}

const DEFAULT_BOUNDS: WindowBounds = { width: 1440, height: 900 };

function statePath(): string {
  return path.join(app.getPath("userData"), "window-state.json");
}

/** Reads the last known window bounds, falling back to the design's default
 * size and clamping to whatever display is currently available (handles a
 * saved position from a monitor that's no longer connected). */
export function loadWindowBounds(): WindowBounds {
  try {
    const raw = fs.readFileSync(statePath(), "utf-8");
    const saved = JSON.parse(raw) as WindowBounds;
    if (typeof saved.width !== "number" || typeof saved.height !== "number") return DEFAULT_BOUNDS;

    if (typeof saved.x === "number" && typeof saved.y === "number") {
      const withinDisplay = screen.getAllDisplays().some((d) => {
        const a = d.workArea;
        return saved.x! >= a.x && saved.x! < a.x + a.width && saved.y! >= a.y && saved.y! < a.y + a.height;
      });
      if (!withinDisplay) return { width: saved.width, height: saved.height };
    }
    return saved;
  } catch {
    return DEFAULT_BOUNDS;
  }
}

/** Persists a window's current bounds, debounced by the caller (via
 * `resize`/`move` + `close`) so this stays cheap. */
export function saveWindowBounds(win: BrowserWindow): void {
  try {
    const bounds = win.getBounds();
    fs.writeFileSync(statePath(), JSON.stringify(bounds), "utf-8");
  } catch {
    // Losing the saved window position is not worth crashing over.
  }
}
