"use client";

import * as React from "react";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Input } from "@/components/ui/input";
import {
  ClearButton,
  CopyButton,
  ErrorNote,
  OptionBar,
  OptionField,
  Pane,
  SampleButton,
} from "@/components/tools/tool-ui";
import { errorText, safe } from "@/lib/errors";
import {
  bell,
  callOf,
  catalan,
  combination,
  combinationWithRepetition,
  derangement,
  digitCount,
  factorial,
  formatCount,
  formulaOf,
  needsK,
  permutation,
  permutationWithRepetition,
  stirlingSecond,
  MAX_DP_N,
  MAX_N,
  type CountId,
} from "@/lib/combinatorics";

const ROWS: CountId[] = [
  "permutation",
  "combination",
  "permutationRepeat",
  "combinationRepeat",
  "factorial",
  "derangement",
  "catalan",
  "stirling",
  "bell",
];

const COPY = {
  zh: {
    inputs: "输入",
    n: "n 元素总数",
    k: "k 选取个数",
    results: "结果",
    sample: "示例",
    clear: "清空",
    hint: `n 与 k 都是非负整数。k 大于 n 时仅排列、组合一类无解，显示为 —；阶乘、错排等与 k 无关的结果照常给出。n 上限 ${MAX_N}，斯特林数与贝尔数上限 ${MAX_DP_N}。`,
    note: "全部用 BigInt 精确计算，不做浮点近似：2000! 的 5736 位数字一位不少。超过 24 位时表内改用科学计数法，复制按钮拿到的仍是完整数字。计算在浏览器内完成。",
    digits: (count: number) => `${count} 位`,
    empty: "在上方输入 n（和 k），这里按公式列出所有计数",
    invalid: "需要非负整数",
    names: {
      permutation: "排列",
      combination: "组合",
      permutationRepeat: "可重复排列",
      combinationRepeat: "可重复组合",
      factorial: "阶乘",
      derangement: "错排",
      catalan: "卡特兰数",
      stirling: "第二类斯特林数",
      bell: "贝尔数",
    },
  },
  en: {
    inputs: "Inputs",
    n: "n · total items",
    k: "k · items picked",
    results: "Results",
    sample: "Sample",
    clear: "Clear",
    hint: `Both n and k are non-negative integers. When k is larger than n only the ordered and unordered selection rows have no answer and show —; factorials, derangements and the rest still compute. n is capped at ${MAX_N}, Stirling and Bell numbers at ${MAX_DP_N}.`,
    note: "Everything is exact BigInt arithmetic, no floating point: all 5736 digits of 2000! are there. Values longer than 24 digits switch to scientific notation in the table, while the copy button always yields the full number. The math never leaves the browser.",
    digits: (count: number) => `${count} digits`,
    empty: "Enter n (and k) above to see every count for those inputs",
    invalid: "Needs a non-negative integer",
    names: {
      permutation: "Permutations",
      combination: "Combinations",
      permutationRepeat: "Permutations with repetition",
      combinationRepeat: "Combinations with repetition",
      factorial: "Factorial",
      derangement: "Derangements",
      catalan: "Catalan number",
      stirling: "Stirling number (2nd kind)",
      bell: "Bell number",
    },
  },
};

function compute(id: CountId, n: number, k: number): bigint {
  switch (id) {
    case "permutation":
      return permutation(n, k);
    case "combination":
      return combination(n, k);
    case "permutationRepeat":
      return permutationWithRepetition(n, k);
    case "combinationRepeat":
      return combinationWithRepetition(n, k);
    case "factorial":
      return factorial(n);
    case "derangement":
      return derangement(n);
    case "catalan":
      return catalan(n);
    case "stirling":
      return stirlingSecond(n, k);
    case "bell":
      return bell(n);
  }
}

export function CombinatoricsTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [nInput, setNInput] = React.useState("10");
  const [kInput, setKInput] = React.useState("3");

  const kMissing = kInput.trim() === "";
  const ready = nInput.trim() !== "";
  const n = Number(nInput);
  const k = kMissing ? 0 : Number(kInput);

  const rows = React.useMemo(() => {
    if (!ready) return [];
    return ROWS.map((id) => {
      // k-empty is a normal state: the k-free counts still have answers
      if (kMissing && needsK(id)) return { id, value: null, error: null, digits: 0 };
      const run = safe(() => compute(id, n, k));
      return {
        id,
        value: run.value,
        error: run.error,
        digits: run.value === null ? 0 : digitCount(run.value),
      };
    });
  }, [ready, kMissing, n, k]);

  const firstError = rows.find((row) => row.error)?.error ?? null;
  // Only worth a red banner when nothing at all could be computed; a k > n row
  // is an expected empty answer, not a broken input.
  const nothingComputed = rows.length > 0 && rows.every((row) => row.value === null);

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.n}>
          <Input
            type="number"
            min={0}
            max={MAX_N}
            size="xs"
            value={nInput}
            onChange={(event) => setNInput(event.target.value)}
            aria-label={t.n}
            className="w-24 font-mono"
          />
        </OptionField>
        <OptionField label={t.k}>
          <Input
            type="number"
            min={0}
            max={MAX_N}
            size="xs"
            value={kInput}
            onChange={(event) => setKInput(event.target.value)}
            aria-label={t.k}
            className="w-24 font-mono"
          />
        </OptionField>
        <div className="ml-auto flex items-center gap-1">
          <SampleButton
            onClick={() => {
              setNInput("10");
              setKInput("3");
            }}
            label={t.sample}
          />
          <ClearButton
            onClick={() => {
              setNInput("");
              setKInput("");
            }}
            label={t.clear}
          />
        </div>
      </OptionBar>

      {firstError && nothingComputed && <ErrorNote>{errorText(firstError, locale)}</ErrorNote>}

      <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
        <Pane
          label={t.results}
          footer={
            <span>
              {ready ? `n = ${nInput}` : "—"}
              {!kMissing && `　k = ${kInput}`}
            </span>
          }
        >
          {!ready ? (
            <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
          ) : (
            <div className="grid md:grid-cols-2">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-start gap-3 border-b border-border px-3 py-2.5 md:odd:border-r"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13px] text-foreground">{t.names[row.id]}</span>
                      <span className="truncate font-mono text-[11px] text-foreground-faint">
                        {callOf(row.id, n, k)}
                      </span>
                    </div>
                    <div className="mt-0.5 break-all font-mono text-[11px] leading-relaxed text-foreground-faint">
                      {formulaOf(row.id)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                    <div className="text-right">
                      <div className="max-w-[15rem] break-all font-mono text-[13px] leading-snug text-foreground">
                        {row.value === null ? "—" : formatCount(row.value)}
                      </div>
                      {row.value !== null && digitCount(row.value) > 24 && (
                        <div className="font-mono text-[10px] text-foreground-faint">
                          {t.digits(row.digits)}
                        </div>
                      )}
                    </div>
                    <CopyButton
                      value={row.value === null ? undefined : row.value.toString()}
                      size="icon-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Pane>
      </div>

      <p className="text-[11px] leading-relaxed text-foreground-subtle">{t.hint}</p>
      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
