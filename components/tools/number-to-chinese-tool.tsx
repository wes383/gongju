"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { CopyButton, OptionBar, OptionField, Pane, Segmented, Stats } from "@/components/tools/tool-ui";
import { useCopy } from "@/components/locale-provider";
import { toChineseLower, toRmbUpper } from "@/lib/chinese-number";

const COPY = {
  zh: {
    mode: "写法",
    rmb: "人民币大写",
    lower: "中文读法",
    value: "数字",
    placeholder: "例如 1234.56",
    result: "结果",
    empty: "输入数字后自动转换",
    invalid: "不是有效的数字",
    sample: "试试",
    note: "大写用于发票、支票：12.5 写作「壹拾贰圆伍角整」，角分不足两位时补「整」；读法用于口语：12.5 写作「十二点五」。小数超过两位会四舍五入到分。",
  },
  en: {
    mode: "Style",
    rmb: "Financial capitals",
    lower: "Spoken reading",
    value: "Number",
    placeholder: "e.g. 1234.56",
    result: "Result",
    empty: "Type a number to convert it",
    invalid: "Not a valid number",
    sample: "Try it",
    note: "The capitals form is what invoices and cheques require — 12.5 becomes 壹拾贰圆伍角整, with 整 appended when the fen digit is zero. The spoken form reads digit by digit after 点. Anything beyond two decimals is rounded to fen.",
  },
};

export function NumberToChineseTool() {
  const t = useCopy(COPY);
  const [value, setValue] = React.useState("1234.56");
  const [mode, setMode] = React.useState<"rmb" | "lower">("rmb");

  const result = mode === "rmb" ? toRmbUpper(value) : toChineseLower(value);

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.mode}>
          <Segmented
            ariaLabel={t.mode}
            value={mode}
            onChange={setMode}
            options={[
              { value: "rmb", label: t.rmb },
              { value: "lower", label: t.lower },
            ]}
          />
        </OptionField>
        <OptionField label={t.value}>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
            spellCheck={false}
            placeholder={t.placeholder}
            aria-label={t.value}
            size="xs"
            className="font-mono text-sm sm:w-56"
          />
        </OptionField>
      </OptionBar>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <Pane
          label={t.result}
          actions={<CopyButton value={result ?? ""} />}
          footer={<Stats text={result ?? ""} />}
        >
          <div className="flex min-h-[180px] items-center px-4 py-6">
            {result ? (
              <p className="break-all font-display text-2xl font-semibold leading-relaxed text-foreground sm:text-3xl">
                {result}
              </p>
            ) : (
              <p className="text-sm text-foreground-subtle">
                {value.trim() === "" ? t.empty : t.invalid}
              </p>
            )}
          </div>
        </Pane>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
