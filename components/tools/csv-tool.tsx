"use client";

import * as React from "react";
import Papa from "papaparse";
import { highlightJson } from "@/lib/encoding";
import { DualPane, OptionBar, PaneButton, Segmented, Stats, Toggle } from "@/components/tools/tool-ui";

type Mode = "csv2json" | "json2csv";
type Delimiter = "auto" | "," | ";" | "\t" | "|";

const SAMPLE = `name,role,stars
Alice,前端,5
Bob,后端,4
"Carol, Jr.",全栈,5`;

const DELIMITER_LABEL: Record<Delimiter, string> = {
  auto: "自动",
  ",": "逗号",
  ";": "分号",
  "\t": "Tab",
  "|": "竖线",
};

export function CsvTool() {
  const [input, setInput] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("csv2json");
  const [delimiter, setDelimiter] = React.useState<Delimiter>("auto");
  const [header, setHeader] = React.useState(true);
  const [dynamicTyping, setDynamicTyping] = React.useState(true);
  const [indent, setIndent] = React.useState(2);

  const result = React.useMemo(() => {
    if (!input.trim()) return { value: "", error: null as string | null };

    try {
      if (mode === "csv2json") {
        const parsed = Papa.parse(input, {
          header,
          skipEmptyLines: "greedy",
          dynamicTyping,
          delimiter: delimiter === "auto" ? undefined : delimiter,
        });

        const fatal = parsed.errors.find((e) => e.type === "Quotes" || e.code === "UndetectableDelimiter");
        if (fatal) {
          return {
            value: "",
            error: `${fatal.message}${typeof fatal.row === "number" ? `（第 ${fatal.row + 1} 行）` : ""}`,
          };
        }
        if (parsed.data.length === 0) {
          return { value: "", error: "没有解析出任何数据行" };
        }
        return { value: JSON.stringify(parsed.data, null, indent), error: null };
      }

      const parsed = JSON.parse(input);
      if (!Array.isArray(parsed)) {
        return { value: "", error: "JSON 转 CSV 需要顶层是数组，例如 [{ \"a\": 1 }]" };
      }
      if (parsed.length === 0) return { value: "", error: "数组为空，没有可导出的数据" };

      const csv = Papa.unparse(parsed, {
        delimiter: delimiter === "auto" ? "," : delimiter,
        header: true,
      });
      return { value: csv, error: null };
    } catch (e) {
      return { value: "", error: e instanceof Error ? e.message : String(e) };
    }
  }, [input, mode, delimiter, header, dynamicTyping, indent]);

  const swap = () => {
    if (result.value) setInput(result.value);
    setMode((m) => (m === "csv2json" ? "json2csv" : "csv2json"));
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel="转换方向"
          value={mode}
          onChange={setMode}
          options={[
            { value: "csv2json", label: "CSV → JSON" },
            { value: "json2csv", label: "JSON → CSV" },
          ]}
        />
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground-muted">分隔符</span>
          <select
            value={delimiter}
            onChange={(e) => setDelimiter(e.target.value as Delimiter)}
            aria-label="分隔符"
            className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-foreground focus:border-border-strong focus:outline-none"
          >
            {(Object.keys(DELIMITER_LABEL) as Delimiter[]).map((d) => (
              <option key={d} value={d}>
                {DELIMITER_LABEL[d]}
              </option>
            ))}
          </select>
        </div>
        {mode === "csv2json" ? (
          <>
            <Toggle
              checked={header}
              onChange={setHeader}
              label="首行为表头"
              hint="关闭后输出二维数组"
            />
            <Toggle
              checked={dynamicTyping}
              onChange={setDynamicTyping}
              label="自动类型推断"
              hint="把数字、布尔值从字符串转成对应类型"
            />
          </>
        ) : (
          <Segmented
            ariaLabel="缩进"
            value={String(indent)}
            onChange={(v) => setIndent(Number(v))}
            options={[
              { value: "2", label: "2 空格" },
              { value: "4", label: "4 空格" },
            ]}
          />
        )}
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={result.value}
        error={result.error}
        inputLabel={mode === "csv2json" ? "CSV" : "JSON"}
        outputLabel={mode === "csv2json" ? "JSON" : "CSV"}
        inputPlaceholder={
          mode === "csv2json" ? "粘贴 CSV / TSV 内容…" : '粘贴 JSON 数组，例如 [{"a":1}]'
        }
        inputActions={
          <PaneButton
            onClick={() =>
              setInput(
                mode === "csv2json"
                  ? SAMPLE
                  : JSON.stringify(
                      [
                        { name: "Alice", role: "前端", stars: 5 },
                        { name: "Bob", role: "后端", stars: 4 },
                      ],
                      null,
                      2
                    )
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
          mode === "csv2json" && result.value ? highlightJson(result.value) : undefined
        }
      />

      <p className="text-xs leading-relaxed text-foreground-subtle">
        使用 Papa Parse，能正确处理引号、字段内换行与转义双引号。
        {mode === "csv2json" && " 分隔符设为「自动」时会根据首行内容推断。"}
      </p>
    </div>
  );
}
