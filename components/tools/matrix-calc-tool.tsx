"use client";

import * as React from "react";
import { useCopy, useLocale } from "@/components/locale-provider";
import {
  ClearButton,
  ErrorNote,
  InputArea,
  OptionBar,
  OptionField,
  OutputArea,
  Pane,
  SampleButton,
  Segmented,
} from "@/components/tools/tool-ui";
import { errorText, safe } from "@/lib/errors";
import {
  add,
  determinant,
  formatCell,
  formatMatrix,
  inverse,
  multiply,
  parseMatrix,
  rank,
  subtract,
  trace,
  transpose,
  type Matrix,
} from "@/lib/matrix";

type Op =
  | "multiply"
  | "add"
  | "subtract"
  | "transpose"
  | "inverse"
  | "determinant"
  | "rank"
  | "trace";

const OPS: { value: Op; label: { zh: string; en: string }; needsB: boolean }[] = [
  { value: "multiply", label: { zh: "A × B", en: "A × B" }, needsB: true },
  { value: "add", label: { zh: "A + B", en: "A + B" }, needsB: true },
  { value: "subtract", label: { zh: "A − B", en: "A − B" }, needsB: true },
  { value: "transpose", label: { zh: "转置 Aᵀ", en: "Transpose Aᵀ" }, needsB: false },
  { value: "inverse", label: { zh: "逆 A⁻¹", en: "Inverse A⁻¹" }, needsB: false },
  { value: "determinant", label: { zh: "行列式", en: "Determinant" }, needsB: false },
  { value: "rank", label: { zh: "秩", en: "Rank" }, needsB: false },
  { value: "trace", label: { zh: "迹", en: "Trace" }, needsB: false },
];

const COPY = {
  zh: {
    operation: "运算",
    matrixA: "矩阵 A",
    matrixB: "矩阵 B",
    result: "结果",
    dimensions: (a: string, b: string) => `A: ${a}　B: ${b}`,
    rows: (n: number) => `${n} 行`,
    placeholder: "每行一组，值用空格或逗号分开",
    sample: "示例",
    clear: "清空",
    hint: "换行或分号分行，空格或逗号分列；也可以直接粘贴 [1, 2; 3, 4]。除 A × B 外的运算都要求 A 是方阵。",
    note: "行列式用部分主元消元，逆矩阵用高斯-约当消元；奇异矩阵直接报错，不会给出被放大的舍入误差。全部计算在浏览器内完成，数字不会上传。",
    empty: "在左侧输入矩阵后这里显示结果",
  },
  en: {
    operation: "Operation",
    matrixA: "Matrix A",
    matrixB: "Matrix B",
    result: "Result",
    dimensions: (a: string, b: string) => `A: ${a}　B: ${b}`,
    rows: (n: number) => `${n} row${n === 1 ? "" : "s"}`,
    placeholder: "One row per line; separate values with spaces or commas",
    sample: "Sample",
    clear: "Clear",
    hint: "Rows split on newlines or semicolons, values on spaces or commas — pasting [1, 2; 3, 4] works too. Every operation except A × B needs A to be square.",
    note: "The determinant uses partial-pivot elimination and the inverse uses Gauss-Jordan; a singular matrix raises an error instead of returning amplified rounding noise. Everything runs in your browser, the numbers are never uploaded.",
    empty: "Enter a matrix on the left and the result appears here",
  },
};

const SAMPLE_A = "4, 7\n2, 6";
const SAMPLE_B = "1, 2\n3, 4";

function describe(m: Matrix): string {
  return `${m.rows} × ${m.cols}`;
}

export function MatrixCalcTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [op, setOp] = React.useState<Op>("multiply");
  const [inputA, setInputA] = React.useState(SAMPLE_A);
  const [inputB, setInputB] = React.useState(SAMPLE_B);

  const needsB = OPS.find((item) => item.value === op)?.needsB ?? false;

  const shapeA = React.useMemo(() => {
    const parsed = safe(() => parseMatrix(inputA));
    return parsed.value ? describe(parsed.value) : "—";
  }, [inputA]);

  const shapeB = React.useMemo(() => {
    if (!needsB) return "—";
    const parsed = safe(() => parseMatrix(inputB));
    return parsed.value ? describe(parsed.value) : "—";
  }, [inputB, needsB]);

  const outcome = React.useMemo(() => {
    if (!inputA.trim()) return { value: "", error: null };
    const run = safe(() => {
      const a = parseMatrix(inputA);
      switch (op) {
        case "transpose":
          return formatMatrix(transpose(a));
        case "inverse":
          return formatMatrix(inverse(a));
        case "determinant":
          return formatCell(determinant(a));
        case "rank":
          return String(rank(a));
        case "trace":
          return formatCell(trace(a));
        default: {
          const b = parseMatrix(inputB);
          if (op === "multiply") return formatMatrix(multiply(a, b));
          if (op === "add") return formatMatrix(add(a, b));
          return formatMatrix(subtract(a, b));
        }
      }
    });
    return { value: run.value ?? "", error: run.error };
  }, [inputA, inputB, op]);

  const message = outcome.error ? errorText(outcome.error, locale) : "";

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.operation}>
          <div className="max-w-full overflow-x-auto">
            <Segmented
              ariaLabel={t.operation}
              value={op}
              onChange={setOp}
              options={OPS.map((item) => ({ value: item.value, label: item.label[locale] }))}
            />
          </div>
        </OptionField>
        <span className="ml-auto font-mono text-[11px] text-foreground-subtle">
          {t.dimensions(shapeA, shapeB)}
        </span>
      </OptionBar>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <Pane label={t.matrixA} footer={<span>{shapeA}</span>}>
              <InputArea
                value={inputA}
                onChange={(event) => setInputA(event.target.value)}
                aria-label={t.matrixA}
                placeholder={t.placeholder}
                className="min-h-[120px]"
              />
            </Pane>
          </div>

          {needsB && (
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <Pane label={t.matrixB} footer={<span>{shapeB}</span>}>
                <InputArea
                  value={inputB}
                  onChange={(event) => setInputB(event.target.value)}
                  aria-label={t.matrixB}
                  placeholder={t.placeholder}
                  className="min-h-[120px]"
                />
              </Pane>
            </div>
          )}

          <div className="flex items-center gap-1">
            <SampleButton
              onClick={() => {
                setInputA(SAMPLE_A);
                setInputB(SAMPLE_B);
              }}
              label={t.sample}
            />
            <ClearButton
              onClick={() => {
                setInputA("");
                setInputB("");
              }}
              label={t.clear}
            />
          </div>
          <p className="text-[11px] leading-relaxed text-foreground-subtle">{t.hint}</p>
        </div>

        <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.result}
            footer={
              <span>{outcome.value ? t.rows(outcome.value.split("\n").length) : ""}</span>
            }
          >
            {message ? (
              <div className="p-3">
                <ErrorNote>{message}</ErrorNote>
              </div>
            ) : (
              <OutputArea value={outcome.value} placeholder={t.empty} minHeight="min-h-[360px]" />
            )}
          </Pane>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
