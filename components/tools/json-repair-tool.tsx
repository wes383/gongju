"use client";

import * as React from "react";
import { Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CopyButton, DualPane, SampleButton, Stats } from "@/components/tools/tool-ui";
import { useCopy } from "@/components/locale-provider";
import { formatRepaired, repairJson, type RepairCode } from "@/lib/json-repair";

const COPY = {
  zh: {
    input: "原始 JSON",
    output: "修复后",
    sample: "示例",
    repairs: (count: number) => `已修复 ${count} 处`,
    clean: "这段 JSON 本来就是合法的，没有改动",
    errorAt: (line: number, column: number, message: string) =>
      `第 ${line} 行第 ${column} 列：${message}`,
    labels: {
      bom: "去 BOM",
      comment: "去注释",
      "single-quote": "单引号",
      "full-width": "全角标点",
      "unquoted-key": "补引号（键）",
      "unquoted-value": "补引号（值）",
      "trailing-comma": "尾逗号",
      "missing-comma": "补逗号",
      "python-literal": "Python 字面量",
      "number-format": "数字格式",
      unclosed: "补全括号",
    } as Record<RepairCode, string>,
    note: "修复在本地完成：先尝试标准解析，失败后才按常见错误逐项修正，并列出改动。解析不了时会给出出错的行列。",
  },
  en: {
    input: "Broken JSON",
    output: "Repaired",
    sample: "Sample",
    repairs: (count: number) => `${count} fix${count > 1 ? "es" : ""} applied`,
    clean: "This JSON was already valid — nothing changed",
    errorAt: (line: number, column: number, message: string) =>
      `Line ${line}, column ${column}: ${message}`,
    labels: {
      bom: "BOM",
      comment: "Comments",
      "single-quote": "Single quotes",
      "full-width": "Full-width punctuation",
      "unquoted-key": "Quoted keys",
      "unquoted-value": "Quoted values",
      "trailing-comma": "Trailing comma",
      "missing-comma": "Missing comma",
      "python-literal": "Python literals",
      "number-format": "Number format",
      unclosed: "Closed brackets",
    } as Record<RepairCode, string>,
    note: "Repair runs locally: strict parsing first, then a set of targeted fixes, each one reported. When parsing still fails you get the exact line and column.",
  },
};

const SAMPLE = `{
  // 用户信息
  id: 1,
  name: 'Alice',
  tags: ['admin', 'dev',],
  active: True,
}`;

export function JsonRepairTool() {
  const t = useCopy(COPY);
  const [input, setInput] = React.useState("");

  const result = React.useMemo(() => repairJson(input), [input]);
  const output = input.trim() === "" || result.error ? "" : formatRepaired(result.value);

  const error = result.error
    ? new Error(t.errorAt(result.error.line, result.error.column, result.error.message))
    : null;

  return (
    <div className="flex flex-col gap-4">
      <DualPane
        input={input}
        onInputChange={setInput}
        output={output}
        error={error}
        inputLabel={t.input}
        outputLabel={t.output}
        inputPlaceholder={'{"a": 1,}'}
        inputActions={<SampleButton onClick={() => setInput(SAMPLE)} label={t.sample} />}
        onClear={() => setInput("")}
        inputFooter={<Stats text={input} />}
        outputFooter={output ? <Stats text={output} /> : null}
        scrollOutput
      />

      {input.trim() !== "" && !error && (
        <div className="flex flex-wrap items-center gap-2">
          {result.repairs.length === 0 ? (
            <Badge variant="success" size="sm" dot>
              {t.clean}
            </Badge>
          ) : (
            <>
              <span className="text-xs text-foreground-muted">{t.repairs(result.repairs.length)}</span>
              {result.repairs.map((code) => (
                <Badge key={code} variant="info" size="sm">
                  {t.labels[code]}
                </Badge>
              ))}
            </>
          )}
          <CopyButton value={output} className="ml-auto" />
        </div>
      )}

      <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-foreground-faint">
        <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t.note}
      </p>
    </div>
  );
}
