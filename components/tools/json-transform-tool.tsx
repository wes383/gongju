"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { highlightJson } from "@/lib/encoding";
import {
  dedupeArray,
  flattenJson,
  isPlainObject,
  JSON_SAMPLE,
  parseJson,
  sortKeysDeep,
  unflattenJson,
} from "@/lib/json";
import { useCopy, useT } from "@/components/locale-provider";
import {
  DualPane,
  OptionBar,
  PaneButton,
  Segmented,
  Toggle,
} from "@/components/tools/tool-ui";
import { Input } from "@/components/ui/input";

type Operation = "sort" | "dedupe" | "flatten" | "unflatten";

const COPY = {
  zh: {
    sort: "按 key 排序",
    dedupe: "数组去重",
    flatten: "扁平化",
    unflatten: "还原扁平结构",
    separator: "分隔符",
    arrayIndex: "数组按下标展开",
    arrayIndexHint: "把 [1,2] 展开成 tags[0]、tags[1]",
    inputLabel: "JSON",
    outputLabel: "结果",
    sample: "示例",
    dedupePlaceholder: '粘贴 JSON 数组，例如 [{ "id": 1 }, { "id": 1 }]',
    flattenPlaceholder: '粘贴 JSON 对象，例如 { "a": { "b": 1 } }',
    unflattenPlaceholder: '粘贴扁平对象，例如 { "a.b": 1 }',
    notArray: "数组去重需要顶层是数组",
    notObject: "扁平化需要顶层是对象",
    removed: (n: number) => `去掉了 ${n} 条`,
    items: (n: number) => `${n} 项`,
  },
  en: {
    sort: "Sort keys",
    dedupe: "Dedupe array",
    flatten: "Flatten",
    unflatten: "Unflatten",
    separator: "Separator",
    arrayIndex: "Expand arrays by index",
    arrayIndexHint: "Turn [1,2] into tags[0] and tags[1]",
    inputLabel: "JSON",
    outputLabel: "Result",
    sample: "Sample",
    dedupePlaceholder: 'Paste a JSON array, e.g. [{ "id": 1 }, { "id": 1 }]',
    flattenPlaceholder: 'Paste a JSON object, e.g. { "a": { "b": 1 } }',
    unflattenPlaceholder: 'Paste a flat object, e.g. { "a.b": 1 }',
    notArray: "Dedupe needs a top-level array",
    notObject: "Flatten needs a top-level object",
    removed: (n: number) => `${n} duplicates removed`,
    items: (n: number) => `${n} items`,
  },
};

const SAMPLE_DUPLICATE = `[
  { "id": 1, "name": "alpha" },
  { "id": 2, "name": "beta" },
  { "id": 1, "name": "alpha" },
  { "id": 3, "name": "gamma" }
]`;

const SAMPLE_FLAT = `{
  "user.name": "dev",
  "user.contact.email": "dev@example.com",
  "active": true
}`;

export function JsonTransformTool() {
  const t = useCopy(COPY);
  const shared = useT();
  const [input, setInput] = React.useState("");
  const [operation, setOperation] = React.useState<Operation>("sort");
  const [separator, setSeparator] = React.useState(".");
  const [arrayIndex, setArrayIndex] = React.useState(false);

  const result = React.useMemo(() => {
    if (!input.trim()) return { value: "", error: null as string | null, note: "" };
    const parsed = parseJson(input);
    if (!parsed.ok) {
      return {
        value: "",
        error: shared.syntaxError(parsed.line ?? null, parsed.column ?? null, parsed.message),
        note: "",
      };
    }

    const data = parsed.value;
    try {
      if (operation === "sort") {
        return { value: JSON.stringify(sortKeysDeep(data), null, 2), error: null, note: "" };
      }
      if (operation === "dedupe") {
        if (!Array.isArray(data)) return { value: "", error: t.notArray, note: "" };
        const unique = dedupeArray(data);
        return {
          value: JSON.stringify(unique, null, 2),
          error: null,
          note: t.removed(data.length - unique.length),
        };
      }
      if (operation === "flatten") {
        if (!isPlainObject(data)) return { value: "", error: t.notObject, note: "" };
        const flat = flattenJson(data, separator || ".", arrayIndex ? "index" : "keep");
        return {
          value: JSON.stringify(flat, null, 2),
          error: null,
          note: t.items(Object.keys(flat).length),
        };
      }
      if (!isPlainObject(data)) return { value: "", error: t.notObject, note: "" };
      const nested = unflattenJson(data as Record<string, unknown>, separator || ".");
      return { value: JSON.stringify(nested, null, 2), error: null, note: "" };
    } catch (e) {
      return { value: "", error: e instanceof Error ? e.message : String(e), note: "" };
    }
  }, [input, operation, separator, arrayIndex, shared, t]);

  const placeholder =
    operation === "dedupe"
      ? t.dedupePlaceholder
      : operation === "unflatten"
        ? t.unflattenPlaceholder
        : t.flattenPlaceholder;

  const sample = () => {
    if (operation === "dedupe") return SAMPLE_DUPLICATE;
    if (operation === "unflatten") return SAMPLE_FLAT;
    return JSON_SAMPLE;
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.outputLabel}
          value={operation}
          onChange={setOperation}
          options={[
            { value: "sort", label: t.sort },
            { value: "dedupe", label: t.dedupe },
            { value: "flatten", label: t.flatten },
            { value: "unflatten", label: t.unflatten },
          ]}
        />
        {(operation === "flatten" || operation === "unflatten") && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground-muted">{t.separator}</span>
            <Input
              value={separator}
              onChange={(e) => setSeparator(e.target.value)}
              aria-label={t.separator}
              spellCheck={false}
              size="xs"
              className="w-16 text-center font-mono"
            />
          </div>
        )}
        {operation === "flatten" && (
          <Toggle
            checked={arrayIndex}
            onChange={setArrayIndex}
            label={t.arrayIndex}
            hint={t.arrayIndexHint}
          />
        )}
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={result.value}
        error={result.error}
        inputLabel={t.inputLabel}
        outputLabel={t.outputLabel}
        inputPlaceholder={placeholder}
        outputHighlight={result.value ? highlightJson(result.value) : undefined}
        inputActions={
          <PaneButton onClick={() => setInput(sample())} title={t.sample}>
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t.sample}</span>
          </PaneButton>
        }
        onClear={() => setInput("")}
        inputFooter={<span>{input.length}</span>}
        outputFooter={result.note ? <span>{result.note}</span> : null}
      />
    </div>
  );
}
