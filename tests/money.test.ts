import { describe, expect, it } from "vitest";
import { formatCurrency, formatSignedCurrency, minorUnitsToMoney, moneyToMinorUnits } from "../shared/money";

describe("moneyToMinorUnits", () => {
  it("converts a decimal major-unit amount to integer minor units", () => {
    expect(moneyToMinorUnits(125.5)).toBe(12550);
    expect(moneyToMinorUnits(1)).toBe(100);
    expect(moneyToMinorUnits(0)).toBe(0);
  });

  it("rounds instead of accumulating floating point error", () => {
    expect(moneyToMinorUnits(19.99)).toBe(1999);
    expect(moneyToMinorUnits(0.1 + 0.2)).toBe(30); // 0.1 + 0.2 !== 0.3 in float
  });

  it("treats non-finite input as zero", () => {
    expect(moneyToMinorUnits(NaN)).toBe(0);
  });
});

describe("minorUnitsToMoney", () => {
  it("converts integer minor units back to a decimal amount", () => {
    expect(minorUnitsToMoney(12550)).toBe(125.5);
    expect(minorUnitsToMoney(100)).toBe(1);
  });

  it("round-trips with moneyToMinorUnits", () => {
    expect(minorUnitsToMoney(moneyToMinorUnits(842))).toBe(842);
  });
});

describe("formatCurrency", () => {
  it("formats whole amounts without decimals", () => {
    expect(formatCurrency(125000, "TRY")).toBe("₺1.250");
  });

  it("formats amounts with cents using a comma decimal separator", () => {
    expect(formatCurrency(1245050, "TRY")).toBe("₺12.450,50");
  });

  it("prefixes negative amounts with a minus sign", () => {
    expect(formatCurrency(-125000, "TRY")).toBe("−₺1.250");
  });

  it("falls back to the raw currency code for unknown currencies", () => {
    expect(formatCurrency(100000, "XYZ")).toBe("XYZ1.000");
  });
});

describe("formatSignedCurrency", () => {
  it("prefixes income with a plus sign", () => {
    expect(formatSignedCurrency(500000, "TRY")).toBe("+₺5.000");
  });

  it("prefixes expenses with a minus sign", () => {
    expect(formatSignedCurrency(-500000, "TRY")).toBe("−₺5.000");
  });
});
