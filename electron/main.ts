import path from "node:path";
import { app, BrowserWindow, Menu, shell, type MenuItemConstructorOptions } from "electron";
import { closeDatabase, getDatabase } from "./database/database";
import { registerIpcHandlers } from "./ipc/handlers";
import { loadWindowBounds, saveWindowBounds } from "./utils/windowState";
import { logError } from "./utils/logger";

const isDev = !app.isPackaged;
const VITE_DEV_SERVER_URL = "http://localhost:5173";

let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  const bounds = loadWindowBounds();

  const win = new BrowserWindow({
    ...bounds,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: "#0d0f12",
    title: "Moneytrack",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      // Mandatory: contextIsolation on + nodeIntegration off is what actually
      // keeps the renderer's web content off Node/Electron internals — the
      // curated `api` object from preload.ts is the only bridge across.
      // Electron's `sandbox: true` is a separate, stricter mode that also
      // restricts preload itself to a dependency-free single file (no local
      // `require`s), which would mean bundling preload.ts and its shared
      // imports through an extra build step; not worth it for the marginal
      // hardening on top of contextIsolation, so it stays off.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once("ready-to-show", () => win.show());
  win.webContents.on("preload-error", (_event, preloadPath, error) => {
    logError(`preload:${preloadPath}`, error);
  });

  let saveTimer: NodeJS.Timeout | null = null;
  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveWindowBounds(win), 400);
  };
  win.on("resize", scheduleSave);
  win.on("move", scheduleSave);
  win.on("close", () => saveWindowBounds(win));

  // Keep external links (there shouldn't be many, if any) out of the app shell.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    void win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    void win.loadFile(path.join(__dirname, "../../dist/index.html"));
  }

  return win;
}

function buildMenu(win: BrowserWindow): Menu {
  const isMac = process.platform === "darwin";

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "New Transaction",
          accelerator: "CmdOrCtrl+N",
          click: () => win.webContents.send("shortcut:new-transaction"),
        },
        { type: "separator" },
        {
          label: "Settings…",
          accelerator: "CmdOrCtrl+,",
          click: () => win.webContents.send("shortcut:open-settings"),
        },
        ...(isMac ? [] : [{ type: "separator" as const }, { role: "quit" as const }]),
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        ...(isDev ? [{ role: "toggleDevTools" as const }] : []),
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
  ];

  return Menu.buildFromTemplate(template);
}

app.whenReady().then(() => {
  try {
    const db = getDatabase();
    registerIpcHandlers(db, () => mainWindow);

    mainWindow = createWindow();
    Menu.setApplicationMenu(buildMenu(mainWindow));

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow();
        Menu.setApplicationMenu(buildMenu(mainWindow));
      }
    });
  } catch (error) {
    logError("app:startup", error);
    throw error;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  closeDatabase();
});

process.on("uncaughtException", (error) => {
  logError("process:uncaughtException", error);
});
