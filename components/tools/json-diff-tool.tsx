"use client";

import * as React from "react";

import {
  diffJson,
  JSON_SAMPLE,
  parseJson,
  type DiffEntry,
} from "@/lib/json";
import {
  useCopy,
  useT,
} from "@/components/locale-provider";
import {
  Badge,
} from "@/components/ui/badge";

import {
  ErrorNote,
  OptionBar,
  SampleButton,
} from "@/components/tools/tool-ui";
import {
  cn,
} from "@/lib/utils";

const COPY = {
  zh: {
    left: "原始 JSON",
    right: "修改后 JSON",
    sample: "示例",
    added: "新增",
    removed: "删除",
    changed: "修改",
    noDiff: "两份 JSON 完全一致",
    empty: "在两侧填入 JSON 后开始对比",
    path: "路径",
  },
  en: {
    left: "Original",
    right: "Modified",
    sample: "Sample",
    added: "Added",
    removed: "Removed",
    changed: "Changed",
    noDiff: "Both documents are identical",
    empty: "Fill in both sides to start comparing",
    path: "Path",
  },
};

const SAMPLE_RIGHT = `{
  "id": 1024,
  "name": "GongJu Pro",
  "active": false,
  "tags": ["tools", "json", "diff"],
  "owner": { "login": "dev", "email": "dev@example.com" },
  "items": [
    { "sku": "A-1", "qty": 3, "price": 9.9 },
    { "sku": "B-2", "qty": 1, "price": 19.5 }
  ],
  "createdAt": "2026-01-01"
}`;

function preview(value: unknown): string {
  if (value === undefined) return "—";
  const text = typeof value === "string" ? JSON.stringify(value) : JSON.stringify(value);
  if (text === undefined) return String(value);
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

function DiffRow({ entry }: { entry: DiffEntry }) {
  const t = useCopy(COPY);
  const variant = entry.kind === "added" ? "success" : entry.kind === "removed" ? "danger" : "warning";
  const label = entry.kind === "added" ? t.added : entry.kind === "removed" ? t.removed : t.changed;

  return (
    <li className="flex flex-col gap-1 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <Badge variant={variant} size="xs">
          {label}
        </Badge>
        <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-blue-fg">
          {entry.path}
        </code>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 pl-1 font-mono text-[11.5px]">
        {entry.kind !== "added" && (
          <span className="break-all rounded bg-red-soft px-1.5 py-0.5 text-red-fg line-through decoration-red-border">
            {preview(entry.left)}
          </span>
        )}
        {entry.kind === "changed" && <span className="text-foreground-faint">→</span>}
        {entry.kind !== "removed" && (
          <span
            className={cn(
              "break-all rounded px-1.5 py-0.5",
              entry.kind === "added" ? "bg-green-soft text-green-fg" : "bg-green-soft text-green-fg"
            )}
          >
            {preview(entry.right)}
          </span>
        )}
      </div>
    </li>
  );
}

function Editor({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
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
        placeholder={placeholder}
        aria-label={label}
        className="min-h-[220px] w-full resize-y bg-transparent px-3.5 py-3 font-mono text-[13px] leading-relaxed text-foreground placeholder:text-foreground-faint focus:outline-none"
      />
    </div>
  );
}

export function JsonDiffTool() {
  const t = useCopy(COPY);
  const shared = useT();
  const [left, setLeft] = React.useState("");
  const [right, setRight] = React.useState("");

  const parsedLeft = React.useMemo(() => (left.trim() ? parseJson(left) : null), [left]);
  const parsedRight = React.useMemo(() => (right.trim() ? parseJson(right) : null), [right]);

  const errorFor = (p: ReturnType<typeof parseJson> | null) =>
    p && !p.ok ? shared.syntaxError(p.line ?? null, p.column ?? null, p.message) : null;

  const leftError = errorFor(parsedLeft);
  const rightError = errorFor(parsedRight);

  const diff = React.useMemo(() => {
    if (!parsedLeft?.ok || !parsedRight?.ok) return [];
    return diffJson(parsedLeft.value, parsedRight.value);
  }, [parsedLeft, parsedRight]);

  const counts = React.useMemo(
    () => ({
      added: diff.filter((d) => d.kind === "added").length,
      removed: diff.filter((d) => d.kind === "removed").length,
      changed: diff.filter((d) => d.kind === "changed").length,
    }),
    [diff]
  );

  const bothValid = parsedLeft?.ok && parsedRight?.ok;

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <SampleButton
          onClick={() => {
            setLeft(JSON_SAMPLE);
            setRight(SAMPLE_RIGHT);
          }}
        />
        {bothValid && (
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <Badge variant="success" size="xs">
              {t.added} {counts.added}
            </Badge>
            <Badge variant="danger" size="xs">
              {t.removed} {counts.removed}
            </Badge>
            <Badge variant="warning" size="xs">
              {t.changed} {counts.changed}
            </Badge>
          </div>
        )}
      </OptionBar>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Editor
          label={t.left}
          value={left}
          onChange={setLeft}
          placeholder="{}"
        />
        <Editor
          label={t.right}
          value={right}
          onChange={setRight}
          placeholder="{}"
        />
      </div>

      {(leftError || rightError) && (
        <div className="flex flex-col gap-2">
          {leftError && <ErrorNote>{`${t.left}: ${leftError}`}</ErrorNote>}
          {rightError && <ErrorNote>{`${t.right}: ${rightError}`}</ErrorNote>}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-11 items-center gap-2 border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.path}
          </span>
        </header>
        {!bothValid ? (
          <p className="px-4 py-10 text-center text-sm text-foreground-subtle">{t.empty}</p>
        ) : diff.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-foreground-subtle">{t.noDiff}</p>
        ) : (
          <ul className="divide-y divide-border">
            {diff.map((entry, i) => (
              <DiffRow key={`${entry.path}-${i}`} entry={entry} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
