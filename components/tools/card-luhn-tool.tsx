"use client";

import * as React from "react";
import { CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ClearButton,
  CopyButton,
  ErrorNote,
  SampleButton,
} from "@/components/tools/tool-ui";
import { useCopy } from "@/components/locale-provider";
import { analyzeCard, formatCard, luhnCheckDigit, type BrandId } from "@/lib/card";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    placeholder: "输入银行卡号，例如 4111 1111 1111 1111",
    empty: "输入卡号后自动校验",
    formatted: "格式化",
    brand: "卡组织",
    length: "长度",
    lengthValue: (count: number, lengths: number[]) =>
      `${count} 位${lengths.length <= 1 ? "" : `（支持 ${lengths.join(" / ")} 位）`}`,
    bin: "BIN / IIN",
    last4: "末四位",
    checkDigit: "校验位",
    checkDigitValue: (actual: number, expected: number) => `${actual}（应为 ${expected}）`,
    status: {
      pass: "校验通过",
      luhnFail: "Luhn 校验未通过",
      lengthFail: "Luhn 通过，但长度不符合该卡种",
      short: "位数不足",
      invalid: "只能包含数字、空格和连字符",
    },
    compute: "补全校验位",
    computeHint: "把当前输入当作不含校验位的前缀，算出应补的最后一位",
    complete: "完整卡号",
    steps: "Luhn 计算过程",
    sum: "合计",
    note: "Luhn 只检查数字结构，能发现单个数字写错和大多数相邻换位，无法证明卡号真实存在。全部计算都在本地完成，卡号不会上传。",
    brands: {
      visa: "Visa",
      mastercard: "Mastercard",
      amex: "American Express",
      unionpay: "银联",
      jcb: "JCB",
      discover: "Discover",
      diners: "Diners Club",
      maestro: "Maestro",
      mir: "Mir",
      unknown: "未识别",
    } as Record<BrandId, string>,
  },
  en: {
    placeholder: "Enter a card number, e.g. 4111 1111 1111 1111",
    empty: "Validation runs as you type",
    formatted: "Formatted",
    brand: "Issuer",
    length: "Length",
    lengthValue: (count: number, lengths: number[]) =>
      `${count} digits${lengths.length <= 1 ? "" : ` (expects ${lengths.join(" / ")})`}`,
    bin: "BIN / IIN",
    last4: "Last four",
    checkDigit: "Check digit",
    checkDigitValue: (actual: number, expected: number) => `${actual} (expected ${expected})`,
    status: {
      pass: "Valid",
      luhnFail: "Luhn check failed",
      lengthFail: "Passes Luhn, but the length is wrong for this issuer",
      short: "Too few digits",
      invalid: "Only digits, spaces and dashes are allowed",
    },
    compute: "Complete check digit",
    computeHint: "Treats what you typed as the payload without its check digit",
    complete: "Full number",
    steps: "Luhn breakdown",
    sum: "Sum",
    note: "Luhn only tests the digit structure: it catches single-digit typos and most adjacent transpositions, but cannot prove an account exists. Everything runs locally — the number never leaves this device.",
    brands: {
      visa: "Visa",
      mastercard: "Mastercard",
      amex: "American Express",
      unionpay: "UnionPay",
      jcb: "JCB",
      discover: "Discover",
      diners: "Diners Club",
      maestro: "Maestro",
      mir: "Mir",
      unknown: "Unknown",
    } as Record<BrandId, string>,
  },
};

const SAMPLE = "4111 1111 1111 1111";

type Status = "pass" | "luhnFail" | "lengthFail" | "short" | "invalid";

const STATUS_VARIANT: Record<Status, "success" | "warning" | "danger"> = {
  pass: "success",
  luhnFail: "danger",
  lengthFail: "warning",
  short: "warning",
  invalid: "danger",
};

function Row({
  label,
  value,
  copy,
}: {
  label: string;
  value: string;
  copy?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <span className="w-24 shrink-0 font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
        {label}
      </span>
      <span className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">{value}</span>
      {copy && <CopyButton value={copy} size="icon-xs" />}
    </div>
  );
}

export function CardLuhnTool() {
  const t = useCopy(COPY);
  const [input, setInput] = React.useState("");

  const analysis = React.useMemo(() => analyzeCard(input), [input]);
  const brandLabel = t.brands[analysis.brand];

  const status: Status | null =
    input.trim() === ""
      ? null
      : analysis.invalidChars.length > 0
        ? "invalid"
        : analysis.tooShort
          ? "short"
          : analysis.valid
            ? "pass"
            : analysis.luhnOk
              ? "lengthFail"
              : "luhnFail";

  const completed =
    analysis.digits !== "" && !analysis.valid
      ? (() => {
          const digit = luhnCheckDigit(analysis.digits);
          const full = `${analysis.digits}${digit}`;
          return { digit, formatted: formatCard(full, analysis.brand) };
        })()
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t.placeholder}
            aria-label="Card number"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            className="font-mono text-sm"
            size="xs"
          />
          <SampleButton onClick={() => setInput(SAMPLE)} />
          <ClearButton onClick={() => setInput("")} />
        </div>

        <div className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5">
          <CreditCard className="h-4 w-4 shrink-0 text-foreground-faint" />
          <span
            className={cn(
              "min-w-0 flex-1 break-all",
              analysis.formatted
                ? "font-mono text-[15px] tracking-[0.1em] text-foreground"
                : "text-xs text-foreground-faint"
            )}
          >
            {analysis.formatted || t.empty}
          </span>
          {analysis.formatted && <CopyButton value={analysis.formatted} size="icon-xs" />}
        </div>
      </div>

      {analysis.invalidChars.length > 0 && (
        <ErrorNote>
          {t.status.invalid}: {analysis.invalidChars.join(" ")}
        </ErrorNote>
      )}

      {status && status !== "invalid" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_VARIANT[status]} size="sm" dot>
              {t.status[status]}
            </Badge>
            <Badge variant="outline" size="sm">
              {brandLabel}
            </Badge>
          </div>

          <section className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="divide-y divide-border">
              <Row label={t.brand} value={brandLabel} />
              <Row
                label={t.length}
                value={t.lengthValue(
                  analysis.digits.length,
                  analysis.brand === "unknown" ? [] : analysis.lengths
                )}
              />
              <Row label={t.bin} value={analysis.bin} copy={analysis.bin} />
              <Row label={t.last4} value={analysis.last4} copy={analysis.last4} />
              {analysis.actualCheckDigit !== null && analysis.expectedCheckDigit !== null && (
                <Row
                  label={t.checkDigit}
                  value={t.checkDigitValue(
                    analysis.actualCheckDigit,
                    analysis.expectedCheckDigit
                  )}
                />
              )}
            </div>
          </section>

          {completed && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5">
              <span className="text-xs text-foreground-muted">{t.compute}</span>
              <code className="font-mono text-sm text-foreground">{completed.formatted}</code>
              <CopyButton value={completed.formatted} size="icon-xs" />
              <span className="w-full text-[11px] text-foreground-faint">{t.computeHint}</span>
            </div>
          )}

          {analysis.digits.length >= 2 && (
            <details className="group rounded-lg border border-border bg-surface">
              <summary className="cursor-pointer select-none px-4 py-2.5 text-xs font-medium text-foreground-muted marker:content-none [&::-webkit-details-marker]:hidden">
                {t.steps}
                <span className="ml-2 text-[11px] text-foreground-faint group-open:hidden">
                  {t.sum} {analysis.sum}
                </span>
              </summary>
              <div className="border-t border-border px-4 py-3">
                <div className="overflow-x-auto">
                  <div className="flex min-w-max gap-1">
                    {analysis.steps.map((step, index) => (
                      <div
                        key={`${index}-${step.position}`}
                        className="flex w-7 shrink-0 flex-col items-center gap-1"
                      >
                        <span
                          className={cn(
                            "grid h-7 w-7 place-items-center rounded font-mono text-sm",
                            step.doubled
                              ? "bg-accent-muted text-accent"
                              : "text-foreground-muted"
                          )}
                        >
                          {step.digit}
                        </span>
                        <span className="text-[10px] text-foreground-faint">
                          {step.doubled ? "×2" : "×1"}
                        </span>
                        <span className="font-mono text-[11px] text-foreground-muted">
                          {step.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-3 font-mono text-[11px] text-foreground-muted">
                  {t.sum} {analysis.sum} · {analysis.sum} mod 10 = {analysis.sum % 10}
                  {analysis.luhnOk ? " ✓" : ""}
                </p>
              </div>
            </details>
          )}
        </>
      )}

      <p className="px-1 text-[11px] leading-relaxed text-foreground-faint">{t.note}</p>
    </div>
  );
}
