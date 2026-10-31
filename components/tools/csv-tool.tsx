"use client";

import * as React from "react";
import Papa from "papaparse";
import {
  highlightJson,
} from "@/lib/encoding";
import {
  useCopy,
  useLocale,
} from "@/components/locale-provider";
import {
  DualPane,
  OptionBar,
  SampleButton,
  Segmented,
  Stats,
  Toggle,
  WarningNote,
} from "@/components/tools/tool-ui";

type Mode = "csv2json" | "json2csv";
type Delimiter = "auto" | "," | ";" | "\t" | " " | "|";

const COPY = {
  zh: {
    auto: "自动检测",
    autoHint: "按首行内容推断分隔符（, ; Tab |）",
    autoHintJson: "导出时使用逗号",
    comma: "逗号",
    semicolon: "分号",
    tab: "Tab",
    space: "空格",
    pipe: "竖线",
    delimiter: "分隔符",
    header: "首行为表头",
    headerHint: "关闭后输出二维数组",
    dynamicTyping: "自动类型推断",
    dynamicTypingHint: "把数字、布尔值从字符串转成对应类型",
    indent: "缩进",
    twoSpaces: "2 空格",
    fourSpaces: "4 空格",
    csvPlaceholder: "粘贴 CSV / TSV 内容…",
    jsonPlaceholder: '粘贴 JSON 数组，例如 [{"a":1}]',
    sample: "示例",
    emptyRows: "没有解析出任何数据行",
    notArray: 'JSON 转 CSV 需要顶层是数组，例如 [{ "a": 1 }]',
    emptyArray: "数组为空，没有可导出的数据",
    rowLabel: (row: number) => `（第 ${row} 行）`,
    note: "使用 Papa Parse，能正确处理引号、字段内换行与转义双引号。",
    noteAuto: " 分隔符设为「自动检测」时会根据首行内容推断。",
    autoWarning:
      "无法自动识别分隔符，已按逗号解析。如果每行只有一列，试试选「空格」或「Tab」。",
  },
  en: {
    auto: "Auto",
    autoHint: "Detect the delimiter from the first row",
    autoHintJson: "Falls back to a comma when exporting",
    comma: "Comma",
    semicolon: "Semicolon",
    tab: "Tab",
    space: "Space",
    pipe: "Pipe",
    delimiter: "Delimiter",
    header: "First row is header",
    headerHint: "Turn off to get an array of arrays",
    dynamicTyping: "Infer types",
    dynamicTypingHint: "Convert numbers and booleans from strings to real types",
    indent: "Indent",
    twoSpaces: "2 spaces",
    fourSpaces: "4 spaces",
    csvPlaceholder: "Paste CSV / TSV content…",
    jsonPlaceholder: 'Paste a JSON array, e.g. [{"a":1}]',
    sample: "Sample",
    emptyRows: "No data rows could be parsed",
    notArray: 'Converting to CSV needs a top-level array, e.g. [{ "a": 1 }]',
    emptyArray: "The array is empty, nothing to export",
    rowLabel: (row: number) => ` (row ${row})`,
    note: "Powered by Papa Parse, so quotes, embedded newlines and escaped quotes are handled correctly.",
    noteAuto: " With the delimiter set to Auto it is inferred from the first row.",
    autoWarning:
      "Could not detect the delimiter, so the input was parsed with a comma. If every row ends up as a single column, try Space or Tab.",
  },
};

const SAMPLE_CSV = (role1: string, role2: string, fullStack: string) => `name,role,stars
Alice,${role1},5
Bob,${role2},4
"Carol, Jr.",${fullStack},5`;

const SAMPLE_JSON = (role1: string, role2: string) =>
  JSON.stringify(
    [
      { name: "Alice", role: role1, stars: 5 },
      { name: "Bob", role: role2, stars: 4 },
    ],
    null,
    2
  );

export function CsvTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [input, setInput] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("csv2json");
  const [delimiter, setDelimiter] = React.useState<Delimiter>("auto");
  const [header, setHeader] = React.useState(true);
  const [dynamicTyping, setDynamicTyping] = React.useState(true);
  const [indent, setIndent] = React.useState(2);

  const result = React.useMemo(() => {
    if (!input.trim()) {
      return { value: "", error: null as string | null, warning: null as string | null };
    }

    try {
      if (mode === "csv2json") {
        const parsed = Papa.parse(input, {
          header,
          skipEmptyLines: "greedy",
          dynamicTyping,
          delimiter: delimiter === "auto" ? undefined : delimiter,
        });

        const quoteError = parsed.errors.find((e) => e.type === "Quotes");
        if (quoteError) {
          return {
            value: "",
            error: `${quoteError.message}${
              typeof quoteError.row === "number" ? t.rowLabel(quoteError.row + 1) : ""
            }`,
            warning: null,
          };
        }
        if (parsed.data.length === 0) {
          return { value: "", error: t.emptyRows, warning: null };
        }
        // Papa still returns usable rows here, it just fell back to a comma
        const autoFailed = parsed.errors.some((e) => e.code === "UndetectableDelimiter");
        return {
          value: JSON.stringify(parsed.data, null, indent),
          error: null,
          warning: autoFailed ? t.autoWarning : null,
        };
      }

      const parsed = JSON.parse(input);
      if (!Array.isArray(parsed)) {
        return { value: "", error: t.notArray, warning: null };
      }
      if (parsed.length === 0) return { value: "", error: t.emptyArray, warning: null };

      const csv = Papa.unparse(parsed, {
        delimiter: delimiter === "auto" ? "," : delimiter,
        header: true,
      });
      return { value: csv, error: null, warning: null };
    } catch (e) {
      return {
        value: "",
        error: e instanceof Error ? e.message : String(e),
        warning: null,
      };
    }
  }, [input, mode, delimiter, header, dynamicTyping, indent, t]);

  const swap = () => {
    if (result.value) setInput(result.value);
    setMode((m) => (m === "csv2json" ? "json2csv" : "csv2json"));
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel="CSV"
          value={mode}
          onChange={setMode}
          options={[
            { value: "csv2json", label: "CSV → JSON" },
            { value: "json2csv", label: "JSON → CSV" },
          ]}
        />
        <span className="text-xs font-medium text-foreground-muted">{t.delimiter}</span>
        <Segmented
          ariaLabel={t.delimiter}
          value={delimiter}
          onChange={setDelimiter}
          options={[
            {
              value: "auto",
              label: t.auto,
              hint: mode === "csv2json" ? t.autoHint : t.autoHintJson,
            },
            { value: ",", label: t.comma },
            { value: ";", label: t.semicolon },
            { value: "\t", label: t.tab },
            { value: " ", label: t.space },
            { value: "|", label: t.pipe },
          ]}
        />
        {mode === "csv2json" ? (
          <>
            <Toggle
              checked={header}
              onChange={setHeader}
              label={t.header}
              hint={t.headerHint}
            />
            <Toggle
              checked={dynamicTyping}
              onChange={setDynamicTyping}
              label={t.dynamicTyping}
              hint={t.dynamicTypingHint}
            />
          </>
        ) : (
          <Segmented
            ariaLabel={t.indent}
            value={String(indent)}
            onChange={(v) => setIndent(Number(v))}
            options={[
              { value: "2", label: t.twoSpaces },
              { value: "4", label: t.fourSpaces },
            ]}
          />
        )}
      </OptionBar>

      {result.warning && <WarningNote>{result.warning}</WarningNote>}

      <DualPane
        input={input}
        onInputChange={setInput}
        output={result.value}
        error={result.error}
        inputLabel={mode === "csv2json" ? "CSV" : "JSON"}
        outputLabel={mode === "csv2json" ? "JSON" : "CSV"}
        inputPlaceholder={mode === "csv2json" ? t.csvPlaceholder : t.jsonPlaceholder}
        inputActions={
          <SampleButton onClick={() =>
              setInput(
                mode === "csv2json"
                  ? locale === "zh"
                    ? SAMPLE_CSV("前端", "后端", "全栈")
                    : SAMPLE_CSV("Frontend", "Backend", "Full stack")
                  : locale === "zh"
                    ? SAMPLE_JSON("前端", "后端")
                    : SAMPLE_JSON("Frontend", "Backend")
              )
            } />
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
        {t.note}
        {mode === "csv2json" && t.noteAuto}
      </p>
    </div>
  );
}
