"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { OptionBar, OptionField, Segmented } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import {
  ANNUAL_BRACKETS,
  DEFAULT_EMPLOYEE_RATES,
  compareBonus,
  estimateSocial,
  marginalRate,
  withholdTable,
} from "@/lib/tax";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    gross: "税前月薪",
    socialMode: "五险一金",
    auto: "按比例估算",
    manual: "手动填写",
    socialBase: "缴费基数",
    housingRate: "公积金比例",
    manualSocial: "每月个人缴纳",
    special: "专项附加扣除 / 月",
    specialHint: "子女教育、房贷利息、赡养老人、租房等合计，每月金额",
    bonus: "年终奖",
    perMonth: "每月到手",
    perYear: "全年到手",
    taxYear: "全年个税",
    socialYear: "全年五险一金",
    effective: "实际税负",
    taxable: "全年应纳税所得额",
    marginal: "边际税率",
    bm: {
      pension: "养老",
      medical: "医疗",
      unemployment: "失业",
      housingFund: "公积金",
      total: "合计",
    },
    breakdown: "五险一金明细（个人部分）",
    bonusTitle: "年终奖计税对比",
    separate: "单独计税",
    combined: "并入综合所得",
    better: "更省",
    saving: "差额",
    bonusNote: "年终奖单独计税政策延续至 2027 年底，每年只能用一次；两项对比只算税，不含社保差异。",
    monthly: "逐月明细",
    month: "月",
    grossCol: "应发",
    socialCol: "五险一金",
    taxableCol: "累计应纳税所得",
    taxCol: "当月个税",
    netCol: "到手",
    cumTax: "累计个税",
    brackets: "综合所得税率表",
    bracketBand: "应纳税所得额",
    bracketRate: "税率",
    bracketQuick: "速算扣除数",
    band: (from: number, to: number | null) =>
      to === null ? `超过 ${from.toLocaleString()}` : `${from.toLocaleString()} – ${to.toLocaleString()}`,
    note: "按 2019 年起的累计预扣预缴法计算，起征点 5,000 元/月。社保基数上下限、公积金比例各城市不同，估算结果仅供参考。",
  },
  en: {
    gross: "Gross salary",
    socialMode: "Social insurance",
    auto: "Estimate by rate",
    manual: "Enter manually",
    socialBase: "Contribution base",
    housingRate: "Housing fund",
    manualSocial: "Employee contribution",
    special: "Special deductions / month",
    specialHint: "Children's education, mortgage interest, elderly care, rent — the monthly total",
    bonus: "Annual bonus",
    perMonth: "Take-home / month",
    perYear: "Take-home / year",
    taxYear: "Income tax / year",
    socialYear: "Social insurance / year",
    effective: "Effective rate",
    taxable: "Annual taxable income",
    marginal: "Marginal rate",
    bm: {
      pension: "Pension",
      medical: "Medical",
      unemployment: "Unemployment",
      housingFund: "Housing fund",
      total: "Total",
    },
    breakdown: "Employee contribution breakdown",
    bonusTitle: "Bonus tax comparison",
    separate: "Taxed separately",
    combined: "Folded into income",
    better: "Cheaper",
    saving: "Difference",
    bonusNote: "The separate bonus tax option runs through the end of 2027 and can be used once a year. Only tax is compared here, not social insurance.",
    monthly: "Month by month",
    month: "Mo",
    grossCol: "Gross",
    socialCol: "Insurance",
    taxableCol: "Cumulative taxable",
    taxCol: "Tax",
    netCol: "Net",
    cumTax: "Cumulative tax",
    brackets: "Progressive rate table",
    bracketBand: "Taxable income",
    bracketRate: "Rate",
    bracketQuick: "Quick deduction",
    band: (from: number, to: number | null) =>
      to === null ? `over ${from.toLocaleString()}` : `${from.toLocaleString()} – ${to.toLocaleString()}`,
    note: "Uses the cumulative withholding method in force since 2019 with a 5,000 CNY monthly standard deduction. Contribution bases and housing fund rates differ by city, so treat the estimate as a guide.",
  },
};

function toNumber(value: string): number {
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function SalaryTaxTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [gross, setGross] = React.useState("25000");
  const [autoSocial, setAutoSocial] = React.useState(true);
  const [socialBase, setSocialBase] = React.useState("");
  const [housingRate, setHousingRate] = React.useState(7);
  const [manualSocial, setManualSocial] = React.useState("3000");
  const [special, setSpecial] = React.useState("0");
  const [bonus, setBonus] = React.useState("0");

  const money = (value: number) =>
    `¥${value.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;

  const grossValue = toNumber(gross);
  const base = toNumber(socialBase) || grossValue;
  const breakdown = estimateSocial(base, {
    ...DEFAULT_EMPLOYEE_RATES,
    housingFund: housingRate / 100,
  });
  const social = autoSocial ? breakdown.total : toNumber(manualSocial);
  const specialValue = toNumber(special);
  const bonusValue = toNumber(bonus);

  const summary = withholdTable({
    monthlyGross: grossValue,
    monthlySocial: social,
    monthlySpecial: specialValue,
  });

  const annualTaxable = Math.max(
    0,
    summary.grossTotal - summary.socialTotal - specialValue * 12 - 5_000 * 12
  );
  const comparison = bonusValue > 0 ? compareBonus(bonusValue, annualTaxable) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 rounded-lg border border-border bg-surface p-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-foreground-subtle">{t.gross}</span>
          <Input
            value={gross}
            onChange={(event) => setGross(event.target.value)}
            inputMode="decimal"
            className="font-mono text-sm"
            size="xs"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-foreground-subtle">{t.special}</span>
          <Input
            value={special}
            onChange={(event) => setSpecial(event.target.value)}
            inputMode="decimal"
            title={t.specialHint}
            className="font-mono text-sm"
            size="xs"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-foreground-subtle">{t.bonus}</span>
          <Input
            value={bonus}
            onChange={(event) => setBonus(event.target.value)}
            inputMode="decimal"
            className="font-mono text-sm"
            size="xs"
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-foreground-subtle">{t.socialMode}</span>
          <Segmented
            ariaLabel={t.socialMode}
            value={autoSocial ? "auto" : "manual"}
            onChange={(value) => setAutoSocial(value === "auto")}
            options={[
              { value: "auto", label: t.auto },
              { value: "manual", label: t.manual },
            ]}
          />
        </div>
      </div>

      <OptionBar>
        {autoSocial ? (
          <>
            <OptionField label={t.socialBase}>
              <Input
                value={socialBase}
                onChange={(event) => setSocialBase(event.target.value)}
                placeholder={String(Math.round(grossValue))}
                inputMode="decimal"
                className="w-28 font-mono text-xs"
                size="xs"
              />
            </OptionField>
            <OptionField label={t.housingRate}>
              <Input
                value={String(housingRate)}
                onChange={(event) => {
                  const next = Number(event.target.value.replace(/[^\d]/g, ""));
                  setHousingRate(Math.min(12, Math.max(0, next || 0)));
                }}
                inputMode="numeric"
                className="w-16 font-mono text-xs"
                size="xs"
              />
              <span className="text-xs text-foreground-subtle">%</span>
            </OptionField>
          </>
        ) : (
          <OptionField label={t.manualSocial}>
            <Input
              value={manualSocial}
              onChange={(event) => setManualSocial(event.target.value)}
              inputMode="decimal"
              className="w-28 font-mono text-xs"
              size="xs"
            />
          </OptionField>
        )}
        <span className="ml-auto text-xs text-foreground-subtle">{t.specialHint}</span>
      </OptionBar>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: t.perMonth, value: money(summary.netMonthly), accent: true },
          { label: t.perYear, value: money(summary.netTotal) },
          { label: t.taxYear, value: money(summary.taxTotal) },
          { label: t.socialYear, value: money(summary.socialTotal) },
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
                "mt-1 font-mono text-xl font-semibold",
                card.accent ? "text-accent" : "text-foreground"
              )}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface px-4 py-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-foreground-subtle">{t.taxable}</span>
            <span className="font-mono text-foreground">{money(annualTaxable)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-foreground-subtle">{t.marginal}</span>
            <span className="font-mono text-foreground">
              {(marginalRate(annualTaxable) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-foreground-subtle">{t.effective}</span>
            <span className="font-mono text-foreground">{(summary.effectiveRate * 100).toFixed(2)}%</span>
          </div>
        </div>

        {autoSocial && (
          <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface px-4 py-3 text-xs">
            <div className="flex items-center justify-between text-[11px] text-foreground-subtle">
              <span>{t.breakdown}</span>
              <span>{money(base)}</span>
            </div>
            {(
              [
                ["pension", breakdown.pension],
                ["medical", breakdown.medical],
                ["unemployment", breakdown.unemployment],
                ["housingFund", breakdown.housingFund],
                ["total", breakdown.total],
              ] as const
            ).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className={key === "total" ? "text-foreground-muted" : "text-foreground-subtle"}>
                  {t.bm[key]}
                </span>
                <span className={cn("font-mono", key === "total" ? "text-foreground" : "text-foreground-muted")}>
                  {money(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {comparison && (
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <span className="text-xs font-medium text-foreground">{t.bonusTitle}</span>
            <span className="ml-auto text-[11px] text-foreground-faint">
              {t.saving} {money(comparison.saving)}
            </span>
          </header>
          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {(
              [
                {
                  key: "separate" as const,
                  label: t.separate,
                  tax: comparison.separate.totalTax,
                  net: comparison.separate.netBonus,
                },
                {
                  key: "combined" as const,
                  label: t.combined,
                  tax: comparison.combined.totalTax,
                  net: comparison.combined.netBonus,
                },
              ]
            ).map((option) => (
              <div key={option.key} className="flex flex-col gap-1.5 px-4 py-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{option.label}</span>
                  {comparison.better === option.key && (
                    <Badge variant="success" size="xs" dot>
                      {t.better}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-foreground-subtle">{t.taxYear}</span>
                  <span className="font-mono text-foreground">{money(option.tax)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-foreground-subtle">{t.bonus}</span>
                  <span className="font-mono text-foreground-muted">{money(option.net)}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="border-t border-border px-4 py-2 text-[11px] leading-relaxed text-foreground-faint">
            {t.bonusNote}
          </p>
        </section>
      )}

      <details className="group rounded-lg border border-border bg-surface">
        <summary className="cursor-pointer select-none px-4 py-2.5 text-xs font-medium text-foreground-muted marker:content-none [&::-webkit-details-marker]:hidden">
          {t.monthly}
          <span className="ml-2 text-[11px] text-foreground-faint">
            {money(summary.netTotal)} · {t.cumTax} {money(summary.taxTotal)}
          </span>
        </summary>
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full border-collapse text-left font-mono text-[11px]">
            <thead>
              <tr className="text-foreground-subtle">
                <th className="px-3 py-2 font-normal">{t.month}</th>
                <th className="px-3 py-2 text-right font-normal">{t.grossCol}</th>
                <th className="px-3 py-2 text-right font-normal">{t.socialCol}</th>
                <th className="px-3 py-2 text-right font-normal">{t.taxableCol}</th>
                <th className="px-3 py-2 text-right font-normal">{t.taxCol}</th>
                <th className="px-3 py-2 text-right font-normal">{t.netCol}</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((row) => (
                <tr key={row.month} className="border-t border-border/60">
                  <td className="px-3 py-1.5 text-foreground-muted">{row.month}</td>
                  <td className="px-3 py-1.5 text-right text-foreground-muted">{money(row.gross)}</td>
                  <td className="px-3 py-1.5 text-right text-foreground-muted">{money(row.social)}</td>
                  <td className="px-3 py-1.5 text-right text-foreground-muted">{money(row.cumTaxable)}</td>
                  <td className="px-3 py-1.5 text-right text-foreground">{money(row.tax)}</td>
                  <td className="px-3 py-1.5 text-right text-foreground">{money(row.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <details className="group rounded-lg border border-border bg-surface">
        <summary className="cursor-pointer select-none px-4 py-2.5 text-xs font-medium text-foreground-muted marker:content-none [&::-webkit-details-marker]:hidden">
          {t.brackets}
        </summary>
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full border-collapse text-left font-mono text-[11px]">
            <thead>
              <tr className="text-foreground-subtle">
                <th className="px-3 py-2 font-normal">{t.bracketBand}</th>
                <th className="px-3 py-2 text-right font-normal">{t.bracketRate}</th>
                <th className="px-3 py-2 text-right font-normal">{t.bracketQuick}</th>
              </tr>
            </thead>
            <tbody>
              {ANNUAL_BRACKETS.map((bracket, index) => {
                const from = index === 0 ? 0 : (ANNUAL_BRACKETS[index - 1].upTo ?? 0);
                return (
                  <tr key={String(bracket.upTo)} className="border-t border-border/60">
                    <td className="px-3 py-1.5 text-foreground-muted">{t.band(from, bracket.upTo)}</td>
                    <td className="px-3 py-1.5 text-right text-foreground">{(bracket.rate * 100).toFixed(0)}%</td>
                    <td className="px-3 py-1.5 text-right text-foreground-muted">
                      {bracket.quick.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>

      <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-foreground-faint">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t.note}
      </p>
    </div>
  );
}
