"use client";

import * as React from "react";
import { Download, Table2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadFileButton } from "@/components/tools/file-drop";
import {
  CopyButton,
  ErrorNote,
  InputArea,
  OptionBar,
  OptionField,
  Pane,
  SampleButton,
  Segmented,
  Toggle,
  WarningNote,
} from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { parseCsv, stringifyCsv, type CsvTable } from "@/lib/csv";
import { mergeTables, type MergeIssueCode, type MergeIssue, type MergeMode } from "@/lib/csv-merge";
import { errorText } from "@/lib/errors";
import { downloadBlob } from "@/lib/files";

const COPY = {
  zh: {
    left: "主表",
    right: "副表 / 追加表",
    append: "纵向追加",
    join: "按键关联",
    leftKey: "主表关联列",
    rightKey: "副表关联列",
    joinType: "关联方式",
    leftJoin: "保留全部主表行",
    innerJoin: "只保留匹配行",
    sourceColumn: "标记数据来源",
    pasteLeft: "粘贴 CSV 或 TSV，第一行是表头…",
    pasteRight: "粘贴要追加 / 关联的另一份表…",
    sample: "示例",
    output: "合并结果",
    rows: (n: number) => `${n} 行`,
    columns: (n: number) => `${n} 列`,
    download: "下载 CSV",
    preview: "只预览前 30 行，导出包含全部数据",
    noOutput: "导入两份表后显示合并结果",
    issues: {
      "duplicate-key": (detail?: string, count?: number) =>
        `「${detail ?? ""}」有 ${count ?? 0} 行重复，只保留了第一行`,
      "empty-key": (detail?: string, count?: number) => `「${detail ?? ""}」有 ${count ?? 0} 行缺少关联值，已跳过`,
      "header-mismatch": () => "两份表的列不完全相同，追加时缺失的列会留空",
    } as Record<MergeIssueCode, (detail?: string, count?: number) => string>,
    stats: {
      matched: "匹配行",
      leftUnmatched: "主表未匹配",
      rightOnly: "副表多余",
    },
    note: "按表头名称对齐列，不依赖列的顺序；全部在浏览器内完成，文件不会上传。",
  },
  en: {
    left: "Main table",
    right: "Second / appended table",
    append: "Stack rows",
    join: "Join on a key",
    leftKey: "Main key column",
    rightKey: "Second key column",
    joinType: "Join type",
    leftJoin: "Keep every main row",
    innerJoin: "Keep matches only",
    sourceColumn: "Mark row source",
    pasteLeft: "Paste CSV or TSV, first row is the header…",
    pasteRight: "Paste the table to append or join…",
    sample: "Sample",
    output: "Merged result",
    rows: (n: number) => `${n} rows`,
    columns: (n: number) => `${n} columns`,
    download: "Download CSV",
    preview: "Previewing the first 30 rows; the export contains everything",
    noOutput: "Import both tables to see the result",
    issues: {
      "duplicate-key": (detail?: string, count?: number) =>
        `“${detail ?? ""}” had ${count ?? 0} duplicate row(s); only the first was kept`,
      "empty-key": (detail?: string, count?: number) =>
        `“${detail ?? ""}” had ${count ?? 0} row(s) without a key; they were skipped`,
      "header-mismatch": () => "The two tables have different columns; missing cells stay empty",
    } as Record<MergeIssueCode, (detail?: string, count?: number) => string>,
    stats: {
      matched: "Matched",
      leftUnmatched: "Unmatched main",
      rightOnly: "Extra in second",
    },
    note: "Columns are matched by header name, not by position. Everything runs in the browser — files are never uploaded.",
  },
};

const LEFT_SAMPLE = `id,name,city
1,Alice,Shanghai
2,Bob,Beijing
3,Carol,Shenzhen`;

const RIGHT_SAMPLE = `id,email,plan
1,alice@example.com,pro
2,bob@example.com,free
4,dave@example.com,pro`;

function previewRows(table: CsvTable, limit = 30): string[][] {
  return table.rows.slice(0, limit);
}

export function CsvMergeTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [leftText, setLeftText] = React.useState("");
  const [rightText, setRightText] = React.useState("");
  const [mode, setMode] = React.useState<MergeMode>("join");
  const [joinType, setJoinType] = React.useState<"left" | "inner">("left");
  const [leftKeyChoice, setLeftKey] = React.useState("");
  const [rightKeyChoice, setRightKey] = React.useState("");
  const [sourceColumn, setSourceColumn] = React.useState(false);

  const left = React.useMemo(() => parseCsv(leftText), [leftText]);
  const right = React.useMemo(() => parseCsv(rightText), [rightText]);

  // Derived, not synced: a pasted table that lacks the previous choice falls
  // back to its first column without an extra render pass.
  const leftKey =
    left && left.header.includes(leftKeyChoice) ? leftKeyChoice : (left?.header[0] ?? "");
  const rightKey =
    right && right.header.includes(rightKeyChoice) ? rightKeyChoice : (right?.header[0] ?? "");

  const merged = React.useMemo(() => {
    if (!left) return null;
    if (mode === "join" && !right) return null;
    try {
      return mergeTables(left, right, {
        mode,
        joinType,
        leftKey,
        rightKey,
        sourceColumn,
        sourceHeader: locale === "zh" ? "来源" : "source",
        sourceLabels: [t.left, t.right],
      });
    } catch (error) {
      return { error } as const;
    }
  }, [left, right, mode, joinType, leftKey, rightKey, sourceColumn, locale, t.left, t.right]);

  const result = merged && "error" in merged ? null : merged;
  const mergeError = merged && "error" in merged ? merged.error : null;

  const download = () => {
    if (!result) return;
    const csv = stringifyCsv(result.table);
    downloadBlob(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }), "merged.csv");
  };

  const csv = result ? stringifyCsv(result.table) : "";

  const issueList = result
    ? result.issues
        .map((issue: MergeIssue) => t.issues[issue.code](issue.detail, issue.count))
        .filter(Boolean)
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 lg:grid-cols-2">
        {(
          [
            {
              key: "left" as const,
              label: t.left,
              value: leftText,
              onChange: setLeftText,
              placeholder: t.pasteLeft,
              table: left,
            },
            {
              key: "right" as const,
              label: t.right,
              value: rightText,
              onChange: setRightText,
              placeholder: t.pasteRight,
              table: right,
            },
          ]
        ).map((side) => (
          <div key={side.key} className="overflow-hidden rounded-lg border border-border bg-surface">
            <Pane
              label={side.label}
              className="h-full"
              actions={
                <>
                  <UploadFileButton
                    accept=".csv,.tsv,.txt,text/csv,text/plain"
                    label={locale === "zh" ? "导入" : "Import"}
                    onText={(text) => side.onChange(text)}
                  />
                  <SampleButton
                    onClick={() => side.onChange(side.key === "left" ? LEFT_SAMPLE : RIGHT_SAMPLE)}
                  />
                </>
              }
              footer={
                side.table ? (
                  <>
                    <span>{t.rows(side.table.rows.length)}</span>
                    <span>{t.columns(side.table.header.length)}</span>
                  </>
                ) : null
              }
            >
              <InputArea
                value={side.value}
                onChange={(event) => side.onChange(event.target.value)}
                placeholder={side.placeholder}
                className="min-h-[180px]"
                aria-label={side.label}
              />
            </Pane>
          </div>
        ))}
      </div>

      <OptionBar>
        <Segmented
          ariaLabel={t.output}
          value={mode}
          onChange={(value) => setMode(value as MergeMode)}
          options={[
            { value: "append", label: t.append },
            { value: "join", label: t.join },
          ]}
        />
        {mode === "join" ? (
          <>
            <OptionField label={t.leftKey}>
              <Select value={leftKey} onValueChange={setLeftKey}>
                <SelectTrigger size="xs" className="w-36" aria-label={t.leftKey}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(left?.header ?? []).map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </OptionField>
            <OptionField label={t.rightKey}>
              <Select value={rightKey} onValueChange={setRightKey}>
                <SelectTrigger size="xs" className="w-36" aria-label={t.rightKey}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(right?.header ?? []).map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </OptionField>
            <Segmented
              ariaLabel={t.joinType}
              value={joinType}
              onChange={(value) => setJoinType(value as "left" | "inner")}
              options={[
                { value: "left", label: t.leftJoin },
                { value: "inner", label: t.innerJoin },
              ]}
            />
          </>
        ) : (
          <Toggle checked={sourceColumn} onChange={setSourceColumn} label={t.sourceColumn} />
        )}
      </OptionBar>

      {mergeError ? <ErrorNote>{errorText(mergeError, locale)}</ErrorNote> : null}
      {result && issueList.length > 0 && (
        <div className="flex flex-col gap-2">
          {issueList.map((line) => (
            <WarningNote key={line}>{line}</WarningNote>
          ))}
        </div>
      )}

      {result ? (
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
            <Table2 className="h-4 w-4 text-foreground-faint" />
            <span className="text-xs font-medium text-foreground">{t.output}</span>
            <Badge variant="secondary" size="sm">
              {t.rows(result.stats.rows)} · {t.columns(result.stats.columns)}
            </Badge>
            {mode === "join" && (
              <span className="text-[11px] text-foreground-faint">
                {t.stats.matched} {result.stats.matched} · {t.stats.leftUnmatched}{" "}
                {result.stats.leftUnmatched} · {t.stats.rightOnly} {result.stats.rightOnly}
              </span>
            )}
            <div className="ml-auto flex items-center gap-1">
              <CopyButton value={csv} />
              <Button type="button" size="xs" onClick={download}>
                <Download className="h-3.5 w-3.5" />
                {t.download}
              </Button>
            </div>
          </header>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full border-collapse text-left font-mono text-[11px]">
              <thead className="sticky top-0 bg-surface">
                <tr className="text-foreground-subtle">
                  <th className="px-3 py-2 font-normal">#</th>
                  {result.table.header.map((header, index) => (
                    <th key={`${header}-${index}`} className="whitespace-nowrap px-3 py-2 font-normal">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows(result.table).map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-border/60">
                    <td className="px-3 py-1.5 text-foreground-subtle">{rowIndex + 1}</td>
                    {result.table.header.map((_, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="max-w-[220px] truncate px-3 py-1.5 text-foreground-muted"
                      >
                        {row[cellIndex] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border px-3 py-2 text-[11px] text-foreground-faint">{t.preview}</p>
        </section>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center text-xs text-foreground-subtle">
          {t.noOutput}
        </div>
      )}

      <p className="px-1 text-[11px] leading-relaxed text-foreground-faint">{t.note}</p>
    </div>
  );
}
