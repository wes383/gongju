/**
 * String escaping for the four formats people paste between: JSON, JavaScript
 * string literals, HTML text and URL components.
 *
 * `he` already implements the HTML entity table, so the HTML case leans on it;
 * JSON and JavaScript both follow the JSON string grammar, with JavaScript
 * additionally escaping single quotes so the result can be dropped inside `'…'`.
 */

import { decode as decodeEntities, escape as escapeEntities } from "he";
import { codedError } from "./errors";

export type EscapeKind = "json" | "javascript" | "html" | "url";

/** Escape or unescape; throws a coded error when the input cannot be decoded */
export function escapeText(kind: EscapeKind, text: string, unescape: boolean): string {
  if (!text) return "";
  if (!unescape) {
    switch (kind) {
      case "json":
        return JSON.stringify(text).slice(1, -1);
      case "javascript":
        return JSON.stringify(text)
          .slice(1, -1)
          .replace(/'/g, "\\'");
      case "html":
        return escapeEntities(text);
      case "url":
        return encodeURIComponent(text);
    }
  }

  switch (kind) {
    case "json":
    case "javascript":
      return decodeJsonString(kind === "javascript" ? text.replace(/\\'/g, "'") : text);
    case "html":
      return decodeEntities(text);
    case "url":
      try {
        return decodeURIComponent(text);
      } catch {
        throw codedError("escape.invalidUrl");
      }
  }
}

function decodeJsonString(text: string): string {
  try {
    const value: unknown = JSON.parse(`"${text}"`);
    if (typeof value !== "string") throw new Error("not a string");
    return value;
  } catch {
    throw codedError("escape.invalidJson");
  }
}
