"use client";

import * as React from "react";
import { Dices, Download } from "lucide-react";
import {
  DualPane,
  OptionBar,
  SampleButton,
  Segmented,
} from "@/components/tools/tool-ui";
import { useCopy, useLocale, useT } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { highlightJson } from "@/lib/encoding";
import { parseJson, JSON_SAMPLE } from "@/lib/json";
import { inferSchema } from "@/lib/json-schema";
import { MOCK_SAMPLE_SCHEMA, mockJson } from "@/lib/mock";
import { downloadBlob } from "@/lib/files";
import type { JsonSchema } from "@/lib/json-schema";

const COPY = {
  zh: {
    schema: "Schema",
    sample: "样例 JSON",
    source: "数据来源",
    count: "条数",
    language: "生成的文本",
    regenerate: "重新生成",
    rows: "条",
    output: "生成结果",
    schemaLabel: "Schema",
    schemaPlaceholder: "粘贴 JSON Schema，例如 { \"type\": \"object\", \"properties\": { … } }",
    sampleLabel: "样例",
    samplePlaceholder: "粘贴一份样例 JSON，按它的结构生成",
    download: "下载 .json",
    empty: "填写 Schema 后会自动生成",
    notObject: "Schema 必须是一个 JSON 对象",
    note: "按 Schema 生成对象、数组、枚举与常见格式（email / date / uuid…）；没写 format 的字符串会按字段名猜内容，如 name 出姓名、city 出城市。同一个种子结果固定，换一个种子就换一批。",
  },
  en: {
    schema: "Schema",
    sample: "Sample JSON",
    source: "Source",
    count: "Rows",
    language: "Text style",
    regenerate: "Regenerate",
    rows: "rows",
    output: "Mock data",
    schemaLabel: "Schema",
    schemaPlaceholder: 'Paste a JSON Schema, e.g. { "type": "object", "properties": { … } }',
    sampleLabel: "Sample",
    samplePlaceholder: "Paste a sample document and follow its shape",
    download: "Download .json",
    empty: "Fill in a schema and the data appears here",
    notObject: "The schema must be a JSON object",
    note: "Generates objects, arrays, enums and common formats (email / date / uuid…) from the schema; plain strings are guessed from the field name, so name yields a person and city yields a city. The same seed reproduces the same rows.",
  },
};

type Source = "schema" | "sample";

function randomSeed() {
  return Math.floor(Math.random() * 1_000_000);
}

export function JsonMockTool() {
  const t = useCopy(COPY);
  const shared = useT();
  const locale = useLocale();

  const [source, setSource] = React.useState<Source>("schema");
  const [schemaText, setSchemaText] = React.useState(MOCK_SAMPLE_SCHEMA);
  const [sampleText, setSampleText] = React.useState(JSON_SAMPLE);
  const [count, setCount] = React.useState("5");
  const [style, setStyle] = React.useState<"zh" | "en">(locale);
  const [seed, setSeed] = React.useState(0);

  // Random seed after mount: reading Math.random() during render is an unstable
  // value for the prerender and blocks the route.
  React.useEffect(() => {
    const id = window.setTimeout(() => setSeed(randomSeed()), 0);
    return () => window.clearTimeout(id);
  }, []);

  const input = source === "schema" ? schemaText : sampleText;

  const resolved = React.useMemo(() => {
    const parsed = parseJson(input);
    if (!parsed.ok) {
      return {
        schema: null as JsonSchema | null,
        error: shared.syntaxError(parsed.line ?? null, parsed.column ?? null, parsed.message),
      };
    }
    if (source === "sample") {
      return { schema: inferSchema(parsed.value), error: null };
    }
    if (typeof parsed.value !== "object" || parsed.value === null || Array.isArray(parsed.value)) {
      return { schema: null, error: t.notObject };
    }
    return { schema: parsed.value as JsonSchema, error: null };
  }, [input, source, shared, t.notObject]);

  const generated = React.useMemo(() => {
    if (!resolved.schema) return { text: "", error: null as string | null };
    try {
      return {
        text: mockJson(resolved.schema, { count: Number(count), seed, locale: style }),
        error: null as string | null,
      };
    } catch (error) {
      return { text: "", error: error instanceof Error ? error.message : String(error) };
    }
  }, [resolved.schema, count, seed, style]);
  const output = generated.text;

  return (
    <div className="flex flex-col gap-3">
      <OptionBar>
        <Segmented
          ariaLabel={t.source}
          value={source}
          onChange={setSource}
          options={[
            { value: "schema", label: t.schema },
            { value: "sample", label: t.sample },
          ]}
        />
        <Segmented
          ariaLabel={t.count}
          value={count}
          onChange={setCount}
          options={[
            { value: "1", label: "1" },
            { value: "5", label: "5" },
            { value: "10", label: "10" },
            { value: "50", label: "50" },
          ]}
        />
        <Segmented
          ariaLabel={t.language}
          value={style}
          onChange={setStyle}
          options={[
            { value: "zh", label: "中文" },
            { value: "en", label: "EN" },
          ]}
        />
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => setSeed(randomSeed())}
          className="ml-auto gap-1.5 text-foreground-muted"
        >
          <Dices className="h-3.5 w-3.5" />
          {t.regenerate}
        </Button>
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={source === "schema" ? setSchemaText : setSampleText}
        output={output}
        error={resolved.error ?? generated.error}
        inputLabel={source === "schema" ? t.schemaLabel : t.sampleLabel}
        outputLabel={t.output}
        inputPlaceholder={source === "schema" ? t.schemaPlaceholder : t.samplePlaceholder}
        outputHighlight={output ? highlightJson(output) : undefined}
        inputActions={
          <SampleButton
            onClick={() =>
              source === "schema"
                ? setSchemaText(MOCK_SAMPLE_SCHEMA)
                : setSampleText(JSON_SAMPLE)
            }
          />
        }
        outputActions={
          <>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={!output}
              onClick={() => {
                if (!output) return;
                downloadBlob(
                  new Blob([output], { type: "application/json;charset=utf-8" }),
                  "mock-data.json"
                );
              }}
              className="gap-1.5 text-foreground-muted"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t.download}</span>
            </Button>
          </>
        }
        onClear={() => (source === "schema" ? setSchemaText("") : setSampleText(""))}
        inputFooter={<span>{input.length}</span>}
        outputFooter={<span>{output ? `${count} ${t.rows}` : ""}</span>}
      />

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
