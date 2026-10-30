"use client";

import * as React from "react";
import {
  dump,
  load,
} from "js-yaml";
import {
  highlightJson,
} from "@/lib/encoding";
import {
  useCopy,
} from "@/components/locale-provider";
import {
  DualPane,
  OptionBar,
  Segmented,
  Stats,
  Toggle,
  SampleButton,
} from "@/components/tools/tool-ui";

type Mode = "yaml2json" | "json2yaml";

const COPY = {
  zh: {
    yamlPlaceholder: "粘贴 YAML 配置…",
    jsonPlaceholder: "粘贴 JSON…",
    indent: "缩进",
    twoSpaces: "2 空格",
    fourSpaces: "4 空格",
    sortKeys: "按 key 排序",
    sample: "示例",
    note: "使用 js-yaml 解析，支持锚点、多行字符串与注释；解析失败时会给出出错的行号与列号。",
    atLine: (line: number, column: number, message: string) =>
      `第 ${line} 行第 ${column} 列：${message}`,
  },
  en: {
    yamlPlaceholder: "Paste YAML…",
    jsonPlaceholder: "Paste JSON…",
    indent: "Indent",
    twoSpaces: "2 spaces",
    fourSpaces: "4 spaces",
    sortKeys: "Sort keys",
    sample: "Sample",
    note: "Parsed with js-yaml, so anchors, multi-line strings and comments all work. Parse errors report the exact line and column.",
    atLine: (line: number, column: number, message: string) =>
      `Line ${line}, column ${column}: ${message}`,
  },
};

const SAMPLE = `name: gongju
version: 0.1.0
features:
  - base64
  - yaml
nested:
  enabled: true
  count: 3
`;

const SAMPLE_JSON = JSON.stringify(
  { name: "gongju", features: ["yaml", "json"], nested: { count: 3 } },
  null,
  2
);

interface YamlError extends Error {
  mark?: { line: number; column: number };
}

function formatYamlError(
  e: unknown,
  atLine: (line: number, column: number, message: string) => string
): string {
  if (e instanceof Error) {
    const mark = (e as YamlError).mark;
    if (mark) return atLine(mark.line + 1, mark.column + 1, e.message);
    return e.message;
  }
  return String(e);
}

export function YamlTool() {
  const t = useCopy(COPY);
  const [input, setInput] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("yaml2json");
  const [indent, setIndent] = React.useState(2);
  const [sortKeys, setSortKeys] = React.useState(false);

  const result = React.useMemo(() => {
    if (!input.trim()) return { value: "", error: null as string | null };
    try {
      if (mode === "yaml2json") {
        const data = load(input);
        return { value: JSON.stringify(data ?? null, null, indent), error: null };
      }
      const parsed = JSON.parse(input);
      return {
        value: dump(parsed, { indent, lineWidth: -1, noRefs: true, sortKeys }),
        error: null,
      };
    } catch (e) {
      return { value: "", error: formatYamlError(e, t.atLine) };
    }
  }, [input, mode, indent, sortKeys, t]);

  const swap = () => {
    if (result.value) setInput(result.value);
    setMode((m) => (m === "yaml2json" ? "json2yaml" : "yaml2json"));
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel="YAML"
          value={mode}
          onChange={setMode}
          options={[
            { value: "yaml2json", label: "YAML → JSON" },
            { value: "json2yaml", label: "JSON → YAML" },
          ]}
        />
        <Segmented
          ariaLabel={t.indent}
          value={String(indent)}
          onChange={(v) => setIndent(Number(v))}
          options={[
            { value: "2", label: t.twoSpaces },
            { value: "4", label: t.fourSpaces },
          ]}
        />
        <Toggle checked={sortKeys} onChange={setSortKeys} label={t.sortKeys} />
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={result.value}
        error={result.error}
        inputLabel={mode === "yaml2json" ? "YAML" : "JSON"}
        outputLabel={mode === "yaml2json" ? "JSON" : "YAML"}
        inputPlaceholder={mode === "yaml2json" ? t.yamlPlaceholder : t.jsonPlaceholder}
        inputActions={
          <SampleButton onClick={() => setInput(mode === "yaml2json" ? SAMPLE : SAMPLE_JSON)} />
        }
        onClear={() => setInput("")}
        onSwap={swap}
        inputFooter={<Stats text={input} />}
        outputFooter={result.value ? <Stats text={result.value} /> : null}
        outputHighlight={
          mode === "yaml2json" && result.value ? highlightJson(result.value) : undefined
        }
      />

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
