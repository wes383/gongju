/**
 * Codified errors shared by the pure helpers in `lib/`.
 *
 * A `CodedError` carries an i18n key (`code`) plus positional `params`
 * instead of a human-readable string, so the UI can render a translated
 * message at paint time rather than shipping developer-facing English.
 */
import { dict, type Locale } from "./i18n";

export interface CodedError extends Error {
  code: string;
  params: (string | number)[];
}

export function codedError(code: string, ...params: (string | number)[]): CodedError {
  const err = new Error(code) as CodedError;
  err.code = code;
  err.params = params;
  return err;
}

/** Narrow a `catch` variable to an error carrying an i18n key */
export function isCodedError(value: unknown): value is CodedError {
  return value instanceof Error && typeof (value as Partial<CodedError>).code === "string";
}

/** Wrap a throwing transform into { value, error } so it can run during render */
export function safe<T>(fn: () => T): { value: T | null; error: Error | null } {
  try {
    return { value: fn(), error: null };
  } catch (e) {
    return { value: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/**
 * Resolve a thrown value to a message in the active locale.
 *
 * Coded errors go through the dictionary; anything else falls back to its own
 * message, which is the best we can do for an unexpected failure.
 */
export function errorText(error: unknown, locale: Locale): string {
  if (!error) return "";
  if (isCodedError(error)) {
    const template = dict[locale].errors[error.code];
    if (!template) return error.code;
    return template.replace(/\{(\d)\}/g, (_, i: string) => String(error.params[Number(i)] ?? ""));
  }
  return error instanceof Error ? error.message : String(error);
}
