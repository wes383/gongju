"use client";

import * as React from "react";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import {
  CopyButton,
  DualPane,
  ErrorNote,
  InputArea,
  OptionBar,
  Pane,
  SampleButton,
  Segmented,
} from "@/components/tools/tool-ui";
import { useCopy, useT } from "@/components/locale-provider";
import { Badge } from "@/components/ui/badge";
import { highlightJson } from "@/lib/encoding";
import { parseJson } from "@/lib/json";
import {
  SCHEMA_SAMPLE,
  schemaFromSample,
  validateJson,
  type SchemaIssue,
  type ValidationResult,
} from "@/lib/json-schema";

const COPY = {
  zh: {
    modeLabel: "模式",
    generate: "生成 Schema",
    validate: "校验数据",
    sample: "示例",
    dataLabel: "数据",
    schemaLabel: "Schema",
    schemaOutput: "JSON Schema",
    dataPlaceholder: "粘贴要校验的 JSON…",
    schemaPlaceholder: "粘贴 JSON Schema…",
    checking: "校验中…",
    valid: "校验通过",
    invalid: "不符合 Schema",
    issues: (n: number) => `${n} 个问题`,
    root: "根节点",
    missing: (key: string) => `缺少必填字段 "${key}"`,
    type: (expected: string) => `类型应为 ${expected}`,
    format: (name: string) => `格式应为 ${name}`,
    enum: "取值不在允许的枚举中",
    additional: (key: string) => `不允许出现多余字段 "${key}"`,
    pattern: "不匹配要求的模式",
    minLength: (n: number) => `长度不能少于 ${n}`,
    maxLength: (n: number) => `长度不能超过 ${n}`,
    minimum: (n: number) => `不能小于 ${n}`,
    maximum: (n: number) => `不能大于 ${n}`,
    minItems: (n: number) => `至少需要 ${n} 项`,
    maxItems: (n: number) => `最多允许 ${n} 项`,
    schemaFailed: "Schema 本身有错误，无法用于校验",
    note: "从 JSON 样例推断出 draft-07 Schema（对象属性、必填、数组元素、email / uri / date 等常见格式）；校验使用 ajv，全程在浏览器内完成。",
  },
  en: {
    modeLabel: "Mode",
    generate: "Generate schema",
    validate: "Validate data",
    sample: "Sample",
    dataLabel: "Data",
    schemaLabel: "Schema",
    schemaOutput: "JSON Schema",
    dataPlaceholder: "Paste the JSON to validate…",
    schemaPlaceholder: "Paste a JSON Schema…",
    checking: "Validating…",
    valid: "Valid",
    invalid: "Does not match the schema",
    issues: (n: number) => `${n} issue${n > 1 ? "s" : ""}`,
    root: "root",
    missing: (key: string) => `missing required property "${key}"`,
    type: (expected: string) => `should be ${expected}`,
    format: (name: string) => `should match the ${name} format`,
    enum: "value is not one of the allowed options",
    additional: (key: string) => `unexpected property "${key}"`,
    pattern: "does not match the required pattern",
    minLength: (n: number) => `must be at least ${n} characters`,
    maxLength: (n: number) => `must be at most ${n} characters`,
    minimum: (n: number) => `must be ≥ ${n}`,
    maximum: (n: number) => `must be ≤ ${n}`,
    minItems: (n: number) => `needs at least ${n} items`,
    maxItems: (n: number) => `allows at most ${n} items`,
    schemaFailed: "The schema itself is invalid, so it cannot validate anything",
    note: "Infers a draft-07 schema from a JSON sample (object properties, required keys, array items, and common formats such as email / uri / date); validation uses ajv and runs entirely in your browser.",
  },
};

type Mode = "generate" | "validate";

const SAMPLE_SCHEMA = `{
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "name": { "type": "string", "minLength": 2 },
    "email": { "type": "string", "format": "email" },
    "active": { "type": "boolean" }
  },
  "required": ["id", "name", "email"]
}`;

const SAMPLE_DATA = `{
  "id": 7,
  "name": "GongJu",
  "email": "hello@gongju.dev",
  "active": true
}`;

export function JsonSchemaTool() {
  const t = useCopy(COPY);
  const shared = useT();

  const [mode, setMode] = React.useState<Mode>("generate");
  const [sample, setSample] = React.useState(SCHEMA_SAMPLE);

  const [data, setData] = React.useState(SAMPLE_DATA);
  const [schemaText, setSchemaText] = React.useState(SAMPLE_SCHEMA);
  const [result, setResult] = React.useState<ValidationResult | null>(null);
  const [checking, setChecking] = React.useState(false);
  const timer = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const runCheck = React.useCallback((nextSchema: string, nextData: string) => {
    if (timer.current) window.clearTimeout(timer.current);
    setChecking(true);
    timer.current = window.setTimeout(() => {
      void validateJson(nextSchema, nextData).then((next) => {
        setResult(next);
        setChecking(false);
      });
    }, 300);
  }, []);

  const generated = React.useMemo(() => {
    const parsed = parseJson(sample);
    if (!parsed.ok) {
      return {
        text: "",
        error: shared.syntaxError(parsed.line ?? null, parsed.column ?? null, parsed.message),
      };
    }
    return { text: schemaFromSample(parsed.value), error: null };
  }, [sample, shared]);

  const issueText = (issue: SchemaIssue): string => {
    const at = issue.path ? issue.path : t.root;
    switch (issue.keyword) {
      case "required":
        return `${at}: ${t.missing(String(issue.params.missingProperty ?? ""))}`;
      case "type":
        return `${at}: ${t.type(String(issue.params.type ?? ""))}`;
      case "format":
        return `${at}: ${t.format(String(issue.params.format ?? ""))}`;
      case "enum":
        return `${at}: ${t.enum}`;
      case "additionalProperties":
        return `${at}: ${t.additional(String(issue.params.additionalProperty ?? ""))}`;
      case "pattern":
        return `${at}: ${t.pattern}`;
      case "minLength":
        return `${at}: ${t.minLength(Number(issue.params.limit ?? 0))}`;
      case "maxLength":
        return `${at}: ${t.maxLength(Number(issue.params.limit ?? 0))}`;
      case "minimum":
        return `${at}: ${t.minimum(Number(issue.params.limit ?? 0))}`;
      case "maximum":
        return `${at}: ${t.maximum(Number(issue.params.limit ?? 0))}`;
      case "minItems":
        return `${at}: ${t.minItems(Number(issue.params.limit ?? 0))}`;
      case "maxItems":
        return `${at}: ${t.maxItems(Number(issue.params.limit ?? 0))}`;
      default:
        return `${at}: ${issue.keyword}`;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.modeLabel}
          value={mode}
          onChange={(next) => {
            setMode(next);
            if (next === "validate") runCheck(schemaText, data);
          }}
          options={[
            { value: "generate", label: t.generate },
            { value: "validate", label: t.validate },
          ]}
        />
        {mode === "validate" && (
          <span className="ml-auto flex items-center gap-2 font-mono text-[11px] text-foreground-faint">
            {checking && <Loader2 className="h-3 w-3 animate-spin" />}
            {checking ? t.checking : null}
            {!checking && result?.ok === true && (
              <Badge variant="success" size="sm" dot>
                {t.valid}
              </Badge>
            )}
            {!checking && result?.ok === false && result.kind === "invalid" && (
              <Badge variant="danger" size="sm" dot>
                {t.issues(result.issues.length)}
              </Badge>
            )}
          </span>
        )}
      </OptionBar>

      {mode === "generate" ? (
        <DualPane
          input={sample}
          onInputChange={setSample}
          output={generated.text}
          error={generated.error}
          inputLabel={t.dataLabel}
          outputLabel={t.schemaOutput}
          inputPlaceholder={t.dataPlaceholder}
          outputHighlight={generated.text ? highlightJson(generated.text) : undefined}
          inputActions={
            <SampleButton onClick={() => setSample(SCHEMA_SAMPLE)} label={t.sample} />
          }
          outputActions={<CopyButton value={generated.text} />}
          onClear={() => setSample("")}
          inputFooter={<span>{sample.length}</span>}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <Pane label={t.dataLabel} className="border-b border-border lg:border-b-0 lg:border-r">
                <InputArea
                  value={data}
                  onChange={(e) => {
                    setData(e.target.value);
                    runCheck(schemaText, e.target.value);
                  }}
                  placeholder={t.dataPlaceholder}
                  aria-label={t.dataLabel}
                />
              </Pane>
              <Pane
                label={t.schemaLabel}
                actions={<SampleButton onClick={() => setSchemaText(SAMPLE_SCHEMA)} />}
              >
                <InputArea
                  value={schemaText}
                  onChange={(e) => {
                    setSchemaText(e.target.value);
                    runCheck(e.target.value, data);
                  }}
                  placeholder={t.schemaPlaceholder}
                  aria-label={t.schemaLabel}
                />
              </Pane>
            </div>
          </div>

          {result && !checking && (
            <>
              {result.ok ? (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-3 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  {t.valid}
                </div>
              ) : result.kind === "invalid" ? (
                <div className="rounded-lg border border-border bg-surface">
                  <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5 text-xs font-medium text-foreground">
                    <XCircle className="h-3.5 w-3.5 text-foreground-subtle" />
                    {t.invalid}
                    <span className="font-mono text-[11px] font-normal text-foreground-faint">
                      {t.issues(result.issues.length)}
                    </span>
                  </div>
                  <ul className="divide-y divide-border/60">
                    {result.issues.map((issue, index) => (
                      <li
                        key={`${issue.path}-${issue.keyword}-${index}`}
                        className="px-3.5 py-2 font-mono text-[11px] leading-relaxed text-foreground-muted"
                      >
                        {issueText(issue)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <ErrorNote>
                  {result.kind === "schema" ? `${t.schemaFailed}: ${result.message}` : result.message}
                </ErrorNote>
              )}
            </>
          )}
        </>
      )}

      <p className="flex items-start gap-1.5 text-xs leading-relaxed text-foreground-subtle">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t.note}
      </p>
    </div>
  );
}
