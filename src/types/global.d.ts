import type { MoneytrackApi } from "../../electron/preload";

declare global {
  interface Window {
    api: MoneytrackApi;
  }
}

export {};
