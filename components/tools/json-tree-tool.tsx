"use client";

import * as React from "react";
import {
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import {
  countNodes,
  isPlainObject,
  JSON_SAMPLE,
  parseJson,
} from "@/lib/json";
import {
  useCopy,
  useT,
} from "@/components/locale-provider";
import {
  Button,
} from "@/components/ui/button";
import {
  OptionBar,
  ErrorNote,
  SampleButton,
  ClearButton,
} from "@/components/tools/tool-ui";
import {
  cn,
} from "@/lib/utils";

const COPY = {
  zh: {
    inputLabel: "JSON",
    treeLabel: "树形视图",
    inputPlaceholder: "粘贴 JSON…",
    reset: "重置展开",
    sample: "示例",
    nodes: "节点",
    empty: "输入 JSON 后在这里浏览结构",
    more: (n: number) => `… 还有 ${n} 项`,
  },
  en: {
    inputLabel: "JSON",
    treeLabel: "Tree view",
    inputPlaceholder: "Paste JSON…",
    reset: "Reset expansion",
    sample: "Sample",
    nodes: "nodes",
    empty: "Paste JSON to browse its structure",
    more: (n: number) => `… ${n} more`,
  },
};

const MAX_ITEMS = 200;

function primitiveClass(value: unknown): string {
  if (typeof value === "string") return "text-green-fg";
  if (typeof value === "number") return "text-palette-violet";
  if (typeof value === "boolean") return "text-orange-fg";
  return "text-foreground-faint";
}

function renderPrimitive(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (value === null) return "null";
  return String(value);
}

function Node({
  label,
  value,
  depth,
}: {
  label: string | number | null;
  value: unknown;
  depth: number;
}) {
  const t = useCopy(COPY);
  const [open, setOpen] = React.useState(depth < 2);

  const isArray = Array.isArray(value);
  const isObject = isPlainObject(value);
  const isContainer = isArray || isObject;

  const entries: [string | number, unknown][] = isArray
    ? (value as unknown[]).map((v, i) => [i, v])
    : isObject
      ? Object.entries(value as Record<string, unknown>)
      : [];

  const shown = entries.slice(0, MAX_ITEMS);
  const rest = entries.length - shown.length;

  return (
    <div className="font-mono text-[12.5px] leading-relaxed">
      <div
        className={cn(
          "flex items-start gap-1 rounded px-1",
          isContainer && "cursor-pointer hover:bg-hover-bg"
        )}
        onClick={isContainer ? () => setOpen((v) => !v) : undefined}
        role={isContainer ? "button" : undefined}
        aria-expanded={isContainer ? open : undefined}
        tabIndex={isContainer ? 0 : undefined}
        onKeyDown={
          isContainer
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpen((v) => !v);
                }
              }
            : undefined
        }
      >
        <span className="flex w-3.5 shrink-0 justify-center pt-0.5 text-foreground-faint">
          {isContainer && (
            <ChevronRight
              className={cn("h-3 w-3 transition-transform", open && "rotate-90")}
            />
          )}
        </span>

        {label !== null && (
          <>
            <span className="text-blue-fg">{typeof label === "number" ? label : label}</span>
            <span className="text-foreground-faint">:</span>
          </>
        )}

        {isContainer ? (
          <span className="text-foreground-muted">
            {isArray ? `[${entries.length}]` : `{${entries.length}}`}
          </span>
        ) : (
          <span className={cn("break-all", primitiveClass(value))}>
            {renderPrimitive(value)}
          </span>
        )}
      </div>

      {isContainer && open && (
        <div className="ml-[0.9rem] border-l border-border pl-2">
          {shown.map(([key, child]) => (
            <Node key={String(key)} label={key} value={child} depth={depth + 1} />
          ))}
          {rest > 0 && (
            <div className="px-1 py-0.5 text-[11px] text-foreground-faint">{t.more(rest)}</div>
          )}
        </div>
      )}
    </div>
  );
}

export function JsonTreeTool() {
  const t = useCopy(COPY);
  const shared = useT();
  const [input, setInput] = React.useState("");
  const [resetKey, setResetKey] = React.useState(0);

  const parsed = React.useMemo(() => (input.trim() ? parseJson(input) : null), [input]);

  const errorText =
    parsed && !parsed.ok
      ? shared.syntaxError(parsed.line ?? null, parsed.column ?? null, parsed.message)
      : null;

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => setResetKey((k) => k + 1)}
          className="gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t.reset}
        </Button>
        {parsed?.ok && (
          <span className="ml-auto font-mono text-[11px] text-foreground-faint">
            {countNodes(parsed.value)} {t.nodes}
          </span>
        )}
      </OptionBar>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.inputLabel}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <SampleButton onClick={() => setInput(JSON_SAMPLE)} />
              <ClearButton onClick={() => setInput("")} />
            </div>
          </header>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder={t.inputPlaceholder}
            aria-label={t.inputLabel}
            className="min-h-[420px] w-full flex-1 resize-y bg-transparent px-3.5 py-3 font-mono text-[13px] leading-relaxed text-foreground placeholder:text-foreground-faint focus:outline-none"
          />
        </div>

        <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.treeLabel}
            </span>
          </header>
          <div className="max-h-[70vh] min-h-[420px] overflow-auto p-2">
            {errorText ? (
              <div className="p-2">
                <ErrorNote>{errorText}</ErrorNote>
              </div>
            ) : parsed?.ok ? (
              <Node key={resetKey} label={null} value={parsed.value} depth={0} />
            ) : (
              <p className="px-3 py-10 text-center text-sm text-foreground-subtle">{t.empty}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
