"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { CopyButton, ErrorNote, Pane, WarningNote } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { pricing, type PricingInput } from "@/lib/pricing";

const COPY = {
  zh: {
    price: "售价",
    cost: "商品成本",
    commissionPct: "平台佣金 %",
    paymentPct: "支付手续费 %",
    shipping: "每单运费",
    packaging: "包装耗材",
    adCost: "每单推广费",
    returnRatePct: "退货率 %",
    result: "每单利润",
    empty: "填入售价与成本后这里给出每单毛利",
    revenue: "实收（扣退货）",
    cogs: "商品成本",
    fees: "佣金与手续费",
    logistics: "运费与包装",
    ads: "推广费",
    profit: "毛利",
    margin: "毛利率",
    markup: "加价倍数",
    breakEvenPrice: "保本售价",
    breakEvenRoas: "保本 ROAS",
    maxAdCost: "可承受推广费",
    contribution: "推广前贡献",
    loss: "这一单是亏的：售价低于所有变动成本之和，先调价或压成本。",
    note: "退货只退售价和佣金，商品回到仓库，所以收入和成本都按成交比例折算；运费和推广费不退。保本 ROAS 用推广前的贡献毛利算，意思是一块钱广告费至少要带回这么多收入才不亏。佣金、支付费率与退货率都在变化，用你自己的后台数据填。",
    none: "—",
  },
  en: {
    price: "Price",
    cost: "Unit cost",
    commissionPct: "Commission %",
    paymentPct: "Payment fee %",
    shipping: "Shipping",
    packaging: "Packaging",
    adCost: "Ad cost / order",
    returnRatePct: "Return rate %",
    result: "Profit per order",
    empty: "Enter a price and a cost to see the unit profit",
    revenue: "Revenue (net of returns)",
    cogs: "Product cost",
    fees: "Commission & fees",
    logistics: "Shipping & packaging",
    ads: "Ad spend",
    profit: "Profit",
    margin: "Margin",
    markup: "Markup",
    breakEvenPrice: "Break-even price",
    breakEvenRoas: "Break-even ROAS",
    maxAdCost: "Ad spend it can carry",
    contribution: "Contribution before ads",
    loss: "This order loses money: the price does not cover the variable costs. Raise the price or cut the cost.",
    note: "A return refunds the price and the commission while the unit comes back to the shelf, so revenue and cost both scale with the share of orders kept; shipping and ad spend do not. Break-even ROAS uses the contribution before ads — every unit of ad spend has to bring back that much revenue to wash out. Fee schedules and return rates move, so use your own back-office numbers.",
    none: "—",
  },
};

const FIELDS = [
  { key: "price", inputMode: "decimal" },
  { key: "cost", inputMode: "decimal" },
  { key: "commissionPct", inputMode: "decimal" },
  { key: "paymentPct", inputMode: "decimal" },
  { key: "shipping", inputMode: "decimal" },
  { key: "packaging", inputMode: "decimal" },
  { key: "adCost", inputMode: "decimal" },
  { key: "returnRatePct", inputMode: "decimal" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

const DEFAULTS: Record<FieldKey, string> = {
  price: "129",
  cost: "45",
  commissionPct: "5",
  paymentPct: "0.6",
  shipping: "6",
  packaging: "2",
  adCost: "12",
  returnRatePct: "5",
};

export function PricingTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [values, setValues] = React.useState<Record<FieldKey, string>>(DEFAULTS);

  const set = (key: FieldKey, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const solved = React.useMemo(() => {
    const input: PricingInput = {
      price: Number(values.price),
      cost: Number(values.cost),
      commissionPct: Number(values.commissionPct),
      paymentPct: Number(values.paymentPct),
      shipping: Number(values.shipping),
      packaging: Number(values.packaging),
      adCost: Number(values.adCost),
      returnRatePct: Number(values.returnRatePct),
    };
    return safe(() => pricing(input));
  }, [values]);

  const result = solved.value;
  const money = (value: number) => `¥${value.toFixed(2)}`;

  const rows =
    result === null
      ? []
      : [
          { label: t.revenue, value: money(result.revenue), muted: false },
          { label: t.cogs, value: `−${money(result.cogs)}`, muted: true },
          { label: t.fees, value: `−${money(result.fees)}`, muted: true },
          { label: t.logistics, value: `−${money(result.logistics)}`, muted: true },
          { label: t.ads, value: `−${money(result.ads)}`, muted: true },
        ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <label key={field.key} className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-foreground-subtle">
                  {t[field.key]}
                </span>
                <Input
                  value={values[field.key]}
                  onChange={(event) => set(field.key, event.target.value)}
                  inputMode={field.inputMode}
                  className="w-full font-mono text-sm"
                  size="xs"
                />
              </label>
            ))}
          </div>

          {solved.error && <ErrorNote>{errorText(solved.error, locale)}</ErrorNote>}
          {result && result.profit < 0 && <WarningNote>{t.loss}</WarningNote>}
        </div>

        <div className="min-w-0 self-start overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.result}
            footer={
              <span>
                {t.breakEvenPrice} {result ? money(result.breakEvenPrice) : t.none}
              </span>
            }
          >
            {!result ? (
              <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-start gap-2 border-b border-border px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-2xl leading-tight text-foreground">
                      {money(result.profit)}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-foreground-faint">
                      {t.margin} {result.marginPct.toFixed(1)}%
                    </div>
                  </div>
                  <CopyButton value={result.profit.toFixed(2)} size="icon-xs" />
                </div>

                <dl className="divide-y divide-border border-b border-border text-[12px]">
                  {rows.map((row) => (
                    <div key={row.label} className="flex items-center gap-3 px-3 py-2">
                      <dt className="text-foreground-subtle">{row.label}</dt>
                      <dd
                        className={
                          row.muted
                            ? "ml-auto font-mono text-foreground-muted"
                            : "ml-auto font-mono text-foreground"
                        }
                      >
                        {row.value}
                      </dd>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 bg-hover-bg px-3 py-2">
                    <dt className="font-medium text-foreground">{t.profit}</dt>
                    <dd className="ml-auto font-mono font-medium text-foreground">
                      {money(result.profit)}
                    </dd>
                  </div>
                </dl>

                <dl className="divide-y divide-border text-[12px]">
                  {[
                    { label: t.markup, value: result.markup === null ? t.none : `${result.markup.toFixed(2)}×` },
                    { label: t.contribution, value: `${result.contributionPct.toFixed(1)}%` },
                    {
                      label: t.breakEvenRoas,
                      value: result.breakEvenRoas === null ? t.none : result.breakEvenRoas.toFixed(2),
                    },
                    { label: t.maxAdCost, value: money(result.maxAdCost) },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-3 px-3 py-2">
                      <dt className="text-foreground-subtle">{row.label}</dt>
                      <dd className="ml-auto font-mono text-foreground">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </Pane>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
