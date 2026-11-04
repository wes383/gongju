"use client";

import * as React from "react";
import { Download, Loader2, Table2 } from "lucide-react";
import { FilePicker } from "@/components/tools/file-picker";
import {
  CopyButton,
  ErrorNote,
  OptionBar,
  OptionField,
  Toggle,
} from "@/components/tools/tool-ui";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText } from "@/lib/errors";
import { baseName, downloadBlob } from "@/lib/files";
import { cleanRows, parseXlsx, sheetToCsv, type Workbook } from "@/lib/xlsx";

const COPY = {
  zh: {
    sheet: "工作表",
    dropEmpty: "去空行",
    dedupe: "去重行",
    rows: (n: number) => `${n} 行`,
    cols: (n: number) => `${n} 列`,
    copy: "复制 CSV",
    download: "下载 CSV",
    loading: "正在读取工作簿…",
    notXlsx: "只支持 .xlsx / .xlsm；老的 .xls 请先用 Excel 另存为 .xlsx",
    truncated: (shown: number, total: number) =>
      `表格只渲染前 ${shown} 行，导出 CSV 始终包含全部 ${total} 行`,
    head: "行",
    note: "公式单元格显示的是文件里保存的缓存值，不会重新计算；日期按样式里的数字格式转成日期。清洗只影响预览和导出，不会改动原文件。",
    local: "文件在浏览器内解析，不会上传。",
  },
  en: {
    sheet: "Sheet",
    dropEmpty: "Drop empty rows",
    dedupe: "Dedupe rows",
    rows: (n: number) => `${n} rows`,
    cols: (n: number) => `${n} cols`,
    copy: "Copy CSV",
    download: "Download CSV",
    loading: "Reading the workbook…",
    notXlsx: "Only .xlsx / .xlsm — save old .xls files as .xlsx in Excel first",
    truncated: (shown: number, total: number) =>
      `Showing the first ${shown} rows; the CSV export always contains all ${total}`,
    head: "Row",
    note: "Formula cells show the cached value stored in the file, nothing is recalculated, and dates are converted using the number format in the styles. Cleaning only affects the preview and the export, never the original file.",
    local: "The file is parsed in your browser and never uploaded.",
  },
};

const VISIBLE_ROWS = 300;

export function XlsxViewerTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [files, setFiles] = React.useState<File[]>([]);
  const [workbook, setWorkbook] = React.useState<Workbook | null>(null);
  const [sheetIndex, setSheetIndex] = React.useState(0);
  const [dropEmpty, setDropEmpty] = React.useState(true);
  const [dedupe, setDedupe] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);

  const file = files[0] ?? null;
  const sheet = workbook?.sheets[sheetIndex] ?? null;

  const rows = React.useMemo(
    () => (sheet ? cleanRows(sheet.rows, { dropEmpty, dedupe }) : []),
    [sheet, dropEmpty, dedupe]
  );

  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);

  const reset = () => {
    setFiles([]);
    setWorkbook(null);
    setSheetIndex(0);
    setError(null);
  };

  const load = async (picked: File) => {
    setLoading(true);
    setError(null);
    setWorkbook(null);
    try {
      const bytes = new Uint8Array(await picked.arrayBuffer());
      const parsed = parseXlsx(bytes as Uint8Array<ArrayBuffer>);
      setWorkbook(parsed);
      setSheetIndex(0);
      setFiles([picked]);
    } catch (err) {
      setError(err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const save = () => {
    if (!file) return;
    // The BOM keeps Excel on Windows from guessing the wrong encoding
    const csv = `\uFEFF${sheetToCsv(rows)}`;
    downloadBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      `${baseName(file.name)}-${sheet?.name ?? "sheet"}.csv`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <FilePicker
        files={files}
        accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        loading={loading}
        hint={t.local}
        onAdd={(list) => {
          const picked = list?.[0];
          if (!picked) return;
          if (!/\.xls[xm]$/i.test(picked.name)) {
            setError(new Error(t.notXlsx));
            return;
          }
          void load(picked);
        }}
        onRemove={reset}
        onClear={reset}
      />

      {error ? <ErrorNote>{errorText(error, locale)}</ErrorNote> : null}

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-foreground-subtle">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t.loading}
        </p>
      ) : null}

      {workbook && sheet && (
        <>
          <OptionBar>
            {workbook.sheets.length > 1 && (
              <OptionField label={t.sheet}>
                <Select value={String(sheetIndex)} onValueChange={(value) => setSheetIndex(Number(value))}>
                  <SelectTrigger size="xs" className="w-40" aria-label={t.sheet}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {workbook.sheets.map((item, index) => (
                      <SelectItem key={item.name} value={String(index)}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </OptionField>
            )}

            <Toggle checked={dropEmpty} onChange={setDropEmpty} label={t.dropEmpty} />
            <Toggle checked={dedupe} onChange={setDedupe} label={t.dedupe} />

            <span className="font-mono text-[11px] text-foreground-subtle">
              {t.rows(rows.length)} · {t.cols(width)}
            </span>

            <div className="ml-auto flex items-center gap-1.5">
              <CopyButton value={sheetToCsv(rows)} label={t.copy} disabled={rows.length === 0} />
              <Button
                type="button"
                size="xs"
                className="gap-1.5"
                onClick={save}
                disabled={rows.length === 0}
              >
                <Download className="h-3.5 w-3.5" />
                {t.download}
              </Button>
            </div>
          </OptionBar>

          <section className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="max-h-[62vh] overflow-auto">
              <table className="min-w-full border-collapse text-[12.5px]">
                <thead className="sticky top-0 z-10 bg-surface">
                  <tr>
                    <th className="w-12 border-b border-r border-border px-2 py-1.5 text-right font-mono text-[10px] font-normal text-foreground-faint">
                      {t.head}
                    </th>
                    {Array.from({ length: width }, (_, index) => (
                      <th
                        key={index}
                        className="border-b border-r border-border px-2.5 py-1.5 text-left font-mono text-[10px] font-normal text-foreground-faint last:border-r-0"
                      >
                        {columnName(index)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, VISIBLE_ROWS).map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-hover-bg">
                      <td className="border-b border-r border-border px-2 py-1.5 text-right font-mono text-[10px] text-foreground-faint">
                        {rowIndex + 1}
                      </td>
                      {Array.from({ length: width }, (_, columnIndex) => (
                        <td
                          key={columnIndex}
                          className="max-w-[280px] truncate border-b border-r border-border px-2.5 py-1.5 text-foreground last:border-r-0"
                          title={row[columnIndex] ?? ""}
                        >
                          {row[columnIndex] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={width + 1}
                        className="px-3 py-10 text-center text-xs text-foreground-subtle"
                      >
                        {t.rows(0)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {rows.length > VISIBLE_ROWS && (
            <p className="flex items-center gap-1.5 px-1 text-[11px] text-foreground-subtle">
              <Table2 className="h-3.5 w-3.5" />
              {t.truncated(VISIBLE_ROWS, rows.length)}
            </p>
          )}

          <p className="px-1 text-[11px] leading-relaxed text-foreground-subtle">{t.note}</p>
        </>
      )}
    </div>
  );
}

/** 0 → A, 25 → Z, 26 → AA. */
function columnName(index: number): string {
  let name = "";
  let value = index;
  do {
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);
  return name;
}
