"use client";

import * as React from "react";
import { useCopy } from "@/components/locale-provider";
import { CopyButton, ErrorNote, SampleButton } from "@/components/tools/tool-ui";
import { Input } from "@/components/ui/input";
import { runRegex } from "@/lib/text";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    pattern: "正则表达式",
    patternPlaceholder: "例如 (\\w+)@(\\w+)\\.com",
    input: "测试文本",
    inputPlaceholder: "粘贴要匹配的文本…",
    preview: "匹配预览",
    matches: "匹配详情",
    matchCount: (n: number) => `${n} 个匹配`,
    noMatch: "没有匹配",
    index: "位置",
    group: "分组",
    replace: "替换为",
    replacePlaceholder: "支持 $1、$& 等替换语法",
    result: "替换结果",
    sample: "示例",
    samplePattern: "(\\w+)@(\\w+)\\.com",
    sampleText: "联系 alice@example.com 或 bob@test.com 获取更多信息。",
    sampleReplace: "[$1 at $2]",
    empty: "输入正则和文本后开始匹配",
  },
  en: {
    pattern: "Pattern",
    patternPlaceholder: "e.g. (\\w+)@(\\w+)\\.com",
    input: "Test string",
    inputPlaceholder: "Paste the text to match against…",
    preview: "Matches",
    matches: "Match details",
    matchCount: (n: number) => `${n} match${n === 1 ? "" : "es"}`,
    noMatch: "No matches",
    index: "Index",
    group: "Groups",
    replace: "Replace with",
    replacePlaceholder: "Supports $1, $& and friends",
    result: "Replaced",
    sample: "Sample",
    samplePattern: "(\\w+)@(\\w+)\\.com",
    sampleText: "Contact alice@example.com or bob@test.com for details.",
    sampleReplace: "[$1 at $2]",
    empty: "Enter a pattern and some text to start",
  },
};

const FLAGS = ["g", "i", "m", "s", "u"];

export function RegexTesterTool() {
  const t = useCopy(COPY);
  const [pattern, setPattern] = React.useState("");
  const [flags, setFlags] = React.useState("g");
  const [input, setInput] = React.useState("");
  const [replacement, setReplacement] = React.useState("");

  const toggleFlag = (flag: string) =>
    setFlags((prev) =>
      prev.includes(flag) ? prev.replace(flag, "") : [...prev, flag].sort().join("")
    );

  const result = React.useMemo(() => {
    if (!pattern) {
      return { ok: true as const, matches: [], highlighted: "", replaced: "", error: null };
    }
    try {
      const r = runRegex(pattern, flags, input, replacement);
      return { ok: true as const, ...r, error: null };
    } catch (e) {
      return {
        ok: false as const,
        matches: [],
        highlighted: "",
        replaced: "",
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }, [pattern, flags, input, replacement]);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="font-mono text-sm text-foreground-faint">/</span>
          <Input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder={t.patternPlaceholder}
            aria-label={t.pattern}
            spellCheck={false}
            className="min-w-0 flex-1 border-0 bg-transparent font-mono text-sm shadow-none focus-visible:ring-0"
          />
          <span className="font-mono text-sm text-foreground-faint">/{flags}</span>
          <SampleButton
            onClick={() => {
              setPattern(t.samplePattern);
              setInput(t.sampleText);
              setReplacement(t.sampleReplace);
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-3 py-2">
          <span className="text-[11px] text-foreground-subtle">flags</span>
          {FLAGS.map((flag) => (
            <button
              key={flag}
              type="button"
              onClick={() => toggleFlag(flag)}
              aria-pressed={flags.includes(flag)}
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded font-mono text-[11px] transition-colors",
                flags.includes(flag)
                  ? "bg-accent text-accent-fg"
                  : "bg-hover-bg text-foreground-muted hover:text-foreground"
              )}
            >
              {flag}
            </button>
          ))}
          {pattern && result.ok && (
            <span className="ml-auto font-mono text-[11px] text-foreground-faint">
              {t.matchCount(result.matches.length)}
            </span>
          )}
        </div>
      </div>

      {result.error && <ErrorNote>{result.error}</ErrorNote>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-10 shrink-0 items-center border-b border-border px-3">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.input}
            </span>
          </header>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder={t.inputPlaceholder}
            aria-label={t.input}
            className="min-h-[200px] w-full resize-y bg-transparent px-3.5 py-3 font-mono text-[13px] leading-relaxed text-foreground placeholder:text-foreground-faint focus:outline-none"
          />
        </div>

        <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-10 shrink-0 items-center border-b border-border px-3">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.preview}
            </span>
          </header>
          <div className="min-h-[200px] overflow-auto px-3.5 py-3 font-mono text-[13px] leading-relaxed text-foreground">
            {!pattern ? (
              <span className="text-foreground-faint">{t.empty}</span>
            ) : input && result.matches.length === 0 ? (
              <span className="text-foreground-faint">{t.noMatch}</span>
            ) : (
              <div
                className="whitespace-pre-wrap break-all"
                dangerouslySetInnerHTML={{ __html: result.highlighted }}
              />
            )}
          </div>
        </div>
      </div>

      {result.matches.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-10 items-center border-b border-border px-3">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.matches}
            </span>
          </header>
          <ul className="max-h-[260px] divide-y divide-border overflow-auto">
            {result.matches.slice(0, 50).map((m, i) => (
              <li key={`${m.index}-${i}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2">
                <span className="font-mono text-[11px] text-foreground-faint">
                  #{i + 1} @ {m.index}
                </span>
                <code className="rounded bg-yellow-soft px-1.5 py-0.5 font-mono text-[12px] text-yellow-fg">
                  {m.value || "(empty)"}
                </code>
                {m.groups.filter(Boolean).length > 0 && (
                  <span className="flex flex-wrap items-baseline gap-1">
                    <span className="text-[11px] text-foreground-subtle">{t.group}:</span>
                    {m.groups.map((g, gi) =>
                      g === undefined ? null : (
                        <code
                          key={gi}
                          className="rounded bg-hover-bg px-1.5 py-0.5 font-mono text-[11px] text-foreground-muted"
                        >
                          ${gi + 1} {g}
                        </code>
                      )
                    )}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-10 shrink-0 items-center border-b border-border px-3">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.replace}
            </span>
          </header>
          <Input
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            placeholder={t.replacePlaceholder}
            aria-label={t.replace}
            spellCheck={false}
            className="m-3 font-mono text-sm"
          />
        </div>

        <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.result}
            </span>
            <div className="ml-auto">
              <CopyButton value={result.replaced} size="icon-xs" />
            </div>
          </header>
          <pre className="min-h-[88px] whitespace-pre-wrap break-all px-3.5 py-3 font-mono text-[13px] leading-relaxed text-foreground">
            {result.replaced || <span className="text-foreground-faint">—</span>}
          </pre>
        </div>
      </div>
    </div>
  );
}
