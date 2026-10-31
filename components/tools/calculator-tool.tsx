"use client";

import * as React from "react";
import { Delete, RotateCcw } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { CopyButton, Segmented } from "@/components/tools/tool-ui";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Angle = "deg" | "rad";
type Mode = "standard" | "scientific";

const COPY = {
  zh: {
    mode: "计算器类型",
    standard: "标准",
    scientific: "科学",
    angle: "角度单位",
    deg: "角度",
    rad: "弧度",
    expr: "表达式",
    placeholder: "例如 (1+2)*3 或 sin(30°)",
    result: "结果",
    empty: "输入表达式后按回车或点等号",
    invalid: "表达式无法计算，请检查括号与运算符",
    invalidAt: (n: number) => `第 ${n} 个字符附近无法解析，请检查括号与运算符`,
    loading: "正在加载计算引擎…",
    history: "历史记录",
    clearHistory: "清空历史",
    second: "第二功能",
    note: "支持四则运算、幂、阶乘、三角与反三角、双曲、对数、常量 pi / e；点 2nd 切换到 asin / eˣ / 10ˣ / n 次根等，ans 表示上一次结果，括号会自动补齐。计算在浏览器内完成，表达式不会上传。",
    standardNote:
      "支持四则运算、百分号与正负号，括号会自动补齐。计算在浏览器内完成，表达式不会上传。",
    keys: {
      clear: "清空",
      back: "退格",
      sign: "正负号",
    },
  },
  en: {
    mode: "Calculator type",
    standard: "Standard",
    scientific: "Scientific",
    angle: "Angle unit",
    deg: "Degrees",
    rad: "Radians",
    expr: "Expression",
    placeholder: "e.g. (1+2)*3 or sin(30°)",
    result: "Result",
    empty: "Type an expression, then press Enter or hit equals",
    invalid: "This expression cannot be evaluated — check the brackets and operators",
    invalidAt: (n: number) =>
      `Cannot parse near character ${n} — check the brackets and operators`,
    loading: "Loading the maths engine…",
    history: "History",
    clearHistory: "Clear history",
    second: "Second function",
    note: "Handles arithmetic, powers, factorials, trigonometry and its inverses, hyperbolic functions, logarithms and the constants pi / e. Tap 2nd for asin / e^x / 10^x / nth root; ans is the previous result and brackets are closed for you. Everything runs in your browser, the expression is never uploaded.",
    standardNote:
      "Arithmetic, percent and a sign toggle; brackets are closed for you. Everything runs in your browser, the expression is never uploaded.",
    keys: {
      clear: "Clear",
      back: "Backspace",
      sign: "Toggle sign",
    },
  },
};

interface Key {
  label: string;
  insert?: string;
  action?: "clear" | "back" | "equals" | "second" | "sign";
  tone?: "accent" | "op" | "fn";
  /** Label + insert used while the 2nd layer is on */
  alt?: { label: string; insert: string };
  /** Only usable once there is a previous result */
  needsAns?: boolean;
}

const KEYS: Key[] = [
  // second layer + handy unary helpers
  { label: "2nd", action: "second", tone: "fn" },
  { label: "x²", insert: "^2", tone: "op", alt: { label: "x³", insert: "^3" } },
  { label: "1/x", insert: "1/(", tone: "op" },
  { label: "|x|", insert: "abs(", tone: "op", alt: { label: "round", insert: "round(" } },
  { label: "%", insert: "%", tone: "op", alt: { label: "mod", insert: " mod " } },
  { label: "ans", insert: "ans", tone: "op", needsAns: true },

  // functions
  { label: "sin", insert: "sin(", tone: "fn", alt: { label: "sin⁻¹", insert: "asin(" } },
  { label: "cos", insert: "cos(", tone: "fn", alt: { label: "cos⁻¹", insert: "acos(" } },
  { label: "tan", insert: "tan(", tone: "fn", alt: { label: "tan⁻¹", insert: "atan(" } },
  { label: "ln", insert: "log(", tone: "fn", alt: { label: "eˣ", insert: "exp(" } },
  { label: "log", insert: "log10(", tone: "fn", alt: { label: "10ˣ", insert: "10^(" } },
  { label: "√", insert: "sqrt(", tone: "fn", alt: { label: "ⁿ√", insert: "nthRoot(" } },

  // keypad
  { label: "7", insert: "7" },
  { label: "8", insert: "8" },
  { label: "9", insert: "9" },
  { label: "÷", insert: "/", tone: "op" },
  { label: "(", insert: "(", tone: "op" },
  { label: ")", insert: ")", tone: "op" },
  { label: "4", insert: "4" },
  { label: "5", insert: "5" },
  { label: "6", insert: "6" },
  { label: "×", insert: "*", tone: "op" },
  { label: "^", insert: "^", tone: "op" },
  { label: "!", insert: "!", tone: "op" },
  { label: "1", insert: "1" },
  { label: "2", insert: "2" },
  { label: "3", insert: "3" },
  { label: "−", insert: "-", tone: "op" },
  { label: "π", insert: "pi", tone: "op" },
  { label: "e", insert: "e", tone: "op" },
  { label: "0", insert: "0" },
  { label: ".", insert: "." },
  { label: "+", insert: "+", tone: "op" },
  { label: "=", action: "equals", tone: "accent" },
  { label: "C", action: "clear", tone: "fn" },
  { label: "⌫", action: "back", tone: "fn" },
];

/** Plain four-function keypad: no functions, no 2nd layer */
const STANDARD_KEYS: Key[] = [
  { label: "C", action: "clear", tone: "fn" },
  { label: "⌫", action: "back", tone: "fn" },
  { label: "%", insert: "%", tone: "op" },
  { label: "÷", insert: "/", tone: "op" },
  { label: "7", insert: "7" },
  { label: "8", insert: "8" },
  { label: "9", insert: "9" },
  { label: "×", insert: "*", tone: "op" },
  { label: "4", insert: "4" },
  { label: "5", insert: "5" },
  { label: "6", insert: "6" },
  { label: "−", insert: "-", tone: "op" },
  { label: "1", insert: "1" },
  { label: "2", insert: "2" },
  { label: "3", insert: "3" },
  { label: "+", insert: "+", tone: "op" },
  { label: "±", action: "sign", tone: "fn" },
  { label: "0", insert: "0" },
  { label: ".", insert: "." },
  { label: "=", action: "equals", tone: "accent" },
];

/**
 * Accept what people actually type: full-width punctuation from a Chinese IME,
 * `× ÷ −` copied from a document, and the degree sign. A degree marker means
 * "this number is in degrees", so in deg mode it is dropped and in rad mode it
 * is expanded to the equivalent radian value.
 */
function normalizeExpression(source: string, angle: Angle) {
  const ascii = source
    .replace(/[\uFF01-\uFF5E]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[\u3000\s]+/g, " ")
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–—]/g, "-");
  return ascii.replace(/°/g, angle === "deg" ? "" : "*(pi/180)");
}

/** Close any brackets the user left open, so `sin(30` still evaluates. */
function autoCloseParens(source: string) {
  let depth = 0;
  for (const char of source) {
    if (char === "(") depth += 1;
    else if (char === ")") depth = Math.max(0, depth - 1);
  }
  return source + ")".repeat(depth);
}

/** mathjs reports the offending offset as `(char 7)`; a few errors have none. */
function errorOffset(message: string) {
  const match = /char (\d+)/.exec(message);
  return match ? Number(match[1]) : null;
}

/** Flip the sign of the trailing number; `2--5` and `2+-5` both parse in mathjs. */
function toggleSign(source: string) {
  const match = /(\d*\.?\d+)$/.exec(source);
  if (!match) {
    if (source === "") return "-";
    // Already waiting for a minus, otherwise start a negative operand
    return source.endsWith("-") ? source : `${source}-`;
  }
  const head = source.slice(0, match.index);
  const digits = match[1];
  const unaryMinus =
    head.endsWith("-") && (head.length === 1 || /[+\-*/^(,]$/.test(head.slice(0, -1)));
  return unaryMinus ? head.slice(0, -1) + digits : `${head}-${digits}`;
}

function formatResult(value: unknown): string {
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "NaN";
    if (!Number.isFinite(value)) return value > 0 ? "∞" : "−∞";
    // 15 significant digits drops binary rounding noise like 0.30000000000000004
    return String(Number(value.toPrecision(15)));
  }
  return String(value);
}

const DEG = Math.PI / 180;

export function CalculatorTool() {
  const t = useCopy(COPY);
  const [mode, setMode] = React.useState<Mode>("scientific");
  const [angle, setAngle] = React.useState<Angle>("deg");
  const [second, setSecond] = React.useState(false);
  const [expr, setExpr] = React.useState("");
  const [result, setResult] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<{ expr: string; result: string }[]>([]);
  const [justEvaluated, setJustEvaluated] = React.useState(false);
  const [lastAns, setLastAns] = React.useState<number | null>(null);
  const [engine, setEngine] = React.useState<
    ((expr: string, scope?: object) => unknown) | null
  >(null);

  // mathjs is large, so it only loads on this page and after the first paint
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const math = await import("mathjs/number");
      if (cancelled) return;
      setEngine(() => (source: string, scope?: object) => math.evaluate(source, scope));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const scope = React.useMemo(
    () => ({
      ...(angle === "deg"
        ? {
            sin: (x: number) => Math.sin(x * DEG),
            cos: (x: number) => Math.cos(x * DEG),
            tan: (x: number) => Math.tan(x * DEG),
            asin: (x: number) => Math.asin(x) / DEG,
            acos: (x: number) => Math.acos(x) / DEG,
            atan: (x: number) => Math.atan(x) / DEG,
          }
        : {}),
      ans: lastAns ?? 0,
    }),
    [angle, lastAns]
  );

  const run = () => {
    if (!engine) return;
    const source = expr.trim();
    if (!source) return;
    try {
      const value = engine(autoCloseParens(normalizeExpression(source, angle)), { ...scope });
      const text = formatResult(value);
      setResult(text);
      setError(null);
      setJustEvaluated(true);
      setLastAns(typeof value === "number" && Number.isFinite(value) ? value : null);
      setHistory((prev) => [{ expr: source, result: text }, ...prev].slice(0, 10));
    } catch (raw) {
      const offset = errorOffset(raw instanceof Error ? raw.message : "");
      setError(offset === null ? t.invalid : t.invalidAt(offset));
      setResult("");
    }
  };

  const press = (key: Key, insert?: string) => {
    if (key.action === "second") {
      setSecond((prev) => !prev);
      return;
    }
    if (key.action === "clear") {
      setExpr("");
      setResult("");
      setError(null);
      setJustEvaluated(false);
      return;
    }
    if (key.action === "back") {
      setExpr((prev) => [...prev].slice(0, -1).join(""));
      setJustEvaluated(false);
      return;
    }
    if (key.action === "equals") {
      run();
      return;
    }
    if (key.action === "sign") {
      setExpr((prev) => toggleSign(prev));
      setJustEvaluated(false);
      setError(null);
      return;
    }
    if (!insert) return;
    setExpr((prev) => (justEvaluated ? insert : prev + insert));
    setJustEvaluated(false);
    setError(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          ariaLabel={t.mode}
          value={mode}
          onChange={(next) => {
            setMode(next);
            setSecond(false);
          }}
          options={[
            { value: "standard", label: t.standard },
            { value: "scientific", label: t.scientific },
          ]}
        />
        {mode === "scientific" && (
          <Segmented
            ariaLabel={t.angle}
            value={angle}
            onChange={setAngle}
            options={[
              { value: "deg", label: t.deg },
              { value: "rad", label: t.rad },
            ]}
          />
        )}
        <span className="ml-auto font-mono text-[11px] text-foreground-faint">
          {engine ? "" : t.loading}
        </span>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] text-foreground-subtle">{t.expr}</span>
          <Input
            value={expr}
            onChange={(e) => {
              setExpr(e.target.value);
              setJustEvaluated(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                run();
              }
              if (e.key === "Escape") {
                setExpr("");
                setResult("");
                setError(null);
              }
            }}
            placeholder={t.placeholder}
            spellCheck={false}
            autoComplete="off"
            aria-label={t.expr}
            size="xs"
            className="font-mono"
          />
        </label>

        <div className="mt-3 flex items-end gap-2 border-t border-border pt-3">
          <div className="min-w-0 flex-1 text-right">
            <p className="text-[11px] text-foreground-subtle">{t.result}</p>
            <p
              className={cn(
                "break-all font-mono text-2xl leading-tight",
                error ? "text-red-fg" : "text-foreground"
              )}
            >
              {error ?? result ?? ""}
              {!error && !result && (
                <span className="text-sm font-normal text-foreground-faint">{t.empty}</span>
              )}
            </p>
          </div>
          <CopyButton value={result} size="icon-xs" disabled={!result} />
        </div>
      </div>

      <div
        className={cn(
          "grid gap-1.5",
          mode === "standard" ? "grid-cols-4 gap-2" : "grid-cols-6"
        )}
      >
        {(mode === "standard" ? STANDARD_KEYS : KEYS).map((key) => {
          const alt = second ? key.alt : undefined;
          const label = alt?.label ?? key.label;
          const isSecondKey = key.action === "second";
          const disabled = key.needsAns === true && lastAns === null;
          return (
            <button
              key={key.label}
              type="button"
              onClick={() => press(key, alt?.insert ?? key.insert)}
              disabled={disabled}
              aria-pressed={isSecondKey ? second : undefined}
              aria-label={
                key.action === "clear"
                  ? t.keys.clear
                  : key.action === "back"
                    ? t.keys.back
                    : key.action === "sign"
                      ? t.keys.sign
                      : isSecondKey
                        ? t.second
                        : label
              }
              className={cn(
                "flex items-center justify-center rounded-lg border border-border font-mono transition-colors active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
                mode === "standard" ? "h-12 text-base" : "h-11 text-sm",
                key.tone === "accent" &&
                  "border-transparent bg-accent text-accent-fg hover:bg-accent-hover",
                key.tone === "op" && "bg-hover-bg text-foreground hover:bg-hover-bg-strong",
                key.tone === "fn" &&
                  "bg-surface text-foreground-muted hover:bg-hover-bg hover:text-foreground",
                !key.tone && "bg-surface text-foreground hover:bg-hover-bg",
                isSecondKey &&
                  second &&
                  "border-accent bg-accent-muted text-accent hover:bg-accent-muted hover:text-accent"
              )}
            >
              {key.action === "back" ? <Delete className="h-4 w-4" /> : label}
            </button>
          );
        })}
      </div>

      {history.length > 0 && (
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex items-center gap-2 border-b border-border px-4 py-2">
            <span className="text-xs font-medium text-foreground-muted">{t.history}</span>
            <button
              type="button"
              onClick={() => setHistory([])}
              className="ml-auto flex items-center gap-1 text-[11px] text-foreground-subtle transition-colors hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              {t.clearHistory}
            </button>
          </header>
          {history.map((record, index) => (
            <button
              key={`${record.expr}-${index}`}
              type="button"
              onClick={() => {
                setExpr(record.expr);
                setResult(record.result);
                setError(null);
                setJustEvaluated(true);
              }}
              className="flex w-full items-center gap-3 border-b border-border px-4 py-2 text-left font-mono text-[11.5px] transition-colors last:border-b-0 hover:bg-hover-bg"
            >
              <span className="min-w-0 flex-1 truncate text-foreground-muted">{record.expr}</span>
              <span className="shrink-0 text-foreground">{record.result}</span>
            </button>
          ))}
        </section>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">
        {mode === "standard" ? t.standardNote : t.note}
      </p>
    </div>
  );
}
