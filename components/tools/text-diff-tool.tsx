"use client";

import * as React from "react";
import { diffLines, DIFF_LINE_LIMIT, type LineDiff } from "@/lib/text";
import { useCopy, useT } from "@/components/locale-provider";
import { Badge } from "@/components/ui/badge";
import { ErrorNote, OptionBar, SampleButton, Toggle } from "@/components/tools/tool-ui";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    left: "原始文本",
    right: "修改后文本",
    sample: "示例",
    onlyDiff: "仅显示差异",
    added: "新增",
    removed: "删除",
    unchanged: "相同",
    identical: "两段文本完全一致",
    empty: "在两侧填入文本后开始对比",
    tooLarge: (n: number) => `文本过长，最多支持 ${n} 行`,
    sampleLeft: `第一行：保持不动
第二行：这一行会被修改
第三行：这一行会被删除
第四行：保持不动`,
    sampleRight: `第一行：保持不动
第二行：这一行已经被修改
第四行：保持不动
第五行：这是新增的一行`,
  },
  en: {
    left: "Original",
    right: "Modified",
    sample: "Sample",
    onlyDiff: "Changes only",
    added: "Added",
    removed: "Removed",
    unchanged: "Same",
    identical: "Both texts are identical",
    empty: "Fill in both sides to start comparing",
    tooLarge: (n: number) => `Text is too long, the limit is ${n} lines`,
    sampleLeft: `Line 1: stays the same
Line 2: this line gets edited
Line 3: this line gets removed
Line 4: stays the same`,
    sampleRight: `Line 1: stays the same
Line 2: this line was edited
Line 4: stays the same
Line 5: this line is new`,
  },
};

function Row({ item }: { item: LineDiff }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 px-3 py-1 font-mono text-[12.5px] leading-relaxed",
        item.kind === "added" && "bg-green-soft",
        item.kind === "removed" && "bg-red-soft"
      )}
    >
      <span className="w-8 shrink-0 select-none text-right text-[11px] text-foreground-faint">
        {item.leftLine ?? ""}
      </span>
      <span className="w-8 shrink-0 select-none text-right text-[11px] text-foreground-faint">
        {item.rightLine ?? ""}
      </span>
      <span
        className={cn(
          "w-3 shrink-0 select-none text-center",
          item.kind === "added" && "text-green-fg",
          item.kind === "removed" && "text-red-fg",
          item.kind === "same" && "text-foreground-faint"
        )}
      >
        {item.kind === "added" ? "+" : item.kind === "removed" ? "−" : ""}
      </span>
      <span
        className={cn(
          "min-w-0 whitespace-pre-wrap break-all",
          item.kind === "same" ? "text-foreground-muted" : "text-foreground"
        )}
      >
        {item.text || " "}
      </span>
    </div>
  );
}

function Editor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <header className="flex h-11 shrink-0 items-center border-b border-border px-3">
        <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
          {label}
        </span>
      </header>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        aria-label={label}
        placeholder="…"
        className="min-h-[200px] w-full resize-y bg-transparent px-3.5 py-3 font-mono text-[13px] leading-relaxed text-foreground placeholder:text-foreground-faint focus:outline-none"
      />
    </div>
  );
}

export function TextDiffTool() {
  const t = useCopy(COPY);
  const shared = useT();
  const [left, setLeft] = React.useState("");
  const [right, setRight] = React.useState("");
  const [onlyDiff, setOnlyDiff] = React.useState(false);

  const result = React.useMemo(() => {
    if (!left && !right) return { rows: [] as LineDiff[], error: null as string | null };
    try {
      return { rows: diffLines(left, right), error: null };
    } catch {
      return { rows: [] as LineDiff[], error: t.tooLarge(DIFF_LINE_LIMIT) };
    }
  }, [left, right, t]);

  const counts = React.useMemo(
    () => ({
      added: result.rows.filter((r) => r.kind === "added").length,
      removed: result.rows.filter((r) => r.kind === "removed").length,
    }),
    [result.rows]
  );

  const visible = onlyDiff ? result.rows.filter((r) => r.kind !== "same") : result.rows;
  const bothEmpty = !left && !right;

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <SampleButton
          onClick={() => {
            setLeft(t.sampleLeft);
            setRight(t.sampleRight);
          }}
        />
        <Toggle checked={onlyDiff} onChange={setOnlyDiff} label={t.onlyDiff} />
        {!bothEmpty && !result.error && (
          <div className="ml-auto flex items-center gap-1.5">
            <Badge variant="success" size="xs">
              {t.added} {counts.added}
            </Badge>
            <Badge variant="danger" size="xs">
              {t.removed} {counts.removed}
            </Badge>
          </div>
        )}
      </OptionBar>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Editor label={t.left} value={left} onChange={setLeft} />
        <Editor label={t.right} value={right} onChange={setRight} />
      </div>

      {result.error && <ErrorNote>{result.error}</ErrorNote>}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-10 items-center gap-2 border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            diff
          </span>
        </header>
        {bothEmpty ? (
          <p className="px-4 py-10 text-center text-sm text-foreground-subtle">{t.empty}</p>
        ) : visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-foreground-subtle">
            {onlyDiff ? t.identical : shared.outputPlaceholder}
          </p>
        ) : (
          <div className="max-h-[520px] overflow-auto py-1">
            {visible.map((item, i) => (
              <Row key={`${item.kind}-${i}`} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
