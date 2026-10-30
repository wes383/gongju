"use client";

import * as React from "react";
import Papa from "papaparse";
import { Sparkles } from "lucide-react";
import { cellToString, JSON_SAMPLE, parseJson, toTabular } from "@/lib/json";
import { useCopy, useT } from "@/components/locale-provider";
import { CopyButton, DualPane, OptionBar, PaneButton, Segmented, Toggle } from "@/components/tools/tool-ui";

type Delimiter = "," | ";" | "\t" | "|";

const COPY = {
  zh: {
    delimiter: "分隔符",
    comma: "逗号",
    semicolon: "分号",
    tab: "Tab",
    pipe: "竖线",
    flatten: "扁平化嵌套字段",
    flattenHint: "把 { a: { b: 1 } } 展开成 a.b 一列",
    header: "首行为表头",
    inputLabel: "JSON",
    outputLabel: "CSV",
    inputPlaceholder: "粘贴 JSON 数组，例如 [{ \"a\": 1 }]",
    sample: "示例",
    preview: "表格预览",
    rows: "行",
    cols: "列",
    previewEmpty: "解析出数据后在这里预览表格",
    onlyFirst: (n: number) => `仅显示前 ${n} 行`,
    notArray: "提示：顶层不是数组时，会按单行处理",
  },
  en: {
    delimiter: "Delimiter",
    comma: "Comma",
    semicolon: "Semicolon",
    tab: "Tab",
    pipe: "Pipe",
    flatten: "Flatten nested fields",
    flattenHint: "Turn { a: { b: 1 } } into a single a.b column",
    header: "First row is header",
    inputLabel: "JSON",
    outputLabel: "CSV",
    inputPlaceholder: 'Paste a JSON array, e.g. [{ "a": 1 }]',
    sample: "Sample",
    preview: "Table preview",
    rows: "rows",
    cols: "cols",
    previewEmpty: "Parsed rows appear here as a table",
    onlyFirst: (n: number) => `Showing the first ${n} rows`,
    notArray: "Note: a non-array top level is treated as a single row",
  },
};

const MAX_PREVIEW = 50;

export function JsonToCsvTool() {
  const t = useCopy(COPY);
  const shared = useT();
  const [input, setInput] = React.useState("");
  const [delimiter, setDelimiter] = React.useState<Delimiter>(",");
  const [flatten, setFlatten] = React.useState(true);
  const [header, setHeader] = React.useState(true);

  const parsed = React.useMemo(() => (input.trim() ? parseJson(input) : null), [input]);

  const table = React.useMemo(() => {
    if (!parsed?.ok) return null;
    return toTabular(parsed.value, flatten);
  }, [parsed, flatten]);

  const csv = React.useMemo(() => {
    if (!table || table.rows.length === 0) return "";
    try {
      return Papa.unparse(table.rows, { delimiter, header, columns: table.columns });
    } catch {
      return "";
    }
  }, [table, delimiter, header]);

  const parseError =
    parsed && !parsed.ok
      ? shared.syntaxError(parsed.line ?? null, parsed.column ?? null, parsed.message)
      : null;

  const previewRows = table ? table.rows.slice(0, MAX_PREVIEW) : [];

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <span className="text-xs font-medium text-foreground-muted">{t.delimiter}</span>
        <Segmented
          ariaLabel={t.delimiter}
          value={delimiter}
          onChange={setDelimiter}
          options={[
            { value: ",", label: t.comma },
            { value: ";", label: t.semicolon },
            { value: "\t", label: t.tab },
            { value: "|", label: t.pipe },
          ]}
        />
        <Toggle checked={flatten} onChange={setFlatten} label={t.flatten} hint={t.flattenHint} />
        <Toggle checked={header} onChange={setHeader} label={t.header} />
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={csv}
        error={parseError}
        inputLabel={t.inputLabel}
        outputLabel={t.outputLabel}
        inputPlaceholder={t.inputPlaceholder}
        inputActions={
          <PaneButton onClick={() => setInput(JSON_SAMPLE)} title={t.sample}>
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t.sample}</span>
          </PaneButton>
        }
        onClear={() => setInput("")}
        inputFooter={
          parsed?.ok && !Array.isArray(parsed.value) ? (
            <span className="text-foreground-faint">{t.notArray}</span>
          ) : null
        }
        outputFooter={
          table ? (
            <>
              <span>
                {table.rows.length} {t.rows}
              </span>
              <span>
                {table.columns.length} {t.cols}
              </span>
            </>
          ) : null
        }
      />

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-10 items-center gap-2 border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.preview}
          </span>
          {table && table.rows.length > MAX_PREVIEW && (
            <span className="text-[11px] text-foreground-faint">
              {t.onlyFirst(MAX_PREVIEW)}
            </span>
          )}
          <div className="ml-auto">
            <CopyButton value={csv} label={shared.copy} />
          </div>
        </header>

        {table && table.rows.length > 0 ? (
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="whitespace-nowrap border-b border-border px-3 py-2 font-mono text-[11px] font-medium text-foreground-subtle">
                    #
                  </th>
                  {table.columns.map((col) => (
                    <th
                      key={col}
                      className="whitespace-nowrap border-b border-border px-3 py-2 font-mono text-[11px] font-medium text-foreground"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="hover:bg-hover-bg">
                    <td className="border-b border-border px-3 py-1.5 font-mono text-[11px] text-foreground-faint">
                      {i + 1}
                    </td>
                    {table.columns.map((col) => (
                      <td
                        key={col}
                        className="max-w-[280px] truncate border-b border-border px-3 py-1.5 font-mono text-[11.5px] text-foreground-muted"
                        title={cellToString(row[col])}
                      >
                        {cellToString(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-10 text-center text-sm text-foreground-subtle">
            {t.previewEmpty}
          </p>
        )}
      </div>
    </div>
  );
}
