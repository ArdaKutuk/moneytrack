/**
 * Money is always stored and calculated as integer minor units (e.g. kuruş
 * for TRY) — never floating point — to avoid rounding drift in financial
 * math. These are the only functions allowed to convert between the
 * major-unit decimal a user types/reads and the minor-unit integer the
 * database and calculations use.
 */

export const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

/** Decimal major-unit amount (e.g. 125.5) -> integer minor units (e.g. 12550). */
export function moneyToMinorUnits(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

/** Integer minor units (e.g. 12550) -> decimal major-unit amount (e.g. 125.5). */
export function minorUnitsToMoney(minorUnits: number): number {
  return minorUnits / 100;
}

/** Formats integer minor units as a localized currency string, e.g.
 * formatCurrency(1250_00, "TRY") -> "₺1.250"
 * formatCurrency(1245050, "TRY") -> "₺12.450,50" */
export function formatCurrency(minorUnits: number, currency = "TRY"): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  const negative = minorUnits < 0;
  const abs = Math.round(Math.abs(minorUnits));
  const whole = Math.floor(abs / 100);
  const cents = abs % 100;
  const wholeStr = whole.toLocaleString("tr-TR");
  const amountStr = cents === 0 ? wholeStr : `${wholeStr},${String(cents).padStart(2, "0")}`;
  return `${negative ? "−" : ""}${symbol}${amountStr}`;
}

/** Signed currency string with an explicit +/- prefix, used for transaction rows. */
export function formatSignedCurrency(minorUnits: number, currency = "TRY"): string {
  const formatted = formatCurrency(Math.abs(minorUnits), currency);
  return minorUnits < 0 ? `−${formatted}` : `+${formatted}`;
}
