"use client";

import * as React from "react";
import { Download, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ClearButton,
  CopyButton,
  ErrorNote,
  InputArea,
  OutputArea,
  SampleButton,
  Segmented,
} from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { downloadBlob } from "@/lib/files";
import {
  collectVariables,
  parseBatch,
  renderBatch,
  renderTemplate,
  serializeBatch,
  unresolvedVariables,
  type ExportFormat,
} from "@/lib/prompt-template";

const COPY = {
  zh: {
    template: "模板",
    preview: "预览",
    variables: "变量",
    variableHint: "用 {{名称}} 声明变量，名称支持字母、数字、下划线、点和连字符",
    noVariables: "模板里还没有变量",
    missing: (names: string) => `还没有填值：${names}`,
    batch: "批量渲染",
    batchHint: "粘贴 CSV（首行是表头）、JSON 数组或 JSON Lines，每行渲染一条",
    rows: (n: number) => `${n} 行`,
    batchMissing: (names: string) => `这些列在部分行里缺失：${names}`,
    export: "导出",
    download: "下载",
    sample: "示例",
    clear: "清空",
    sampleTemplate:
      "你是一位{{role}}。请把下面的内容改写成 {{length}} 字以内的{{format}}，语气保持{{tone}}：\n\n{{content}}",
    sampleValues: {
      role: "技术编辑",
      tone: "平和",
      length: "120",
      format: "摘要",
      content: "我们把重试逻辑从客户端搬到了网关，客户端只负责透传请求 ID。",
    },
    sampleBatch: `role,length,format,tone,content
技术编辑,80,摘要,克制,新版本把冷启动从 900ms 降到了 120ms。
产品经理,60,公告,热情,今天上线了批量导出功能。
技术支持,100,回复,耐心,用户反馈导出文件里中文变成了乱码。`,
    note: "模板只支持 {{变量}} 插值，没有循环和条件——需要逻辑的话，直接在代码里拼更清楚。占位符找不到值时原样保留，方便你一眼看出漏了什么。批量导出会把原始列和渲染结果放在一起，便于回溯是哪一行出了问题。",
  },
  en: {
    template: "Template",
    preview: "Preview",
    variables: "Variables",
    variableHint: "Declare with {{name}} — letters, digits, underscore, dot and dash",
    noVariables: "No variables in the template yet",
    missing: (names: string) => `Still empty: ${names}`,
    batch: "Batch render",
    batchHint: "Paste CSV with a header row, a JSON array, or JSON Lines — one render per row",
    rows: (n: number) => `${n} rows`,
    batchMissing: (names: string) => `These columns are missing from some rows: ${names}`,
    export: "Export",
    download: "Download",
    sample: "Sample",
    clear: "Clear",
    sampleTemplate:
      "You are a {{role}}. Rewrite the text below as a {{format}} of at most {{length}} words, in a {{tone}} tone:\n\n{{content}}",
    sampleValues: {
      role: "technical editor",
      tone: "calm",
      length: "120",
      format: "summary",
      content: "We moved the retry logic out of the client and into the gateway.",
    },
    sampleBatch: `role,length,format,tone,content
technical editor,80,summary,restrained,The new build cut cold start from 900ms to 120ms.
product manager,60,announcement,enthusiastic,Batch export shipped today.
support engineer,100,reply,patient,A user reported mojibake in exported files.`,
    note: "Templates only interpolate {{variables}} — no loops or conditionals. If you need logic, build the string in code instead. A variable without a value stays as a placeholder, so gaps are obvious. Batch exports keep the source columns next to the rendered output, which makes a bad row easy to trace.",
  },
};

const EXPORTS: { value: ExportFormat; label: string; extension: string }[] = [
  { value: "jsonl", label: "JSONL", extension: "jsonl" },
  { value: "csv", label: "CSV", extension: "csv" },
  { value: "json", label: "JSON", extension: "json" },
  { value: "text", label: "TXT", extension: "txt" },
];

const MIME: Record<ExportFormat, string> = {
  jsonl: "application/x-ndjson;charset=utf-8",
  csv: "text/csv;charset=utf-8",
  json: "application/json;charset=utf-8",
  text: "text/plain;charset=utf-8",
};

export function PromptTemplateTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  // `null` means "still showing the sample", so switching the UI language
  // swaps the sample too instead of freezing the one captured on first render
  const [draft, setDraft] = React.useState<string | null>(null);
  const [draftValues, setDraftValues] = React.useState<Record<string, string> | null>(null);
  const [draftBatch, setDraftBatch] = React.useState<string | null>(null);
  const [format, setFormat] = React.useState<ExportFormat>("jsonl");

  const template = draft ?? t.sampleTemplate;
  const values: Record<string, string> = draftValues ?? t.sampleValues;
  const batchText = draftBatch ?? t.sampleBatch;

  const variables = React.useMemo(() => safe(() => collectVariables(template)), [template]);
  const names = variables.value?.map((item) => item.name) ?? [];
  const preview = variables.error ? "" : renderTemplate(template, values);
  const missing = variables.error ? [] : unresolvedVariables(template, values);

  const batch = React.useMemo(() => {
    if (!batchText.trim()) return { value: null, error: null };
    return safe(() => parseBatch(batchText));
  }, [batchText]);

  const rendered = React.useMemo(() => {
    const rows = batch.value?.rows;
    if (!rows || variables.error) return { value: null, error: null };
    return safe(() => renderBatch(template, rows));
  }, [batch, template, variables.error]);

  const exportText = batch.value && rendered.value
    ? serializeBatch(batch.value.rows, rendered.value.outputs, format)
    : "";

  const save = () => {
    if (!exportText) return;
    const target = EXPORTS.find((item) => item.value === format) ?? EXPORTS[0];
    downloadBlob(new Blob([exportText], { type: MIME[format] }), `prompts.${target.extension}`);
  };

  const setValue = (name: string, next: string) =>
    setDraftValues((prev) => ({ ...(prev ?? t.sampleValues), [name]: next }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-2.5">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.template}
            </span>
            <div className="ml-auto flex items-center gap-0.5">
              <SampleButton
                onClick={() => {
                  setDraft(null);
                  setDraftValues(null);
                  setDraftBatch(null);
                }}
                label={t.sample}
              />
              <ClearButton onClick={() => setDraft("")} label={t.clear} />
            </div>
          </header>
          <InputArea
            value={template}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t.sampleTemplate}
            className="min-h-[240px]"
          />
        </section>

        <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-2.5">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.preview}
            </span>
            <div className="ml-auto">
              <CopyButton value={preview} label={t.preview} />
            </div>
          </header>
          {variables.error ? (
            <div className="p-3">
              <ErrorNote>{errorText(variables.error, locale)}</ErrorNote>
            </div>
          ) : (
            <OutputArea value={preview} minHeight="min-h-[240px] max-h-[42vh]" />
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
          <span className="text-xs font-medium text-foreground-muted">{t.variables}</span>
          <span className="font-mono text-[11px] text-foreground-faint">{names.length}</span>
          <span className="ml-auto text-[11px] text-foreground-faint">{t.variableHint}</span>
        </header>

        {names.length === 0 ? (
          <p className="px-4 py-4 text-xs text-foreground-subtle">{t.noVariables}</p>
        ) : (
          <div className="grid gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
            {names.map((name) => (
              <label key={name} className="flex min-w-0 flex-col gap-1.5">
                <span className="truncate font-mono text-[11px] text-foreground-muted">{name}</span>
                <Input
                  value={values[name] ?? ""}
                  onChange={(event) => setValue(name, event.target.value)}
                  spellCheck={false}
                  aria-label={name}
                  size="xs"
                  className="min-w-0 text-xs"
                />
              </label>
            ))}
          </div>
        )}

        {missing.length > 0 && (
          <p className="border-t border-border px-4 py-2 text-[11px] text-yellow-fg">
            {t.missing(missing.join(", "))}
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
          <span className="text-xs font-medium text-foreground-muted">{t.batch}</span>
          {batch.value && (
            <span className="font-mono text-[11px] text-foreground-faint">
              {t.rows(batch.value.rows.length)}
            </span>
          )}
          <span className="ml-auto text-[11px] text-foreground-faint">{t.batchHint}</span>
        </header>

        <InputArea
          value={batchText}
          onChange={(event) => setDraftBatch(event.target.value)}
          placeholder={t.sampleBatch}
          className="min-h-[150px] text-xs"
        />

        {batch.error ? (
          <div className="border-t border-border p-3">
            <ErrorNote>{errorText(batch.error, locale)}</ErrorNote>
          </div>
        ) : rendered.error ? (
          <div className="border-t border-border p-3">
            <ErrorNote>{errorText(rendered.error, locale)}</ErrorNote>
          </div>
        ) : rendered.value && rendered.value.missing.length > 0 ? (
          <p className="border-t border-border px-4 py-2 text-[11px] text-yellow-fg">
            {t.batchMissing(rendered.value.missing.join(", "))}
          </p>
        ) : null}

        <footer className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-2.5">
          <span className="text-[11px] text-foreground-faint">{t.export}</span>
          <Segmented
            ariaLabel={t.export}
            value={format}
            onChange={setFormat}
            options={EXPORTS.map((item) => ({ value: item.value, label: item.label }))}
          />
          <div className="ml-auto">
            <Button
              type="button"
              size="xs"
              className="gap-1.5"
              onClick={save}
              disabled={!exportText}
            >
              <Download className="h-3.5 w-3.5" />
              {t.download}
            </Button>
          </div>
        </footer>
      </section>

      <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-foreground-subtle">
        <LayoutTemplate className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t.note}
      </p>
    </div>
  );
}
