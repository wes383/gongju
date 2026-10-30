"use client";

import * as React from "react";
import {
  Plus,
  Trash2,
} from "lucide-react";
import {
  buildQueryString,
  newQueryRow,
  parseQueryString,
  type QueryRow,
} from "@/lib/encoding";
import {
  Button,
} from "@/components/ui/button";
import {
  CopyButton,
  OptionBar,
  Toggle,
  SampleButton,
  ClearButton,
} from "@/components/tools/tool-ui";
import {
  useCopy,
} from "@/components/locale-provider";
import {
  cn,
} from "@/lib/utils";

const COPY = {
  zh: {
    sample: "示例",
    clear: "清空",
    placeholder: "粘贴完整 URL 或 ?a=1&b=2，会自动拆成参数表…",
    ariaInput: "URL 或 Query String",
    chars: "字符",
    params: "个参数",
    inputHint: "支持完整 URL、? 开头或裸 query",
    encode: "对键值做 URL 编码",
    encodeHint: "关闭后直接输出原文，便于阅读",
    sort: "按参数名排序",
    active: "个生效参数",
    paramsTitle: "参数",
    addRow: "添加一行",
    empty: "粘贴 URL 或点击「添加一行」开始编辑",
    enable: "启用该参数",
    remove: "删除该参数",
    outputTitle: "生成的 Query String",
    pairs: "组键值",
  },
  en: {
    sample: "Sample",
    clear: "Clear",
    placeholder: "Paste a full URL or ?a=1&b=2 to split it into rows…",
    ariaInput: "URL or query string",
    chars: "chars",
    params: "params",
    inputHint: "Accepts a full URL, a leading ? or a bare query",
    encode: "URL-encode keys and values",
    encodeHint: "Turn off to keep the raw text, easier to read",
    sort: "Sort by key",
    active: "active params",
    paramsTitle: "Parameters",
    addRow: "Add row",
    empty: "Paste a URL or click Add row to start editing",
    enable: "Enable this parameter",
    remove: "Remove this parameter",
    outputTitle: "Generated query string",
    pairs: "pairs",
  },
};

const SAMPLE =
  "https://example.com/search?q=%E7%BC%96%E7%A0%81&tag=base64&tag=url&page=2&debug";

export function QueryStringTool() {
  const t = useCopy(COPY);
  const [text, setText] = React.useState("");
  const [rows, setRows] = React.useState<QueryRow[]>([]);
  const [encode, setEncode] = React.useState(true);
  const [sort, setSort] = React.useState(false);

  const importText = (value: string) => {
    setText(value);
    setRows(parseQueryString(value));
  };

  const updateRow = (id: string, patch: Partial<QueryRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const addRow = () => setRows((prev) => [...prev, newQueryRow()]);

  const output = React.useMemo(
    () => buildQueryString(rows, { encode, sort }),
    [rows, encode, sort]
  );

  const activeCount = rows.filter((r) => r.enabled && r.key.trim()).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-11 items-center gap-2 border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            URL / Query
          </span>
          <div className="ml-auto flex items-center gap-1">
            <SampleButton onClick={() => importText(SAMPLE)} />
            <ClearButton
              onClick={() => {
                setText("");
                setRows([]);
              }}
            />
          </div>
        </header>
        <textarea
          value={text}
          onChange={(e) => importText(e.target.value)}
          spellCheck={false}
          placeholder={t.placeholder}
          aria-label={t.ariaInput}
          className="min-h-[96px] w-full resize-y break-all bg-transparent px-3.5 py-3 font-mono text-[13px] leading-relaxed text-foreground placeholder:text-foreground-faint focus:outline-none"
        />
        <footer className="flex h-8 items-center gap-3 border-t border-border px-3 font-mono text-[11px] text-foreground-faint">
          <span>
            {text.length} {t.chars}
          </span>
          <span>
            {rows.length} {t.params}
          </span>
          <span className="ml-auto">{t.inputHint}</span>
        </footer>
      </div>

      <OptionBar>
        <Toggle checked={encode} onChange={setEncode} label={t.encode} hint={t.encodeHint} />
        <Toggle checked={sort} onChange={setSort} label={t.sort} />
        <span className="ml-auto font-mono text-[11px] text-foreground-faint">
          {activeCount} {t.active}
        </span>
      </OptionBar>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-11 items-center gap-2 border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.paramsTitle}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={addRow}
            className="ml-auto gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.addRow}
          </Button>
        </header>

        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-foreground-subtle">{t.empty}</p>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((row) => (
              <div
                key={row.id}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-2",
                  !row.enabled && "opacity-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) => updateRow(row.id, { enabled: e.target.checked })}
                  aria-label={t.enable}
                  className="h-3.5 w-3.5 shrink-0 accent-[var(--accent)]"
                />
                <input
                  value={row.key}
                  onChange={(e) => updateRow(row.id, { key: e.target.value })}
                  placeholder="key"
                  spellCheck={false}
                  className="min-w-0 flex-1 rounded-md border border-transparent bg-hover-bg px-2 py-1.5 font-mono text-xs text-foreground placeholder:text-foreground-faint focus:border-border-strong focus:bg-surface focus:outline-none"
                />
                <span className="text-foreground-faint">=</span>
                <input
                  value={row.value}
                  onChange={(e) => updateRow(row.id, { value: e.target.value })}
                  placeholder="value"
                  spellCheck={false}
                  className="min-w-0 flex-[1.4] rounded-md border border-transparent bg-hover-bg px-2 py-1.5 font-mono text-xs text-foreground placeholder:text-foreground-faint focus:border-border-strong focus:bg-surface focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  aria-label={t.remove}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground-faint transition-colors hover:bg-red-soft hover:text-red-fg"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-11 items-center gap-2 border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.outputTitle}
          </span>
          <div className="ml-auto">
            <CopyButton value={output} />
          </div>
        </header>
        <pre className="min-h-[72px] whitespace-pre-wrap break-all px-3.5 py-3 font-mono text-[13px] leading-relaxed text-foreground">
          {output || <span className="text-foreground-faint">—</span>}
        </pre>
        <footer className="flex h-8 items-center gap-3 border-t border-border px-3 font-mono text-[11px] text-foreground-faint">
          <span>
            {output.length} {t.chars}
          </span>
          <span>
            {output ? output.split("&").length : 0} {t.pairs}
          </span>
        </footer>
      </div>
    </div>
  );
}
