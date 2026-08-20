import { describe, expect, it } from "vitest";
import {
  applyDebtPayment,
  budgetPercentage,
  budgetState,
  categoryTotals,
  computeBillStatus,
  filterByDateRange,
  nextRecurringDate,
  percentChange,
  savingsRate,
  sumByType,
  totalBalance,
} from "../shared/calculations";

describe("totalBalance", () => {
  it("is total income minus total expenses", () => {
    expect(totalBalance(500000, 320000)).toBe(180000);
  });

  it("can go negative when expenses exceed income", () => {
    expect(totalBalance(100000, 250000)).toBe(-150000);
  });
});

describe("monthly income / expenses (filterByDateRange + sumByType)", () => {
  const transactions = [
    { type: "income" as const, amount: 300000, date: "2026-08-01" },
    { type: "income" as const, amount: 50000, date: "2026-08-15" },
    { type: "expense" as const, amount: 20000, date: "2026-08-05" },
    { type: "expense" as const, amount: 15000, date: "2026-07-20" }, // previous month
    { type: "income" as const, amount: 400000, date: "2026-07-01" }, // previous month
  ];

  it("computes monthly income for August only", () => {
    const august = filterByDateRange(transactions, "2026-08-01", "2026-08-31");
    expect(sumByType(august, "income")).toBe(350000);
  });

  it("computes monthly expenses for August only", () => {
    const august = filterByDateRange(transactions, "2026-08-01", "2026-08-31");
    expect(sumByType(august, "expense")).toBe(20000);
  });
});

describe("date filtering", () => {
  const items = [{ date: "2026-08-01" }, { date: "2026-08-15" }, { date: "2026-08-31" }, { date: "2026-09-01" }];

  it("includes items on the boundary dates", () => {
    const result = filterByDateRange(items, "2026-08-01", "2026-08-31");
    expect(result).toHaveLength(3);
  });

  it("excludes items outside the range", () => {
    const result = filterByDateRange(items, "2026-08-01", "2026-08-31");
    expect(result.some((i) => i.date === "2026-09-01")).toBe(false);
  });
});

describe("category totals", () => {
  it("sums amounts grouped by category_id", () => {
    const totals = categoryTotals([
      { category_id: 1, amount: 1000 },
      { category_id: 2, amount: 500 },
      { category_id: 1, amount: 250 },
    ]);
    expect(totals).toEqual({ 1: 1250, 2: 500 });
  });
});

describe("budgetPercentage", () => {
  it("computes spent / budget * 100, rounded", () => {
    expect(budgetPercentage(5420, 7000)).toBe(77);
  });

  it("treats a zero budget with spend as fully exceeded", () => {
    expect(budgetPercentage(100, 0)).toBe(100);
  });

  it("treats a zero budget with no spend as 0%", () => {
    expect(budgetPercentage(0, 0)).toBe(0);
  });
});

describe("budgetState", () => {
  it("is normal under 75%", () => {
    expect(budgetState(50)).toBe("normal");
    expect(budgetState(74)).toBe("normal");
  });
  it("is warning between 75% and 90%", () => {
    expect(budgetState(75)).toBe("warning");
    expect(budgetState(89)).toBe("warning");
  });
  it("is critical between 90% and 100%", () => {
    expect(budgetState(90)).toBe("critical");
    expect(budgetState(99)).toBe("critical");
  });
  it("is exceeded at 100% or above", () => {
    expect(budgetState(100)).toBe("exceeded");
    expect(budgetState(150)).toBe("exceeded");
  });
});

describe("savingsRate", () => {
  it("computes the percentage of income retained", () => {
    expect(savingsRate(1000000, 660000)).toBe(34);
  });

  it("is zero when there is no income", () => {
    expect(savingsRate(0, 500)).toBe(0);
  });

  it("goes negative when expenses exceed income", () => {
    expect(savingsRate(100000, 150000)).toBe(-50);
  });
});

describe("debt payment calculation", () => {
  it("subtracts the payment from the remaining balance", () => {
    expect(applyDebtPayment(1000000, 250000)).toBe(750000);
  });

  it("never allows the remaining balance to go below zero", () => {
    expect(applyDebtPayment(50000, 250000)).toBe(0);
  });

  it("reaches exactly zero when fully paid off", () => {
    expect(applyDebtPayment(250000, 250000)).toBe(0);
  });
});

describe("recurring bill next-date calculation", () => {
  it("advances a weekly bill by one week", () => {
    expect(nextRecurringDate("2026-08-01", "weekly")).toBe("2026-08-08");
  });
  it("advances a monthly bill by one month", () => {
    expect(nextRecurringDate("2026-08-01", "monthly")).toBe("2026-09-01");
  });
  it("advances a yearly bill by one year", () => {
    expect(nextRecurringDate("2026-08-01", "yearly")).toBe("2027-08-01");
  });
  it("clamps to the last valid day when the next month is shorter", () => {
    // Jan 31 + 1 month has no Feb 31, so it clamps to Feb 28 (2026 is not a leap year)
    // rather than overflowing into March — the correct behavior for a monthly due date.
    expect(nextRecurringDate("2026-01-31", "monthly")).toBe("2026-02-28");
  });
});

describe("computeBillStatus", () => {
  it("stays paid regardless of due date once marked paid", () => {
    expect(computeBillStatus("2026-01-01", "paid", "2026-08-20")).toBe("paid");
  });
  it("is overdue once the due date has passed and it's unpaid", () => {
    expect(computeBillStatus("2026-08-01", "upcoming", "2026-08-20")).toBe("overdue");
  });
  it("stays upcoming before the due date", () => {
    expect(computeBillStatus("2026-09-01", "upcoming", "2026-08-20")).toBe("upcoming");
  });
});

describe("percentChange", () => {
  it("computes a positive percent increase", () => {
    expect(percentChange(100, 118)).toBe(18);
  });
  it("computes a negative percent decrease", () => {
    expect(percentChange(100, 88)).toBe(-12);
  });
  it("returns null when there is no prior value to compare against", () => {
    expect(percentChange(0, 100)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
  });
});
