"use client";

import * as React from "react";
import { Delete, RotateCcw } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { CopyButton, Segmented } from "@/components/tools/tool-ui";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Angle = "deg" | "rad";

const COPY = {
  zh: {
    angle: "角度单位",
    deg: "角度",
    rad: "弧度",
    expr: "表达式",
    placeholder: "例如 (1+2)*3 或 sin(30)^2",
    result: "结果",
    empty: "输入表达式后按回车或点等号",
    invalid: "表达式无法计算，请检查括号与运算符",
    loading: "正在加载计算引擎…",
    history: "历史记录",
    clearHistory: "清空历史",
    note: "支持四则运算、幂、阶乘、三角函数、对数与常量 pi / e。计算在浏览器内完成，表达式不会上传。",
    keys: {
      clear: "清空",
      back: "退格",
    },
  },
  en: {
    angle: "Angle unit",
    deg: "Degrees",
    rad: "Radians",
    expr: "Expression",
    placeholder: "e.g. (1+2)*3 or sin(30)^2",
    result: "Result",
    empty: "Type an expression, then press Enter or hit equals",
    invalid: "This expression cannot be evaluated — check the brackets and operators",
    loading: "Loading the maths engine…",
    history: "History",
    clearHistory: "Clear history",
    note: "Handles arithmetic, powers, factorials, trigonometry, logarithms and the constants pi / e. Everything is computed in your browser, the expression is never uploaded.",
    keys: {
      clear: "Clear",
      back: "Backspace",
    },
  },
};

interface Key {
  label: string;
  insert?: string;
  action?: "clear" | "back" | "equals";
  tone?: "accent" | "op" | "fn";
  span?: number;
}

const KEYS: Key[] = [
  { label: "sin", insert: "sin(", tone: "fn" },
  { label: "cos", insert: "cos(", tone: "fn" },
  { label: "tan", insert: "tan(", tone: "fn" },
  { label: "ln", insert: "log(", tone: "fn" },
  { label: "log", insert: "log10(", tone: "fn" },
  { label: "√", insert: "sqrt(", tone: "fn" },
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
  const [angle, setAngle] = React.useState<Angle>("deg");
  const [expr, setExpr] = React.useState("");
  const [result, setResult] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<{ expr: string; result: string }[]>([]);
  const [justEvaluated, setJustEvaluated] = React.useState(false);
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
    () =>
      angle === "deg"
        ? {
            sin: (x: number) => Math.sin(x * DEG),
            cos: (x: number) => Math.cos(x * DEG),
            tan: (x: number) => Math.tan(x * DEG),
            asin: (x: number) => Math.asin(x) / DEG,
            acos: (x: number) => Math.acos(x) / DEG,
            atan: (x: number) => Math.atan(x) / DEG,
          }
        : undefined,
    [angle]
  );

  const run = () => {
    if (!engine) return;
    const source = expr.trim();
    if (!source) return;
    try {
      const value = engine(source, scope);
      const text = formatResult(value);
      setResult(text);
      setError(null);
      setJustEvaluated(true);
      setHistory((prev) => [{ expr: source, result: text }, ...prev].slice(0, 10));
    } catch {
      setError(t.invalid);
      setResult("");
    }
  };

  const press = (key: Key) => {
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
    if (!key.insert) return;
    setExpr((prev) => (justEvaluated ? key.insert! : prev + key.insert));
    setJustEvaluated(false);
    setError(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          ariaLabel={t.angle}
          value={angle}
          onChange={setAngle}
          options={[
            { value: "deg", label: t.deg },
            { value: "rad", label: t.rad },
          ]}
        />
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

      <div className="grid grid-cols-6 gap-1.5">
        {KEYS.map((key) => (
          <button
            key={key.label}
            type="button"
            onClick={() => press(key)}
            aria-label={
              key.action === "clear" ? t.keys.clear : key.action === "back" ? t.keys.back : key.label
            }
            className={cn(
              "flex h-11 items-center justify-center rounded-lg border border-border font-mono text-sm transition-colors active:scale-[0.97]",
              key.tone === "accent" && "border-transparent bg-accent text-accent-fg hover:bg-accent-hover",
              key.tone === "op" && "bg-hover-bg text-foreground hover:bg-hover-bg-strong",
              key.tone === "fn" && "bg-surface text-foreground-muted hover:bg-hover-bg hover:text-foreground",
              !key.tone && "bg-surface text-foreground hover:bg-hover-bg"
            )}
          >
            {key.action === "back" ? <Delete className="h-4 w-4" /> : key.label}
          </button>
        ))}
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

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
