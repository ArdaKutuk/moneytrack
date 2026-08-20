/** Small hand-rolled argument guards for the IPC boundary. The renderer is
 * trusted-ish (it's our own UI, not third-party web content) but IPC
 * arguments are still validated here since main-process handlers are the
 * actual trust boundary in front of the database. */

export class ValidationError extends Error {}

export function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function isNonNegativeInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isISODate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === "string" && (options as readonly string[]).includes(value);
}

export function assertField(condition: boolean, message: string): void {
  if (!condition) throw new ValidationError(message);
}
