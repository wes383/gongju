"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { CopyButton, ErrorNote, Pane, WarningNote } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { adsMetrics, type AdsInput } from "@/lib/ads";
import { errorText, safe } from "@/lib/errors";

const COPY = {
  zh: {
    spend: "广告花费",
    impressions: "曝光量",
    clicks: "点击量",
    orders: "成交订单",
    aov: "客单价",
    margin: "毛利率 %",
    marginHint: "商品毛利率，用来算保本线",
    result: "广告投产",
    empty: "填入花费与转化数据后这里给出 ROAS",
    revenue: "成交额",
    profit: "扣广告费后利润",
    profitBadge: "盈利",
    lossBadge: "亏损",
    ctr: "点击率 CTR",
    cpc: "单次点击 CPC",
    cvr: "转化率 CVR",
    cpa: "单笔订单 CPA",
    acos: "ACoS",
    overall: "曝光到下单",
    funnel: "转化链路",
    breakEven: "保本线",
    beRoas: "保本 ROAS",
    beCpa: "保本 CPA",
    beOrders: "保本所需订单",
    missing: "还差的订单",
    loss: (n: number) => `按现在的转化，还要多成交 ${n} 单才不亏。要么提高转化率，要么抬客单价。`,
    note: "ROAS 是成交额除以花费，ACoS 是它的倒数；这两个数不告诉你赚没赚钱，必须结合毛利率看。保本 ROAS = 1 ÷ 毛利率，所以毛利 40% 时 ROAS 低于 2.5 就是在给平台打工。这里的利润只扣了广告费，没算商品成本、运费和退货，完整口径用「定价与利润计算」。",
    none: "—",
  },
  en: {
    spend: "Ad spend",
    impressions: "Impressions",
    clicks: "Clicks",
    orders: "Orders",
    aov: "Order value",
    margin: "Gross margin %",
    marginHint: "Product margin, used for the break-even line",
    result: "Ad return",
    empty: "Enter spend and conversion data to see ROAS",
    revenue: "Revenue",
    profit: "Profit after ad spend",
    profitBadge: "Profitable",
    lossBadge: "Losing money",
    ctr: "CTR",
    cpc: "CPC",
    cvr: "CVR",
    cpa: "CPA",
    acos: "ACoS",
    overall: "Impression to order",
    funnel: "Funnel",
    breakEven: "Break-even line",
    beRoas: "Break-even ROAS",
    beCpa: "Break-even CPA",
    beOrders: "Orders to break even",
    missing: "Orders short",
    loss: (n: number) => `At this conversion rate you need ${n} more orders to stop losing money. Raise the conversion rate or the order value.`,
    note: "ROAS is revenue divided by spend and ACoS is its inverse — neither says whether you made money without the gross margin. Break-even ROAS is 1 ÷ margin, so at 40% margin anything under 2.5 is working for the platform. The profit here only subtracts ad spend, not product cost, shipping or returns; use the pricing tool for the full picture.",
    none: "—",
  },
};

const num = (value: number) => Math.round(value).toLocaleString("en-US");
const money = (value: number) => `¥${value.toFixed(2)}`;

export function RoasTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [spend, setSpend] = React.useState("1000");
  const [impressions, setImpressions] = React.useState("100000");
  const [clicks, setClicks] = React.useState("2000");
  const [orders, setOrders] = React.useState("100");
  const [aov, setAov] = React.useState("150");
  const [margin, setMargin] = React.useState("40");

  const solved = React.useMemo(() => {
    const input: AdsInput = {
      spend: Number(spend),
      impressions: Number(impressions),
      clicks: Number(clicks),
      orders: Number(orders),
      aov: Number(aov),
      marginPct: Number(margin),
    };
    return safe(() => adsMetrics(input));
  }, [spend, impressions, clicks, orders, aov, margin]);

  const result = solved.value;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: t.spend, value: spend, set: setSpend },
              { label: t.aov, value: aov, set: setAov },
              { label: t.impressions, value: impressions, set: setImpressions },
              { label: t.clicks, value: clicks, set: setClicks },
              { label: t.orders, value: orders, set: setOrders },
              { label: t.margin, value: margin, set: setMargin },
            ].map((field) => (
              <label key={field.label} className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-foreground-subtle" title={field.label === t.margin ? t.marginHint : undefined}>
                  {field.label}
                </span>
                <Input
                  value={field.value}
                  onChange={(event) => field.set(event.target.value)}
                  inputMode="decimal"
                  className="w-full font-mono text-sm"
                  size="xs"
                />
              </label>
            ))}
          </div>

          {solved.error && <ErrorNote>{errorText(solved.error, locale)}</ErrorNote>}
          {result && !result.profitable && result.missingOrders > 0 && (
            <WarningNote>{t.loss(result.missingOrders)}</WarningNote>
          )}
        </div>

        <div className="min-w-0 self-start overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.result}
            footer={
              <span>
                {t.revenue} {result ? money(result.revenue) : t.none}
              </span>
            }
          >
            {!result ? (
              <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-start gap-2 border-b border-border px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-2xl leading-tight text-foreground">
                        {result.roas.toFixed(2)}
                      </span>
                      <span
                        className={
                          result.profitable
                            ? "rounded-full bg-green/10 px-1.5 py-0.5 text-[10px] font-medium text-green-fg"
                            : "rounded-full bg-red/10 px-1.5 py-0.5 text-[10px] font-medium text-red-fg"
                        }
                      >
                        {result.profitable ? t.profitBadge : t.lossBadge}
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-foreground-faint">
                      ROAS · {t.acos} {result.acos.toFixed(1)}%
                    </div>
                  </div>
                  <CopyButton value={result.roas.toFixed(2)} size="icon-xs" />
                </div>

                <div className="border-b border-border px-3 py-2.5">
                  <div className="mb-1.5 text-[11px] text-foreground-subtle">{t.funnel}</div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[12px] text-foreground">
                    <span>{num(result.impressions)}</span>
                    <span className="text-foreground-faint">→ {result.ctr.toFixed(2)}%</span>
                    <span>{num(result.clicks)}</span>
                    <span className="text-foreground-faint">→ {result.cvr.toFixed(2)}%</span>
                    <span>{num(result.orders)}</span>
                    <span className="text-foreground-faint">
                      · {t.overall} {result.overallPct.toFixed(3)}%
                    </span>
                  </div>
                </div>

                <dl className="divide-y divide-border border-b border-border text-[12px]">
                  {[
                    { label: t.spend, value: money(Number(spend)), negative: false },
                    { label: t.cpc, value: result.cpc === null ? t.none : money(result.cpc), negative: false },
                    { label: t.cpa, value: result.cpa === null ? t.none : money(result.cpa), negative: false },
                    { label: t.profit, value: money(result.adProfit), negative: result.adProfit < 0 },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-3 px-3 py-2">
                      <dt className="text-foreground-subtle">{row.label}</dt>
                      <dd
                        className={
                          row.negative
                            ? "ml-auto font-mono text-red-fg"
                            : "ml-auto font-mono text-foreground"
                        }
                      >
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <dl className="divide-y divide-border text-[12px]">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <dt className="text-foreground-subtle">{t.beRoas}</dt>
                    <dd className="ml-auto font-mono text-foreground">
                      {result.breakEvenRoas === null ? t.none : result.breakEvenRoas.toFixed(2)}
                    </dd>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <dt className="text-foreground-subtle">{t.beCpa}</dt>
                    <dd className="ml-auto font-mono text-foreground">
                      {result.breakEvenCpa === null ? t.none : money(result.breakEvenCpa)}
                    </dd>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <dt className="text-foreground-subtle">{t.beOrders}</dt>
                    <dd className="ml-auto font-mono text-foreground">
                      {result.breakEvenOrders === null ? t.none : num(result.breakEvenOrders)}
                    </dd>
                  </div>
                  {!result.profitable && result.missingOrders > 0 && (
                    <div className="flex items-center gap-3 px-3 py-2">
                      <dt className="text-foreground-subtle">{t.missing}</dt>
                      <dd className="ml-auto font-mono text-red-fg">{num(result.missingOrders)}</dd>
                    </div>
                  )}
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
