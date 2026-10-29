"use client";

import * as React from "react";
import { dump, load } from "js-yaml";
import { highlightJson } from "@/lib/encoding";
import {
  DualPane,
  OptionBar,
  PaneButton,
  Segmented,
  Stats,
  Toggle,
} from "@/components/tools/tool-ui";

type Mode = "yaml2json" | "json2yaml";

const SAMPLE = `name: gongju
version: 0.1.0
features:
  - base64
  - yaml
nested:
  enabled: true
  count: 3
`;

interface YamlError extends Error {
  mark?: { line: number; column: number };
}

function formatError(e: unknown): string {
  if (e instanceof Error) {
    const mark = (e as YamlError).mark;
    if (mark) return `第 ${mark.line + 1} 行第 ${mark.column + 1} 列：${e.message}`;
    return e.message;
  }
  return String(e);
}

export function YamlTool() {
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
      return { value: "", error: formatError(e) };
    }
  }, [input, mode, indent, sortKeys]);

  const swap = () => {
    if (result.value) setInput(result.value);
    setMode((m) => (m === "yaml2json" ? "json2yaml" : "yaml2json"));
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel="转换方向"
          value={mode}
          onChange={setMode}
          options={[
            { value: "yaml2json", label: "YAML → JSON" },
            { value: "json2yaml", label: "JSON → YAML" },
          ]}
        />
        <Segmented
          ariaLabel="缩进"
          value={String(indent)}
          onChange={(v) => setIndent(Number(v))}
          options={[
            { value: "2", label: "2 空格" },
            { value: "4", label: "4 空格" },
          ]}
        />
        <Toggle checked={sortKeys} onChange={setSortKeys} label="按 key 排序" />
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={result.value}
        error={result.error}
        inputLabel={mode === "yaml2json" ? "YAML" : "JSON"}
        outputLabel={mode === "yaml2json" ? "JSON" : "YAML"}
        inputPlaceholder={mode === "yaml2json" ? "粘贴 YAML 配置…" : "粘贴 JSON…"}
        inputActions={
          <PaneButton
            onClick={() =>
              setInput(
                mode === "yaml2json"
                  ? SAMPLE
                  : JSON.stringify({ name: "gongju", features: ["yaml", "json"], nested: { count: 3 } }, null, 2)
              )
            }
          >
            示例
          </PaneButton>
        }
        onClear={() => setInput("")}
        onSwap={swap}
        inputFooter={<Stats text={input} />}
        outputFooter={result.value ? <Stats text={result.value} /> : null}
        outputHighlight={
          mode === "yaml2json" && result.value ? highlightJson(result.value) : undefined
        }
      />

      <p className="text-xs leading-relaxed text-foreground-subtle">
        使用 js-yaml 解析，支持锚点、多行字符串与注释；解析失败时会给出出错的行号与列号。
      </p>
    </div>
  );
}
