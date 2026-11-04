"use client";

import * as React from "react";
import { Braces, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ClearButton,
  CopyButton,
  InputArea,
  OptionBar,
  OptionField,
  OutputArea,
  Pane,
  SampleButton,
  Segmented,
  Toggle,
} from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { downloadBlob } from "@/lib/files";
import {
  SCHEMA_TYPES,
  buildSchema,
  schemaType,
  validateSchema,
  type SchemaIssue,
  type SchemaTypeId,
  type SchemaValues,
} from "@/lib/schema-org";

const COPY = {
  zh: {
    type: "类型",
    fields: "字段",
    output: "JSON-LD",
    issues: "待修正",
    ok: "字段完整，可以直接使用",
    scriptTag: "包在 script 标签里",
    download: "下载 .json",
    sample: "示例",
    clear: "清空",
    required: "必填",
    issue: {
      required: (field: string) => `${field} 是必填项，缺失时富媒体结果不会生效`,
      url: (field: string) => `${field} 需要是完整的 http(s) 地址`,
      date: (field: string) => `${field} 请用 YYYY-MM-DD 格式的日期`,
      number: (field: string) => `${field} 需要是数字（不要带货币符号）`,
      pair: (field: string) => `${field} 需要成对出现：每个问题都要有回答，每层级都要有地址`,
    },
    note: "生成的是 schema.org 标准 JSON-LD，贴进页面的 <head> 即可。必填字段来自 Google 的富媒体结果文档：缺了不会报错，但搜索里不会出现增强样式。上线前可以用 Google Rich Results Test 再验一遍。",
  },
  en: {
    type: "Type",
    fields: "Fields",
    output: "JSON-LD",
    issues: "To fix",
    ok: "All fields look usable",
    scriptTag: "Wrap in a script tag",
    download: "Download .json",
    sample: "Sample",
    clear: "Clear",
    required: "required",
    issue: {
      required: (field: string) => `${field} is required, and rich results are skipped without it`,
      url: (field: string) => `${field} needs a full http(s) URL`,
      date: (field: string) => `${field} wants a YYYY-MM-DD date`,
      number: (field: string) => `${field} must be a number, without a currency symbol`,
      pair: (field: string) => `${field} needs complete pairs: every question with an answer, every level with a URL`,
    },
    note: "This is standard schema.org JSON-LD: drop it into the page head. The required fields follow Google's rich result docs — leaving one out does not break the page, it just costs you the enhanced snippet. Run the Google Rich Results Test before shipping.",
  },
};

const SAMPLES: Record<SchemaTypeId, SchemaValues> = {
  article: {
    headline: "Token counting without uploading your text",
    description: "Estimate and count tokens for GPT, Claude and Gemini locally in the browser.",
    url: "https://example.com/tools/token-counter",
    image: "https://example.com/og/token-counter.png",
    author: "Li Wei",
    publisher: "GongJu",
    datePublished: "2026-11-04",
    dateModified: "2026-11-04",
  },
  product: {
    name: "Mechanical Keyboard K87",
    description: "87-key hot-swappable board with PBT keycaps.",
    brand: "Example",
    sku: "KB-K87-BLK",
    price: "499.00",
    currency: "CNY",
    availability: "in",
    url: "https://example.com/p/k87",
    image: "https://example.com/p/k87.png",
  },
  faq: {
    faq: "Does this tool upload my files?\nNo. Parsing and conversion happen in your browser.\n\nCan I use it offline?\nOnce the page is loaded, most tools keep working.",
  },
  breadcrumb: {
    breadcrumb:
      "Home | https://example.com\nTools | https://example.com/tools\nToken counter | https://example.com/tools/token-counter",
  },
  organization: {
    name: "GongJu",
    url: "https://example.com",
    logo: "https://example.com/logo.png",
    description: "Browser-only toolbox for developers.",
    sameAs: "https://x.com/gongju\nhttps://github.com/gongju",
  },
};

function emptyDrafts(): Record<SchemaTypeId, SchemaValues> {
  return SCHEMA_TYPES.reduce(
    (acc, item) => ({ ...acc, [item.id]: {} }),
    {} as Record<SchemaTypeId, SchemaValues>
  );
}

export function SchemaMarkupTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [typeId, setTypeId] = React.useState<SchemaTypeId>("article");
  const [drafts, setDrafts] = React.useState<Record<SchemaTypeId, SchemaValues>>(emptyDrafts);
  const [withScript, setWithScript] = React.useState(false);

  const type = schemaType(typeId);
  const values = drafts[typeId] ?? {};
  const issues = validateSchema(typeId, values);
  const json = JSON.stringify(buildSchema(typeId, values), null, 2);
  const output = withScript
    ? `<script type="application/ld+json">\n${json}\n</script>`
    : json;

  const setField = (key: string, value: string) =>
    setDrafts((prev) => ({ ...prev, [typeId]: { ...prev[typeId], [key]: value } }));

  const labelOf = (key: string) =>
    type.fields.find((field) => field.key === key)?.label[locale] ?? key;

  const issueText = (issue: SchemaIssue) => {
    const field = labelOf(issue.key);
    switch (issue.kind) {
      case "required":
        return t.issue.required(field);
      case "url":
        return t.issue.url(field);
      case "date":
        return t.issue.date(field);
      case "number":
        return t.issue.number(field);
      default:
        return t.issue.pair(field);
    }
  };

  const download = () =>
    downloadBlob(
      new Blob([output], { type: "application/ld+json;charset=utf-8" }),
      `${typeId}.jsonld`
    );

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.type}>
          <Segmented
            ariaLabel={t.type}
            value={typeId}
            onChange={setTypeId}
            options={SCHEMA_TYPES.map((item) => ({ value: item.id, label: item.label[locale] }))}
          />
        </OptionField>
        <span className="ml-auto text-[11px] text-foreground-subtle">{type.description[locale]}</span>
      </OptionBar>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-11 items-center gap-1 border-b border-border px-3">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.fields}
            </span>
            <div className="ml-auto flex items-center gap-0.5">
              <SampleButton
                onClick={() => setDrafts((prev) => ({ ...prev, [typeId]: SAMPLES[typeId] }))}
                label={t.sample}
              />
              <ClearButton
                onClick={() => setDrafts((prev) => ({ ...prev, [typeId]: {} }))}
                label={t.clear}
              />
            </div>
          </header>

          <div className="grid gap-x-4 gap-y-3 p-4 sm:grid-cols-2">
            {type.fields.map((field) => {
              const multiline = field.kind === "multiline";
              return (
                <label
                  key={field.key}
                  className={multiline ? "flex flex-col gap-1.5 sm:col-span-2" : "flex flex-col gap-1.5"}
                >
                  <span className="flex items-center gap-1 text-[11px] text-foreground-muted">
                    {field.label[locale]}
                    {field.required && <span className="text-red-fg">*</span>}
                    {field.help && (
                      <span className="ml-auto text-[10px] text-foreground-faint">
                        {field.help[locale]}
                      </span>
                    )}
                  </span>
                  {multiline ? (
                    <InputArea
                      value={values[field.key] ?? ""}
                      onChange={(event) => setField(field.key, event.target.value)}
                      placeholder={field.placeholder?.[locale]}
                      aria-label={field.label[locale]}
                      spellCheck={false}
                      className="min-h-[120px] text-xs"
                    />
                  ) : (
                    <Input
                      value={values[field.key] ?? ""}
                      onChange={(event) => setField(field.key, event.target.value)}
                      placeholder={field.placeholder?.[locale]}
                      aria-label={field.label[locale]}
                      spellCheck={false}
                      size="xs"
                    />
                  )}
                </label>
              );
            })}
          </div>
        </section>

        <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.output}
            className="h-full"
            actions={
              <>
                <Toggle checked={withScript} onChange={setWithScript} label={t.scriptTag} />
                <CopyButton value={output} />
                <Button type="button" size="xs" className="gap-1.5" onClick={download}>
                  <Download className="h-3.5 w-3.5" />
                  {t.download}
                </Button>
              </>
            }
          >
            <OutputArea value={output} minHeight="min-h-[460px] max-h-[70vh]" clamp />
          </Pane>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-9 items-center gap-2 border-b border-border px-4">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.issues}
          </span>
          <span className="font-mono text-[11px] text-foreground-faint">{issues.length}</span>
        </header>
        {issues.length === 0 ? (
          <p className="px-4 py-3 text-xs text-green-fg">{t.ok}</p>
        ) : (
          <ul className="divide-y divide-border">
            {issues.map((issue, index) => (
              <li key={`${issue.key}-${index}`} className="px-4 py-2 text-xs text-foreground-muted">
                {issueText(issue)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-foreground-subtle">
        <Braces className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t.note}
      </p>
    </div>
  );
}
