"use client";

import * as React from "react";
import { Download, FileSpreadsheet, Plus, Trash2 } from "lucide-react";
import { FilePicker } from "@/components/tools/file-picker";
import { CopyButton, ErrorNote, OptionBar, Pane, SampleButton } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import {
  addColumn,
  addRow,
  columnStats,
  CSV_SAMPLE,
  delimiterName,
  parseCsv,
  removeColumn,
  removeRow,
  setCell,
  setHeader,
  stringifyCsv,
  tableToMarkdown,
  type CsvTable,
} from "@/lib/csv";
import { codedError, errorText } from "@/lib/errors";
import { baseName, downloadBlob } from "@/lib/files";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    data: "表格",
    rows: "行",
    columns: "列",
    delimiter: "分隔符",
    addRow: "加一行",
    addColumn: "加一列",
    exportCsv: "导出 CSV",
    copyCsv: "复制 CSV",
    exportMarkdown: "复制为 Markdown",
    empty: "拖入 .csv / .tsv 文件，或粘贴一段分隔文本",
    openAnother: "换一个文件",
    paste: "粘贴文本",
    pastePlaceholder: "id,name,email\n1,Alice,alice@example.com",
    load: "导入",
    hint: "表格可双击单元格直接编辑，拖动表头右边缘可调列宽，支持 .csv / .tsv，文件不上传",
    rowNumber: "#",
    deleteRow: "删除这一行",
    deleteColumn: "删除这一列",
    resizeColumn: "调整列宽",
    resizeHint: "拖动调整列宽，双击按内容自适应",
    stats: "列统计",
    statEmpty: "空值",
    statUnique: "唯一值",
    kind: { number: "数字", date: "日期", boolean: "布尔", text: "文本", empty: "空" },
    note: "文件在浏览器内解析，大文件只渲染可见行；编辑后的内容可导出为 CSV，或复制成 Markdown 表格。",
  },
  en: {
    data: "Table",
    rows: "rows",
    columns: "columns",
    delimiter: "Delimiter",
    addRow: "Add row",
    addColumn: "Add column",
    exportCsv: "Export CSV",
    copyCsv: "Copy CSV",
    exportMarkdown: "Copy as Markdown",
    empty: "Drop a .csv / .tsv file, or paste delimited text",
    openAnother: "Open another file",
    paste: "Paste text",
    pastePlaceholder: "id,name,email\n1,Alice,alice@example.com",
    load: "Import",
    hint: "Double-click a cell to edit; drag a header edge to resize a column; .csv and .tsv, nothing leaves your device",
    rowNumber: "#",
    deleteRow: "Delete this row",
    deleteColumn: "Delete this column",
    resizeColumn: "Resize column",
    resizeHint: "Drag to resize, double-click to fit content",
    stats: "Column stats",
    statEmpty: "empty",
    statUnique: "unique",
    kind: { number: "number", date: "date", boolean: "boolean", text: "text", empty: "empty" },
    note: "Parsed in your browser, and only the visible rows are rendered; export the edits as CSV or copy them as a Markdown table.",
  },
};

const ROW_H = 34;
const INDEX_W = 44;
const CELL_MIN = 140;
const CELL_MIN_DRAG = 64;
const CELL_MAX_FIT = 480;
const CELL_PAD_X = 20;

type CellPos = { row: number; column: number };

let measureCtx: CanvasRenderingContext2D | null | undefined;

/** 用 canvas 量文本宽度，避免为了测宽把节点插进 DOM */
function textWidth(text: string, font: string): number {
  if (measureCtx === undefined) {
    measureCtx = document.createElement("canvas").getContext("2d");
  }
  if (!measureCtx) return text.length * 7;
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}

function computedFont(node: Element | null | undefined, fallback: string): string {
  if (!node) return fallback;
  const style = window.getComputedStyle(node);
  return `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
}

/** 等宽字体下按显示宽度估个长度：中日韩与全角字符按两个字符算 */
function visualLength(text: string): number {
  let total = 0;
  for (let i = 0; i < text.length; i += 1) {
    total += text.charCodeAt(i) > 0x2e7f ? 2 : 1;
  }
  return total;
}

export function CsvTableTool() {
  const t = useCopy(COPY);
  const locale = useLocale();

  const [table, setTable] = React.useState<CsvTable | null>(null);
  const [files, setFiles] = React.useState<File[]>([]);
  const [name, setName] = React.useState("table");
  const [error, setError] = React.useState<unknown>(null);
  const [pasteOpen, setPasteOpen] = React.useState(false);
  const [pasteText, setPasteText] = React.useState("");
  const [showStats, setShowStats] = React.useState(false);

  const [scrollTop, setScrollTop] = React.useState(0);
  const [viewportH, setViewportH] = React.useState(440);
  const viewportRef = React.useRef<HTMLDivElement>(null);

  // null 表示该列保持自适应（minmax(CELL_MIN, 1fr)），数字表示拖动后的固定像素宽
  const [widths, setWidths] = React.useState<(number | null)[]>([]);
  const headerRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const dragRef = React.useRef<{
    column: number;
    startX: number;
    startWidth: number;
    measured: number[];
    moved: boolean;
  } | null>(null);

  React.useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setViewportH(entry.contentRect.height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [table]);

  const load = (text: string, filename: string) => {
    const parsed = parseCsv(text);
    if (!parsed) {
      setError(codedError("csv.empty"));
      return;
    }
    setError(null);
    setTable(parsed);
    setName(filename.replace(/\.[^.]+$/, "") || "table");
    setScrollTop(0);
    setWidths([]);
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
  };

  const openFile = async (file: File) => {
    try {
      load(await file.text(), file.name);
    } catch {
      setError(codedError("csv.readFailed"));
    }
  };

  const stats = React.useMemo(() => (table ? columnStats(table) : []), [table]);

  const gridTemplate = table
    ? `${INDEX_W}px ${table.header
        .map((_, i) => {
          const width = widths[i];
          return width ? `${width}px` : `minmax(${CELL_MIN}px, 1fr)`;
        })
        .join(" ")}`
    : undefined;

  const startResize = (column: number, e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const measured = (table?.header ?? []).map(
      (_, i) => headerRefs.current[i]?.getBoundingClientRect().width ?? CELL_MIN
    );
    dragRef.current = {
      column,
      startX: e.clientX,
      startWidth: measured[column] ?? CELL_MIN,
      measured,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveResize = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const delta = e.clientX - drag.startX;
    // 手抖几像素不算拖动，避免轻微点按把列宽固定下来
    if (!drag.moved) {
      if (Math.abs(delta) < 2) return;
      drag.moved = true;
    }
    const next = Math.max(CELL_MIN_DRAG, Math.round(drag.startWidth + delta));
    // 从拖动开始时的实际宽度重建，其它列才不会被 1fr 带着一起变
    setWidths(() => {
      const copy = drag.measured.map((w) => Math.round(w));
      copy[drag.column] = next;
      return copy;
    });
  };

  const endResize = (e: React.PointerEvent<HTMLButtonElement>) => {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  /** 双击列边界：按内容自适应，和 Excel 的自动调整列宽一致 */
  const fitColumn = (column: number) => {
    if (!table) return;
    const headerNode = headerRefs.current[column];
    const headerFont = computedFont(
      headerNode?.querySelector("input"),
      '600 11px "Inter", system-ui, sans-serif'
    );
    const bodyFont = computedFont(
      viewportRef.current?.querySelector('input[data-cell="body"]'),
      '12px "JetBrains Mono", monospace'
    );

    let widest = "";
    let widestLength = -1;
    for (const row of table.rows) {
      const cell = row[column] ?? "";
      const length = visualLength(cell);
      if (length > widestLength) {
        widest = cell;
        widestLength = length;
      }
    }

    // 表头右侧要给删除按钮留位置
    const headerNeed = textWidth((table.header[column] ?? "").toUpperCase(), headerFont) + 42;
    const bodyNeed = widest ? textWidth(widest, bodyFont) + CELL_PAD_X : 0;
    const width = Math.min(
      CELL_MAX_FIT,
      Math.max(CELL_MIN_DRAG, Math.ceil(Math.max(headerNeed, bodyNeed)))
    );

    setWidths((prev) => {
      const copy = Array.from({ length: table.header.length }, (_, i) => prev[i] ?? null);
      copy[column] = width;
      return copy;
    });
  };

  const rowCount = table?.rows.length ?? 0;
  const overscan = 6;
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - overscan);
  const end = Math.min(rowCount, start + Math.ceil(viewportH / ROW_H) + overscan * 2);

  const editing = (pos: CellPos) => ({
    value:
      pos.row < 0
        ? (table?.header[pos.column] ?? "")
        : (table?.rows[pos.row]?.[pos.column] ?? ""),
    onChange: (value: string) => {
      if (!table) return;
      setTable((prev) =>
        !prev
          ? prev
          : pos.row < 0
            ? setHeader(prev, pos.column, value)
            : setCell(prev, pos.row, pos.column, value)
      );
    },
  });

  const cellClass =
    "h-full w-full min-w-0 bg-transparent px-2.5 font-mono text-xs text-foreground outline-none transition-colors placeholder:text-foreground-faint hover:bg-hover-bg focus:bg-accent-muted focus:text-foreground";

  return (
    <div className="flex flex-col gap-3">
      {!table ? (
        <div className="flex flex-col gap-2">
          <FilePicker
            files={files}
            accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
            hint={t.hint}
            onAdd={(list) => {
              const picked = list?.[0];
              if (!picked) return;
              setFiles([picked]);
              void openFile(picked);
            }}
            onRemove={() => {
              setFiles([]);
              setTable(null);
              setError(null);
            }}
            onClear={() => {
              setFiles([]);
              setTable(null);
              setError(null);
            }}
          />

          <div className="px-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setPasteOpen((prev) => !prev)}
                className="gap-1.5 text-foreground-muted"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {t.paste}
              </Button>
              <SampleButton onClick={() => load(CSV_SAMPLE, "sample.csv")} />
            </div>
            {pasteOpen && (
              <div className="mt-2 flex flex-col gap-2">
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={t.pastePlaceholder}
                  spellCheck={false}
                  className="min-h-[120px] w-full resize-y rounded-md border border-border bg-background px-2.5 py-2 font-mono text-xs leading-relaxed text-foreground placeholder:text-foreground-faint focus:outline-none focus-visible:border-accent"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="xs"
                    disabled={!pasteText.trim()}
                    onClick={() => load(pasteText, "pasted")}
                  >
                    {t.load}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <OptionBar>
            <span className="font-mono text-[11px] text-foreground-muted">
              {table.rows.length} {t.rows} × {table.header.length} {t.columns}
            </span>
            <span className="font-mono text-[11px] text-foreground-faint">
              {t.delimiter}: {delimiterName(table.delimiter)}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setTable((prev) => (prev ? addRow(prev) : prev))}
                className="gap-1.5 text-foreground-muted"
              >
                <Plus className="h-3.5 w-3.5" />
                {t.addRow}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setTable((prev) => (prev ? addColumn(prev) : prev))}
                className="gap-1.5 text-foreground-muted"
              >
                <Plus className="h-3.5 w-3.5" />
                {t.addColumn}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setShowStats((prev) => !prev)}
                aria-pressed={showStats}
                className={cn("gap-1.5", showStats ? "text-accent" : "text-foreground-muted")}
              >
                {t.stats}
              </Button>
            </div>
          </OptionBar>

          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <Pane
              label={t.data}
              actions={
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      const csv = stringifyCsv(table);
                      downloadBlob(
                        new Blob([csv], { type: "text/csv;charset=utf-8" }),
                        `${baseName(name, "table")}.csv`
                      );
                    }}
                    className="gap-1.5 text-foreground-muted"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>{t.exportCsv}</span>
                  </Button>
                  <CopyButton value={stringifyCsv(table)} label={t.copyCsv} />
                  <CopyButton value={tableToMarkdown(table)} label={t.exportMarkdown} />
                </>
              }
            >
              <div
                ref={viewportRef}
                onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
                className="h-[440px] overflow-auto"
              >
                <div className="min-w-max">
                  <div
                    className="sticky top-0 z-10 grid border-b border-border bg-surface"
                    style={{ gridTemplateColumns: gridTemplate }}
                  >
                    <div className="flex h-9 items-center justify-center font-mono text-[11px] text-foreground-faint">
                      {t.rowNumber}
                    </div>
                    {table.header.map((_, column) => (
                      <div
                        key={column}
                        ref={(node) => {
                          headerRefs.current[column] = node;
                        }}
                        className="group/col relative min-w-0 border-l border-border"
                      >
                        <input
                          value={editing({ row: -1, column }).value}
                          onChange={(e) =>
                            editing({ row: -1, column }).onChange(e.target.value)
                          }
                          aria-label={`${t.columns} ${column + 1}`}
                          className={cn(
                            cellClass,
                            "h-9 font-sans text-[11px] font-semibold uppercase tracking-wide",
                            table.header.length > 1 && "pr-8"
                          )}
                        />
                        {table.header.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setTable((prev) => (prev ? removeColumn(prev, column) : prev));
                              setWidths((prev) => prev.filter((_, i) => i !== column));
                            }}
                            aria-label={`${t.deleteColumn} ${column + 1}`}
                            title={t.deleteColumn}
                            className="absolute right-1.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-foreground-faint opacity-0 transition-opacity hover:bg-hover-bg hover:text-foreground group-hover/col:opacity-100"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          tabIndex={-1}
                          onPointerDown={(e) => startResize(column, e)}
                          onPointerMove={moveResize}
                          onPointerUp={endResize}
                          onPointerCancel={endResize}
                          onDoubleClick={() => fitColumn(column)}
                          aria-label={`${t.resizeColumn} ${column + 1}`}
                          title={t.resizeHint}
                          className="absolute right-[-3px] top-0 z-20 h-full w-1.5 cursor-col-resize touch-none select-none bg-transparent transition-colors hover:bg-accent/60 active:bg-accent"
                        />
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      paddingTop: start * ROW_H,
                      paddingBottom: Math.max(0, rowCount - end) * ROW_H,
                    }}
                  >
                    {table.rows.slice(start, end).map((row, offset) => {
                      const index = start + offset;
                      return (
                        <div
                          key={index}
                          className="group grid border-b border-border/60 last:border-b-0"
                          style={{ gridTemplateColumns: gridTemplate, height: ROW_H }}
                        >
                          <div className="relative flex items-center justify-center font-mono text-[11px] text-foreground-faint">
                            <span className="transition-opacity group-hover:opacity-0">
                              {index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setTable((prev) => (prev ? removeRow(prev, index) : prev))
                              }
                              aria-label={t.deleteRow}
                              className="absolute inset-0 grid place-items-center text-foreground-faint opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {row.map((cell, column) => (
                            <div key={column} className="min-w-0 border-l border-border/60">
                              <input
                                value={cell}
                                data-cell="body"
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setTable((prev) =>
                                    prev ? setCell(prev, index, column, value) : prev
                                  );
                                }}
                                aria-label={`${t.rows} ${index + 1}, ${table.header[column]}`}
                                className={cellClass}
                              />
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Pane>
          </div>

          {showStats && (
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left font-mono text-[11px]">
                  <thead>
                    <tr className="text-foreground-subtle">
                      <th className="whitespace-nowrap px-3 py-2 font-normal">{t.columns}</th>
                      <th className="whitespace-nowrap px-3 py-2 font-normal">{t.statEmpty}</th>
                      <th className="whitespace-nowrap px-3 py-2 font-normal">{t.statUnique}</th>
                      <th className="whitespace-nowrap px-3 py-2 font-normal">type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((stat) => (
                      <tr key={stat.index} className="border-t border-border/60">
                        <td className="max-w-[240px] truncate px-3 py-1.5 text-foreground">
                          {stat.name}
                        </td>
                        <td className="px-3 py-1.5 text-foreground-muted">{stat.empty}</td>
                        <td className="px-3 py-1.5 text-foreground-muted">{stat.unique}</td>
                        <td className="px-3 py-1.5 text-foreground-muted">
                          {t.kind[stat.kind]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => {
                setTable(null);
                setFiles([]);
                setError(null);
              }}
              className="shrink-0 text-foreground-muted"
            >
              {t.openAnother}
            </Button>
          </div>
        </>
      )}

      {error ? <ErrorNote>{errorText(error, locale)}</ErrorNote> : null}
      {!table && <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>}
    </div>
  );
}
