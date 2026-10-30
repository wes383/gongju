"use client";

import * as React from "react";
import { HASH_ALGORITHMS, hashText, type HashAlgorithm } from "@/lib/hash";
import { useCopy, useT } from "@/components/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton, OptionBar, SampleButton, Toggle } from "@/components/tools/tool-ui";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    input: "文本",
    placeholder: "输入要计算摘要的文本…",
    sample: "示例",
    sampleText: "GongJu 在线工具箱",
    algorithms: "算法",
    uppercase: "大写输出",
    empty: "输入文本后自动计算",
    legacy: "已不安全",
    selectAll: "全选",
    legacyHint: "MD5 与 SHA-1 存在已知碰撞攻击，只适合校验完整性，不要用于密码或签名。",
    bytes: "字符",
  },
  en: {
    input: "Text",
    placeholder: "Text to hash…",
    sample: "Sample",
    sampleText: "GongJu online toolbox",
    algorithms: "Algorithms",
    uppercase: "Uppercase",
    empty: "Digests appear once you type something",
    legacy: "Broken",
    selectAll: "Select all",
    legacyHint: "MD5 and SHA-1 have known collision attacks. Fine for checksums, never for passwords or signatures.",
    bytes: "chars",
  },
};

const ALL = HASH_ALGORITHMS.map((a) => a.value);
const DEFAULT: HashAlgorithm[] = ["md5", "sha1", "sha256", "sha512"];

export function HashTool() {
  const t = useCopy(COPY);
  const shared = useT();
  const [input, setInput] = React.useState("");
  const [selected, setSelected] = React.useState<HashAlgorithm[]>(DEFAULT);
  const [uppercase, setUppercase] = React.useState(false);
  const [digests, setDigests] = React.useState<Partial<Record<HashAlgorithm, string>>>({});

  React.useEffect(() => {
    if (!input) {
      const id = window.setTimeout(() => setDigests({}), 0);
      return () => window.clearTimeout(id);
    }
    let cancelled = false;
    const id = window.setTimeout(async () => {
      const entries = await Promise.all(
        selected.map(async (algorithm) => [algorithm, await hashText(algorithm, input)] as const)
      );
      if (!cancelled) setDigests(Object.fromEntries(entries));
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [input, selected]);

  const toggleAlgorithm = (algorithm: HashAlgorithm) =>
    setSelected((prev) =>
      prev.includes(algorithm) ? prev.filter((a) => a !== algorithm) : [...prev, algorithm]
    );

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <span className="text-xs font-medium text-foreground-muted">{t.algorithms}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {HASH_ALGORITHMS.map((algorithm) => {
            const active = selected.includes(algorithm.value);
            return (
              <button
                key={algorithm.value}
                type="button"
                onClick={() => toggleAlgorithm(algorithm.value)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1 font-mono text-[11px] transition-colors",
                  active
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border text-foreground-muted hover:border-border-strong hover:text-foreground"
                )}
              >
                {algorithm.label}
              </button>
            );
          })}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => setSelected(ALL)}
          className="ml-auto"
        >
          {t.selectAll}
        </Button>
        <Toggle checked={uppercase} onChange={setUppercase} label={t.uppercase} />
      </OptionBar>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-11 items-center gap-2 border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.input}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <SampleButton onClick={() => setInput(t.sampleText)} />
            <Button type="button" variant="ghost" size="xs" onClick={() => setInput("")}>
              {shared.clear}
            </Button>
          </div>
        </header>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          placeholder={t.placeholder}
          aria-label={t.input}
          className="min-h-[120px] w-full resize-y bg-transparent px-3.5 py-3 font-mono text-[13px] leading-relaxed text-foreground placeholder:text-foreground-faint focus:outline-none"
        />
      </div>

      {selected.length === 0 || !input ? (
        <p className="py-10 text-center text-sm text-foreground-subtle">{t.empty}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {HASH_ALGORITHMS.filter((a) => selected.includes(a.value)).map((algorithm) => {
            const value = digests[algorithm.value] ?? "";
            return (
              <div
                key={algorithm.value}
                className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
              >
                <div className="flex w-32 shrink-0 items-center gap-1.5">
                  <span className="whitespace-nowrap font-mono text-[11px] text-foreground-muted">
                    {algorithm.label}
                  </span>
                  {algorithm.legacy && (
                    <Badge variant="warning" size="xs" className="whitespace-nowrap">
                      {t.legacy}
                    </Badge>
                  )}
                </div>
                <code className="min-w-0 flex-1 break-all font-mono text-[12px] text-foreground">
                  {uppercase ? value.toUpperCase() : value}
                </code>
                <CopyButton value={uppercase ? value.toUpperCase() : value} size="icon-xs" />
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.legacyHint}</p>
    </div>
  );
}
