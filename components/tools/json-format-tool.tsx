"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { highlightJson } from "@/lib/encoding";
import { countNodes, isPlainObject, JSON_SAMPLE, jsonDepth, parseJson, sortKeysDeep } from "@/lib/json";
import { useCopy, useT } from "@/components/locale-provider";
import {
  DualPane,
  OptionBar,
  PaneButton,
  Segmented,
  Toggle,
} from "@/components/tools/tool-ui";
import { Badge } from "@/components/ui/badge";

type Indent = "2" | "4" | "tab";

const COPY = {
  zh: {
    indent: "缩进",
    twoSpaces: "2 空格",
    fourSpaces: "4 空格",
    tab: "Tab",
    minify: "压缩为一行",
    sortKeys: "按 key 排序",
    sample: "示例",
    inputLabel: "JSON",
    outputLabel: "结果",
    inputPlaceholder: "粘贴 JSON…",
    keys: "键",
    depth: "深度",
    nodes: "节点",
  },
  en: {
    indent: "Indent",
    twoSpaces: "2 spaces",
    fourSpaces: "4 spaces",
    tab: "Tab",
    minify: "Minify",
    sortKeys: "Sort keys",
    sample: "Sample",
    inputLabel: "JSON",
    outputLabel: "Result",
    inputPlaceholder: "Paste JSON…",
    keys: "keys",
    depth: "depth",
    nodes: "nodes",
  },
};

function countKeys(value: unknown): number {
  if (Array.isArray(value)) return value.reduce<number>((n, v) => n + countKeys(v), 0);
  if (isPlainObject(value)) {
    return (
      Object.keys(value).length +
      Object.values(value).reduce<number>((n, v) => n + countKeys(v), 0)
    );
  }
  return 0;
}

export function JsonFormatTool() {
  const t = useCopy(COPY);
  const shared = useT();
  const [input, setInput] = React.useState("");
  const [indent, setIndent] = React.useState<Indent>("2");
  const [minify, setMinify] = React.useState(false);
  const [sortKeys, setSortKeys] = React.useState(false);

  const result = React.useMemo(() => {
    if (!input.trim()) {
      return { value: "", error: null as string | null, valid: null as boolean | null, stats: null };
    }
    const parsed = parseJson(input);
    if (!parsed.ok) {
      return {
        value: "",
        error: shared.syntaxError(parsed.line ?? null, parsed.column ?? null, parsed.message),
        valid: false,
        stats: null,
      };
    }
    const data = sortKeys ? sortKeysDeep(parsed.value) : parsed.value;
    const text = minify
      ? JSON.stringify(data)
      : JSON.stringify(data, null, indent === "tab" ? "\t" : Number(indent));
    return {
      value: text,
      error: null,
      valid: true,
      stats: { keys: countKeys(data), depth: jsonDepth(data), nodes: countNodes(data) },
    };
  }, [input, indent, minify, sortKeys, shared]);

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.indent}
          value={indent}
          onChange={setIndent}
          options={[
            { value: "2", label: t.twoSpaces },
            { value: "4", label: t.fourSpaces },
            { value: "tab", label: t.tab },
          ]}
        />
        <Toggle checked={minify} onChange={setMinify} label={t.minify} />
        <Toggle checked={sortKeys} onChange={setSortKeys} label={t.sortKeys} />
        {result.valid !== null && (
          <Badge
            variant={result.valid ? "success" : "danger"}
            size="sm"
            dot
            className="ml-auto"
          >
            {result.valid ? shared.valid : shared.invalid}
          </Badge>
        )}
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={result.value}
        error={result.error}
        inputLabel={t.inputLabel}
        outputLabel={t.outputLabel}
        inputPlaceholder={t.inputPlaceholder}
        outputHighlight={result.value ? highlightJson(result.value) : undefined}
        inputActions={
          <PaneButton onClick={() => setInput(JSON_SAMPLE)} title={t.sample}>
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t.sample}</span>
          </PaneButton>
        }
        onClear={() => setInput("")}
        inputFooter={<span>{input.length}</span>}
        outputFooter={
          result.stats ? (
            <>
              <span>
                {result.stats.keys} {t.keys}
              </span>
              <span>
                {t.depth} {result.stats.depth}
              </span>
              <span>
                {result.stats.nodes} {t.nodes}
              </span>
            </>
          ) : null
        }
      />
    </div>
  );
}
