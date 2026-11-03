"use client";

import * as React from "react";
import { House } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { OptionBar, OptionField, Segmented, Toggle } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import {
  buildSchedule,
  groupByYear,
  RATE_PRESETS,
  type RepaymentMethod,
} from "@/lib/mortgage";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    amount: "贷款金额（万元）",
    rate: "年利率",
    years: "贷款年限",
    method: "还款方式",
    annuity: "等额本息",
    equalPrincipal: "等额本金",
    yearUnit: (n: number) => `${n} 年`,
    monthly: "每月月供",
    firstMonthly: "首月月供",
    lastMonthly: "末月月供",
    totalInterest: "总利息",
    totalPayment: "总还款",
    interestShare: "利息占比",
    prepay: "提前还款",
    prepayAfter: "第几期后",
    prepayAmount: "还款金额（万元）",
    shorten: "缩短年限",
    reduce: "降低月供",
    saved: "节省利息",
    monthsSaved: (n: number) => `缩短 ${n} 期`,
    yearly: "年度还款汇总",
    monthlyDetail: "逐月还款计划",
    year: "年",
    principalCol: "本金",
    interestCol: "利息",
    paymentCol: "合计",
    balanceCol: "剩余本金",
    periodCol: "期",
    preset: "参考利率",
    note: "结果为理论值：实际放款以银行为准，等额本息按四舍五入到分计算，最后一期会有几分钱的尾差。提前还款按「当期还完后一次性冲减本金」处理。",
  },
  en: {
    amount: "Loan amount (10k CNY)",
    rate: "Annual rate",
    years: "Term",
    method: "Repayment",
    annuity: "Equal payment",
    equalPrincipal: "Equal principal",
    yearUnit: (n: number) => `${n} yr`,
    monthly: "Monthly payment",
    firstMonthly: "First payment",
    lastMonthly: "Last payment",
    totalInterest: "Total interest",
    totalPayment: "Total paid",
    interestShare: "Interest share",
    prepay: "Prepayment",
    prepayAfter: "After instalment",
    prepayAmount: "Amount (10k CNY)",
    shorten: "Shorten term",
    reduce: "Lower payment",
    saved: "Interest saved",
    monthsSaved: (n: number) => `${n} instalment${n === 1 ? "" : "s"} shorter`,
    yearly: "Yearly summary",
    monthlyDetail: "Full schedule",
    year: "Year",
    principalCol: "Principal",
    interestCol: "Interest",
    paymentCol: "Total",
    balanceCol: "Balance",
    periodCol: "No.",
    preset: "Reference rate",
    note: "Figures are theoretical: the bank's offer wins, equal-payment is rounded to cents so the last instalment differs by a few cents, and prepayment is applied as a lump sum right after the chosen instalment.",
  },
};

function toNumber(value: string): number {
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function MortgageTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [amount, setAmount] = React.useState("100");
  const [rate, setRate] = React.useState("3.1");
  const [years, setYears] = React.useState(30);
  const [method, setMethod] = React.useState<RepaymentMethod>("annuity");
  const [prepay, setPrepay] = React.useState(false);
  const [prepayAfter, setPrepayAfter] = React.useState("60");
  const [prepayAmount, setPrepayAmount] = React.useState("20");
  const [prepayMode, setPrepayMode] = React.useState<"shorten" | "reduce">("shorten");

  const money = (value: number) =>
    `¥${value.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
      maximumFractionDigits: value >= 1000 ? 0 : 2,
    })}`;

  const principal = Math.max(0, toNumber(amount) * 10_000);
  const result = React.useMemo(
    () =>
      buildSchedule({
        principal,
        annualRate: toNumber(rate),
        years,
        method,
        prepayment: prepay
          ? {
              afterMonth: Math.max(1, Math.round(toNumber(prepayAfter))),
              amount: Math.max(0, toNumber(prepayAmount) * 10_000),
              mode: prepayMode,
            }
          : null,
      }),
    [principal, rate, years, method, prepay, prepayAfter, prepayAmount, prepayMode]
  );

  const yearRows = React.useMemo(() => groupByYear(result.rows), [result.rows]);
  const interestShare = principal > 0 ? result.totalInterest / principal : 0;
  const monthly =
    method === "annuity"
      ? `¥${(result.fixedPayment ?? 0).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", { maximumFractionDigits: 2 })}`
      : `${money(result.firstPayment)} → ${money(result.lastPayment)}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 rounded-lg border border-border bg-surface p-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-foreground-subtle">{t.amount}</span>
          <Input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            className="font-mono text-sm"
            size="xs"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-foreground-subtle">{t.rate} %</span>
          <Input
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            inputMode="decimal"
            className="font-mono text-sm"
            size="xs"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-foreground-subtle">{t.years}</span>
          <div className="flex flex-wrap gap-1.5">
            {[10, 15, 20, 25, 30].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setYears(value)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  years === value
                    ? "bg-accent text-accent-fg"
                    : "border border-border bg-surface text-foreground-muted hover:bg-hover-bg hover:text-foreground"
                )}
              >
                {t.yearUnit(value)}
              </button>
            ))}
          </div>
        </label>
      </div>

      <OptionBar>
        <Segmented
          ariaLabel={t.method}
          value={method}
          onChange={(value) => setMethod(value as RepaymentMethod)}
          options={[
            { value: "annuity", label: t.annuity },
            { value: "equal-principal", label: t.equalPrincipal },
          ]}
        />
        <span className="h-5 w-px bg-border" aria-hidden="true" />
        <span className="text-xs text-foreground-subtle">{t.preset}</span>
        {RATE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => setRate(String(preset.rate))}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              toNumber(rate) === preset.rate
                ? "border-accent/50 bg-accent-muted text-accent"
                : "border-border text-foreground-muted hover:bg-hover-bg hover:text-foreground"
            )}
          >
            {locale === "zh" ? preset.zh : preset.en}
          </button>
        ))}
      </OptionBar>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: method === "annuity" ? t.monthly : `${t.firstMonthly} / ${t.lastMonthly}`, value: monthly, accent: true },
          { label: t.totalInterest, value: money(result.totalInterest) },
          { label: t.totalPayment, value: money(result.totalPayment) },
          { label: t.interestShare, value: `${(interestShare * 100).toFixed(1)}%` },
        ].map((card) => (
          <div
            key={card.label}
            className={cn(
              "rounded-lg border border-border bg-surface px-4 py-3",
              card.accent && "border-accent/40 bg-accent-muted"
            )}
          >
            <p className="text-[11px] text-foreground-subtle">{card.label}</p>
            <p
              className={cn(
                "mt-1 font-mono text-lg font-semibold leading-tight",
                card.accent ? "text-accent" : "text-foreground"
              )}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
        <Toggle checked={prepay} onChange={setPrepay} label={t.prepay} />
        {prepay && (
          <div className="flex flex-wrap items-end gap-3">
            <OptionField label={t.prepayAfter}>
              <Input
                value={prepayAfter}
                onChange={(event) => setPrepayAfter(event.target.value)}
                inputMode="numeric"
                className="w-20 font-mono text-xs"
                size="xs"
              />
            </OptionField>
            <OptionField label={t.prepayAmount}>
              <Input
                value={prepayAmount}
                onChange={(event) => setPrepayAmount(event.target.value)}
                inputMode="decimal"
                className="w-24 font-mono text-xs"
                size="xs"
              />
            </OptionField>
            <Segmented
              ariaLabel={t.prepay}
              value={prepayMode}
              onChange={(value) => setPrepayMode(value as "shorten" | "reduce")}
              options={[
                { value: "shorten", label: t.shorten },
                { value: "reduce", label: t.reduce },
              ]}
            />
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="success" size="sm">
                {t.saved} {money(result.interestSaved)}
              </Badge>
              {result.monthsSaved > 0 && (
                <Badge variant="info" size="sm">
                  {t.monthsSaved(result.monthsSaved)}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <span className="text-xs font-medium text-foreground">{t.yearly}</span>
          <span className="ml-auto text-[11px] text-foreground-faint">
            {result.months} {locale === "zh" ? "期" : "instalments"}
          </span>
        </header>
        <div className="max-h-[360px] overflow-auto">
          <table className="w-full border-collapse text-left font-mono text-[11px]">
            <thead className="sticky top-0 bg-surface">
              <tr className="text-foreground-subtle">
                <th className="px-3 py-2 font-normal">{t.year}</th>
                <th className="px-3 py-2 text-right font-normal">{t.principalCol}</th>
                <th className="px-3 py-2 text-right font-normal">{t.interestCol}</th>
                <th className="px-3 py-2 text-right font-normal">{t.paymentCol}</th>
                <th className="px-3 py-2 text-right font-normal">{t.balanceCol}</th>
              </tr>
            </thead>
            <tbody>
              {yearRows.map((group) => (
                <tr key={group.year} className="border-t border-border/60">
                  <td className="px-3 py-1.5 text-foreground-muted">{group.year}</td>
                  <td className="px-3 py-1.5 text-right text-foreground-muted">{money(group.principal)}</td>
                  <td className="px-3 py-1.5 text-right text-foreground-muted">{money(group.interest)}</td>
                  <td className="px-3 py-1.5 text-right text-foreground">{money(group.payment)}</td>
                  <td className="px-3 py-1.5 text-right text-foreground-muted">{money(group.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <details className="group rounded-lg border border-border bg-surface">
        <summary className="cursor-pointer select-none px-4 py-2.5 text-xs font-medium text-foreground-muted marker:content-none [&::-webkit-details-marker]:hidden">
          {t.monthlyDetail}
        </summary>
        <div className="max-h-[420px] overflow-auto border-t border-border">
          <table className="w-full border-collapse text-left font-mono text-[11px]">
            <thead className="sticky top-0 bg-surface">
              <tr className="text-foreground-subtle">
                <th className="px-3 py-2 font-normal">{t.periodCol}</th>
                <th className="px-3 py-2 text-right font-normal">{t.paymentCol}</th>
                <th className="px-3 py-2 text-right font-normal">{t.principalCol}</th>
                <th className="px-3 py-2 text-right font-normal">{t.interestCol}</th>
                <th className="px-3 py-2 text-right font-normal">{t.balanceCol}</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.month} className="border-t border-border/60">
                  <td className="px-3 py-1.5 text-foreground-muted">{row.month}</td>
                  <td className="px-3 py-1.5 text-right text-foreground">
                    {money(row.payment)}
                    {row.extra > 0 && <span className="ml-1 text-[10px] text-accent">+{money(row.extra)}</span>}
                  </td>
                  <td className="px-3 py-1.5 text-right text-foreground-muted">{money(row.principal)}</td>
                  <td className="px-3 py-1.5 text-right text-foreground-muted">{money(row.interest)}</td>
                  <td className="px-3 py-1.5 text-right text-foreground-muted">{money(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-foreground-faint">
        <House className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t.note}
      </p>
    </div>
  );
}
