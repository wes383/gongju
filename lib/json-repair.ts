/**
 * Tolerant JSON parser that repairs the mistakes people actually paste:
 * comments, trailing commas, single quotes, unquoted keys, BOM, full-width
 * punctuation, Python literals and missing commas.
 *
 * A strict `JSON.parse` runs first, so valid input never pays for the loose
 * reader. Every repair is reported so the UI can show what was changed instead
 * of silently rewriting the data.
 */

export type RepairCode =
  | "bom"
  | "comment"
  | "single-quote"
  | "full-width"
  | "unquoted-key"
  | "unquoted-value"
  | "trailing-comma"
  | "missing-comma"
  | "python-literal"
  | "number-format"
  | "unclosed";

export interface RepairError {
  message: string;
  line: number;
  column: number;
}

export interface RepairResult {
  value: unknown;
  repairs: RepairCode[];
  error: RepairError | null;
}

class LooseError extends Error {
  constructor(
    message: string,
    readonly position: number
  ) {
    super(message);
  }
}

const DOUBLE_QUOTES = new Set(['"', "“", "”"]);
const SINGLE_QUOTES = new Set(["'", "‘", "’"]);

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= "0" && ch <= "9";
}

function isKeyStart(ch: string | undefined): boolean {
  if (!ch) return false;
  return /[A-Za-z_$\u00c0-\uffff]/.test(ch);
}

function isValueStart(ch: string | undefined): boolean {
  if (!ch) return false;
  return (
    ch === "{" ||
    ch === "｛" ||
    ch === "[" ||
    ch === "［" ||
    ch === "." ||
    ch === "-" ||
    ch === "+" ||
    isDigit(ch) ||
    DOUBLE_QUOTES.has(ch) ||
    SINGLE_QUOTES.has(ch) ||
    isKeyStart(ch)
  );
}

class LooseReader {
  private i = 0;
  private readonly repairs = new Set<RepairCode>();

  constructor(private readonly src: string) {}

  get changes(): RepairCode[] {
    return [...this.repairs];
  }

  parse(): unknown {
    this.skipTrivia();
    if (this.i >= this.src.length) throw new LooseError("Unexpected end of input", this.i);
    const value = this.parseValue();
    this.skipTrivia();
    if (this.i < this.src.length) {
      throw new LooseError(`Unexpected character “${this.src[this.i]}” after the top-level value`, this.i);
    }
    return value;
  }

  private skipTrivia(): void {
    for (;;) {
      const ch = this.src[this.i];
      if (ch === undefined) return;
      if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\u00a0" || ch === "\ufeff") {
        this.i += 1;
        continue;
      }
      if (ch === "/" && this.src[this.i + 1] === "/") {
        this.repairs.add("comment");
        this.i += 2;
        while (this.i < this.src.length && this.src[this.i] !== "\n") this.i += 1;
        continue;
      }
      if (ch === "/" && this.src[this.i + 1] === "*") {
        this.repairs.add("comment");
        this.i += 2;
        const end = this.src.indexOf("*/", this.i);
        this.i = end === -1 ? this.src.length : end + 2;
        continue;
      }
      return;
    }
  }

  private parseValue(): unknown {
    this.skipTrivia();
    const ch = this.src[this.i];
    if (ch === undefined) throw new LooseError("Unexpected end of input, a value was expected", this.i);
    if (ch === "{" || ch === "｛") return this.parseObject();
    if (ch === "[" || ch === "［") return this.parseArray();
    if (DOUBLE_QUOTES.has(ch) || SINGLE_QUOTES.has(ch)) return this.parseString();
    if (isDigit(ch) || ch === "-" || ch === "+" || ch === ".") return this.parseNumber();
    return this.parseLiteral();
  }

  private parseObject(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    this.consume();
    this.skipTrivia();
    if (this.peek() === "}" || this.peek() === "｝") {
      this.consume();
      return out;
    }

    for (;;) {
      this.skipTrivia();
      const start = this.i;
      const ch = this.peek();
      if (ch === "}" || ch === "｝") {
        this.consume();
        return out;
      }
      if (ch === undefined) {
        this.repairs.add("unclosed");
        return out;
      }

      let key: string;
      if (DOUBLE_QUOTES.has(ch) || SINGLE_QUOTES.has(ch)) {
        key = this.parseString();
      } else if (isKeyStart(ch) || isDigit(ch)) {
        key = this.parseBareKey();
        this.repairs.add("unquoted-key");
      } else {
        throw new LooseError(`Expected a property name but found “${ch}”`, start);
      }

      this.skipTrivia();
      if (this.peek() === ":") {
        this.consume();
      } else if (this.peek() === "：") {
        this.consume();
        this.repairs.add("full-width");
      } else {
        throw new LooseError("Expected “:” after a property name", this.i);
      }

      out[key] = this.parseValue();
      this.skipTrivia();

      const next = this.peek();
      if (next === ",") {
        this.consume();
        this.skipTrivia();
        if (this.peek() === "}" || this.peek() === "｝") {
          this.repairs.add("trailing-comma");
          this.consume();
          return out;
        }
        continue;
      }
      if (next === "，") {
        this.consume();
        this.repairs.add("full-width");
        this.skipTrivia();
        if (this.peek() === "}" || this.peek() === "｝") {
          this.repairs.add("trailing-comma");
          this.consume();
          return out;
        }
        continue;
      }
      if (next === "}" || next === "｝") {
        this.consume();
        return out;
      }
      if (next === undefined) {
        this.repairs.add("unclosed");
        return out;
      }
      if (isValueStart(next) || isKeyStart(next)) {
        this.repairs.add("missing-comma");
        continue;
      }
      throw new LooseError(`Expected “,” or “}” but found “${next}”`, this.i);
    }
  }

  private parseArray(): unknown[] {
    const out: unknown[] = [];
    this.consume();
    this.skipTrivia();
    if (this.peek() === "]" || this.peek() === "］") {
      this.consume();
      return out;
    }

    for (;;) {
      this.skipTrivia();
      if (this.peek() === "]" || this.peek() === "］") {
        this.consume();
        return out;
      }
      if (this.peek() === undefined) {
        this.repairs.add("unclosed");
        return out;
      }

      out.push(this.parseValue());
      this.skipTrivia();

      const next = this.peek();
      if (next === ",") {
        this.consume();
        this.skipTrivia();
        if (this.peek() === "]" || this.peek() === "］") {
          this.repairs.add("trailing-comma");
          this.consume();
          return out;
        }
        continue;
      }
      if (next === "，") {
        this.consume();
        this.repairs.add("full-width");
        this.skipTrivia();
        if (this.peek() === "]" || this.peek() === "］") {
          this.repairs.add("trailing-comma");
          this.consume();
          return out;
        }
        continue;
      }
      if (next === "]" || next === "］") {
        this.consume();
        return out;
      }
      if (next === undefined) {
        this.repairs.add("unclosed");
        return out;
      }
      if (isValueStart(next)) {
        this.repairs.add("missing-comma");
        continue;
      }
      throw new LooseError(`Expected “,” or “]” but found “${next}”`, this.i);
    }
  }

  private parseString(): string {
    const open = this.peek() ?? "";
    const single = SINGLE_QUOTES.has(open);
    if (open === "“" || open === "”" || open === "‘" || open === "’") {
      this.repairs.add("full-width");
    } else if (single) {
      this.repairs.add("single-quote");
    }
    this.consume();

    let out = "";
    while (this.i < this.src.length) {
      const ch = this.src[this.i];
      const closes = single ? ch === "'" || ch === "’" : ch === '"' || ch === "”";
      if (closes) {
        this.consume();
        return out;
      }
      if (ch === "\\") {
        this.consume();
        const esc = this.src[this.i];
        this.consume();
        switch (esc) {
          case "n":
            out += "\n";
            break;
          case "r":
            out += "\r";
            break;
          case "t":
            out += "\t";
            break;
          case "b":
            out += "\b";
            break;
          case "f":
            out += "\f";
            break;
          case "u": {
            const hex = this.src.slice(this.i, this.i + 4);
            if (/^[0-9a-fA-F]{4}$/.test(hex)) {
              out += String.fromCharCode(parseInt(hex, 16));
              this.i += 4;
            } else {
              out += "u";
            }
            break;
          }
          case undefined:
            break;
          default:
            // \" \' \\ \/ and any unknown escape collapse to the bare character
            out += esc;
        }
        continue;
      }
      out += ch;
      this.consume();
    }
    this.repairs.add("unclosed");
    return out;
  }

  private parseBareKey(): string {
    const start = this.i;
    while (this.i < this.src.length && /[A-Za-z0-9_$.\-\u00c0-\uffff]/.test(this.src[this.i])) {
      this.i += 1;
    }
    return this.src.slice(start, this.i);
  }

  private parseNumber(): number {
    const start = this.i;
    let sign = 1;
    if (this.peek() === "+") {
      this.consume();
      this.repairs.add("number-format");
    } else if (this.peek() === "-") {
      this.consume();
      sign = -1;
    }

    let intPart = "";
    while (isDigit(this.peek())) {
      intPart += this.peek();
      this.consume();
    }
    if (intPart.length > 1 && intPart.startsWith("0")) this.repairs.add("number-format");

    let fracPart = "";
    if (this.peek() === ".") {
      this.consume();
      while (isDigit(this.peek())) {
        fracPart += this.peek();
        this.consume();
      }
      if (fracPart === "") this.repairs.add("number-format");
    }

    let expPart = "";
    if (this.peek() === "e" || this.peek() === "E") {
      let exponent = this.peek() ?? "e";
      this.consume();
      if (this.peek() === "+" || this.peek() === "-") {
        exponent += this.peek() ?? "";
        this.consume();
      }
      let digits = "";
      while (isDigit(this.peek())) {
        digits += this.peek();
        this.consume();
      }
      if (digits === "") {
        // Not an exponent after all — let the caller report the stray letter
        this.i -= exponent.length;
      } else {
        expPart = exponent + digits;
      }
    }

    if (intPart === "" && fracPart === "") {
      throw new LooseError("Expected a number", start);
    }

    const raw = `${intPart || "0"}.${fracPart || "0"}${expPart ? `e${expPart.replace(/^e/i, "")}` : ""}`;
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new LooseError("Number is out of range", start);
    return sign * value;
  }

  private parseLiteral(): unknown {
    const rest = this.src.slice(this.i);
    const literals: { word: string; value: unknown; repair?: RepairCode }[] = [
      { word: "true", value: true },
      { word: "false", value: false },
      { word: "null", value: null },
      { word: "True", value: true, repair: "python-literal" },
      { word: "False", value: false, repair: "python-literal" },
      { word: "None", value: null, repair: "python-literal" },
      { word: "nil", value: null, repair: "python-literal" },
    ];
    for (const literal of literals) {
      if (rest.startsWith(literal.word)) {
        this.i += literal.word.length;
        if (literal.repair) this.repairs.add(literal.repair);
        return literal.value;
      }
    }
    // Bare word in value position, e.g. {name: alice} — keep it as a string
    if (isKeyStart(this.peek())) {
      const word = this.parseBareKey();
      this.repairs.add("unquoted-value");
      return word;
    }
    throw new LooseError(`Unexpected token “${rest.slice(0, 12)}”`, this.i);
  }

  private peek(): string | undefined {
    return this.src[this.i];
  }

  private consume(): void {
    this.i += 1;
  }
}

function locate(text: string, position: number): { line: number; column: number } {
  const before = text.slice(0, Math.max(0, Math.min(position, text.length)));
  const lines = before.split("\n");
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

/** Repair and parse. `error` is set only when no value could be recovered. */
export function repairJson(input: string): RepairResult {
  const withoutBom = input.replace(/^\uFEFF/, "");
  const hadBom = withoutBom.length !== input.length;

  if (!withoutBom.trim()) {
    return { value: null, repairs: [], error: { message: "json.empty", line: 1, column: 1 } };
  }

  const strict = tryStrict(withoutBom);
  if (strict.ok) {
    return { value: strict.value, repairs: hadBom ? ["bom"] : [], error: null };
  }

  const reader = new LooseReader(withoutBom);
  try {
    const value = reader.parse();
    const repairs = reader.changes;
    if (hadBom) repairs.unshift("bom");
    return { value, repairs, error: null };
  } catch (error) {
    const position = error instanceof LooseError ? error.position : 0;
    const { line, column } = locate(withoutBom, position);
    return {
      value: null,
      repairs: [],
      error: {
        message: error instanceof Error ? error.message : String(error),
        line,
        column,
      },
    };
  }
}

function tryStrict(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

/** Pretty-print a repaired value; undefined when it cannot be serialised */
export function formatRepaired(value: unknown, indent = 2): string {
  try {
    return JSON.stringify(value, null, indent) ?? "null";
  } catch {
    return "";
  }
}
