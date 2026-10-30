"use client";

import * as React from "react";
import { JSONPath } from "jsonpath-plus";
import { Sparkles } from "lucide-react";
import { highlightJson } from "@/lib/encoding";
import { isPlainObject, JSON_SAMPLE, parseJson } from "@/lib/json";
import { useCopy, useT } from "@/components/locale-provider";
import { CopyButton, ErrorNote, OptionBar, PaneButton } from "@/components/tools/tool-ui";
import { Input } from "@/components/ui/input";

const COPY = {
  zh: {
    pathLabel: "JSONPath 表达式",
    pathPlaceholder: "例如 $.items[*].sku 或 $..price",
    inputLabel: "JSON",
    results: "结果",
    matches: (n: number) => `${n} 条结果`,
    empty: "输入表达式后在这里查看结果",
    noMatch: "没有匹配的结果",
    copyAll: "复制全部",
    sample: "示例",
    presets: "常用示例：",
  },
  en: {
    pathLabel: "JSONPath expression",
    pathPlaceholder: "e.g. $.items[*].sku or $..price",
    inputLabel: "JSON",
    results: "Results",
    matches: (n: number) => `${n} result${n === 1 ? "" : "s"}`,
    empty: "Results appear here once you enter an expression",
    noMatch: "No matches",
    copyAll: "Copy all",
    sample: "Sample",
    presets: "Examples:",
  },
};

const PRESETS = ["$", "$.items[*].sku", "$..price", "$.items[?(@.qty > 1)]", "$.owner.*"];

export function JsonPathTool() {
  const t = useCopy(COPY);
  const shared = useT();
  const [input, setInput] = React.useState("");
  const [path, setPath] = React.useState("$..price");

  const parsed = React.useMemo(() => (input.trim() ? parseJson(input) : null), [input]);

  const result = React.useMemo(() => {
    if (!parsed?.ok || !path.trim()) return { items: [], error: null as string | null };
    try {
      const raw = JSONPath({ path, json: parsed.value as object, resultType: "all" }) as {
        path: string;
        value: unknown;
      }[];
      return { items: raw.map((r) => ({ path: String(r.path), value: r.value })), error: null };
    } catch (e) {
      return { items: [], error: e instanceof Error ? e.message : String(e) };
    }
  }, [parsed, path]);

  const parseError =
    parsed && !parsed.ok
      ? shared.syntaxError(parsed.line ?? null, parsed.column ?? null, parsed.message)
      : null;

  const allJson = React.useMemo(
    () => JSON.stringify(result.items.map((i) => i.value), null, 2),
    [result.items]
  );

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <span className="text-xs font-medium text-foreground-muted">{t.pathLabel}</span>
        <Input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder={t.pathPlaceholder}
          spellCheck={false}
          aria-label={t.pathLabel}
          className="min-w-[240px] flex-1 font-mono text-sm"
          size="sm"
        />
      </OptionBar>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-foreground-subtle">{t.presets}</span>
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPath(p)}
            className="rounded-full border border-border px-2.5 py-1 font-mono text-[11px] text-foreground-muted transition-colors hover:border-border-strong hover:bg-hover-bg hover:text-foreground"
          >
            {p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.inputLabel}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <PaneButton onClick={() => setInput(JSON_SAMPLE)} title={t.sample}>
                <Sparkles className="h-3.5 w-3.5" />
                <span>{t.sample}</span>
              </PaneButton>
              <PaneButton onClick={() => setInput("")}>{shared.clear}</PaneButton>
            </div>
          </header>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder="{}"
            aria-label={t.inputLabel}
            className="min-h-[360px] w-full flex-1 resize-y bg-transparent px-3.5 py-3 font-mono text-[13px] leading-relaxed text-foreground placeholder:text-foreground-faint focus:outline-none"
          />
        </div>

        <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.results}
            </span>
            {result.items.length > 0 && (
              <span className="font-mono text-[11px] text-foreground-faint">
                {t.matches(result.items.length)}
              </span>
            )}
            <div className="ml-auto">
              <CopyButton value={allJson} label={t.copyAll} />
            </div>
          </header>

          <div className="max-h-[60vh] min-h-[360px] overflow-auto">
            {parseError ? (
              <div className="p-3">
                <ErrorNote>{parseError}</ErrorNote>
              </div>
            ) : result.error ? (
              <div className="p-3">
                <ErrorNote>{result.error}</ErrorNote>
              </div>
            ) : !parsed ? (
              <p className="px-4 py-10 text-center text-sm text-foreground-subtle">{t.empty}</p>
            ) : result.items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-foreground-subtle">{t.noMatch}</p>
            ) : (
              <ul className="divide-y divide-border">
                {result.items.map((item, i) => {
                  const isComplex = isPlainObject(item.value) || Array.isArray(item.value);
                  return (
                    <li key={`${item.path}-${i}`} className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-blue-fg">
                          {item.path}
                        </code>
                        <CopyButton
                          value={
                            isComplex
                              ? JSON.stringify(item.value, null, 2)
                              : String(item.value)
                          }
                          size="icon-xs"
                        />
                      </div>
                      {isComplex ? (
                        <pre
                          className="mt-1 max-h-40 overflow-auto font-mono text-[12px] leading-relaxed text-foreground"
                          dangerouslySetInnerHTML={{
                            __html: highlightJson(JSON.stringify(item.value, null, 2)),
                          }}
                        />
                      ) : (
                        <p className="mt-0.5 break-all font-mono text-[12.5px] text-foreground">
                          {item.value === null ? "null" : String(item.value)}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
