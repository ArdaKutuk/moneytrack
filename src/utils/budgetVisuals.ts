import type { BudgetState } from "@shared/calculations";

export const BUDGET_STATE_COLOR: Record<BudgetState, string> = {
  normal: "#34d399",
  warning: "#fbbf24",
  critical: "#fb923c",
  exceeded: "#fb7185",
};

export const BUDGET_STATE_LABEL: Record<BudgetState, string> = {
  normal: "On track",
  warning: "Warning",
  critical: "High risk",
  exceeded: "Exceeded",
};

export const BUDGET_STATE_HINT: Record<BudgetState, string> = {
  normal: "Healthy",
  warning: "Watch closely",
  critical: "Slow down",
  exceeded: "Over limit",
};
