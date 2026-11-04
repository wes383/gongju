"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { CopyButton, ErrorNote, Pane, Toggle, WarningNote } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { discountStack, type DiscountInput, type DiscountStepId } from "@/lib/pricing";

const COPY = {
  zh: {
    price: "标价",
    discount: "店铺折扣 %",
    discountHint: "结算价占标价的比例，85 就是打 8.5 折",
    cost: "商品成本（可选）",
    shopCoupon: "店铺券",
    platformCoupon: "平台满减",
    threshold: "门槛",
    off: "减",
    repeat: "每满一档可叠加",
    subsidy: "平台补贴 %",
    subsidyHint: "由平台承担，商家按补贴前金额结算",
    result: "买家实付",
    empty: "填入标价后这里逐层算出实付",
    stepDiscount: "店铺折扣",
    stepShop: "店铺券",
    stepPlatform: "平台满减",
    stepSubsidy: "平台补贴",
    skipped: "未达门槛",
    merchant: "商家实收",
    saved: "共优惠",
    profit: "扣成本后毛利",
    loss: "叠加完这个价格已经低于成本，检查一下是不是叠多了。",
    note: "顺序按结算页的实际先后：店铺折扣 → 店铺券 → 平台满减 → 平台补贴。满减的门槛用券前金额判断，开了「每满」就按满档次数乘。平台补贴由平台出钱，所以商家实收要加回来。各平台规则细节不同（部分品类不参与、跨店凑单、退货退券），这里算的是理想情况下的价格底。",
    none: "—",
  },
  en: {
    price: "List price",
    discount: "Store discount %",
    discountHint: "Share of the list price the buyer pays — 85 means 15% off",
    cost: "Unit cost (optional)",
    shopCoupon: "Shop coupon",
    platformCoupon: "Marketplace tiers",
    threshold: "Spend",
    off: "Off",
    repeat: "Repeat per full threshold",
    subsidy: "Platform subsidy %",
    subsidyHint: "Paid by the platform; the seller settles at the pre-subsidy amount",
    result: "Buyer pays",
    empty: "Enter a list price to walk the discounts",
    stepDiscount: "Store discount",
    stepShop: "Shop coupon",
    stepPlatform: "Marketplace tiers",
    stepSubsidy: "Platform subsidy",
    skipped: "Threshold not met",
    merchant: "Seller receives",
    saved: "Total discount",
    profit: "Profit after cost",
    loss: "The stacked price is below cost — check whether one discount too many is switched on.",
    note: "The order matches checkout: store discount → shop coupon → marketplace tiers → subsidy. A tier threshold is checked against the amount before it applies, and with repeat on, every full threshold counts. The platform funds the subsidy, so it is added back to what the seller receives. Real rules differ by category and campaign (exclusions, cross-store baskets, coupon returns), so treat this as the floor price.",
    none: "—",
  },
};

const STEP_KEY: Record<DiscountStepId, "stepDiscount" | "stepShop" | "stepPlatform" | "stepSubsidy"> = {
  discount: "stepDiscount",
  shopCoupon: "stepShop",
  platformCoupon: "stepPlatform",
  subsidy: "stepSubsidy",
};

export function DiscountStackTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [price, setPrice] = React.useState("299");
  const [discount, setDiscount] = React.useState("90");
  const [cost, setCost] = React.useState("120");
  const [shopThreshold, setShopThreshold] = React.useState("199");
  const [shopOff, setShopOff] = React.useState("20");
  const [platformThreshold, setPlatformThreshold] = React.useState("300");
  const [platformOff, setPlatformOff] = React.useState("50");
  const [repeat, setRepeat] = React.useState(true);
  const [subsidy, setSubsidy] = React.useState("5");

  const solved = React.useMemo(() => {
    const input: DiscountInput = {
      price: Number(price),
      discountPct: Number(discount),
      cost: Number(cost),
      shopCoupon: { threshold: Number(shopThreshold), off: Number(shopOff) },
      platformCoupon: {
        threshold: Number(platformThreshold),
        off: Number(platformOff),
        repeat,
      },
      subsidyPct: Number(subsidy),
    };
    return safe(() => discountStack(input));
  }, [price, discount, cost, shopThreshold, shopOff, platformThreshold, platformOff, repeat, subsidy]);

  const result = solved.value;
  const money = (value: number) => `¥${value.toFixed(2)}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.price}</span>
              <Input
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                inputMode="decimal"
                className="w-full font-mono text-sm"
                size="xs"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle" title={t.discountHint}>
                {t.discount}
              </span>
              <Input
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
                inputMode="decimal"
                className="w-full font-mono text-sm"
                size="xs"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.cost}</span>
              <Input
                value={cost}
                onChange={(event) => setCost(event.target.value)}
                inputMode="decimal"
                className="w-full font-mono text-sm"
                size="xs"
              />
            </label>
          </div>

          <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.shopCoupon}</span>
              <div className="flex items-center gap-1.5">
                <Input
                  value={shopThreshold}
                  onChange={(event) => setShopThreshold(event.target.value)}
                  inputMode="decimal"
                  className="w-full font-mono text-sm"
                  size="xs"
                  aria-label={`${t.shopCoupon} ${t.threshold}`}
                />
                <span className="shrink-0 text-[11px] text-foreground-faint">{t.threshold}</span>
                <Input
                  value={shopOff}
                  onChange={(event) => setShopOff(event.target.value)}
                  inputMode="decimal"
                  className="w-full font-mono text-sm"
                  size="xs"
                  aria-label={`${t.shopCoupon} ${t.off}`}
                />
                <span className="shrink-0 text-[11px] text-foreground-faint">{t.off}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">
                {t.platformCoupon}
              </span>
              <div className="flex items-center gap-1.5">
                <Input
                  value={platformThreshold}
                  onChange={(event) => setPlatformThreshold(event.target.value)}
                  inputMode="decimal"
                  className="w-full font-mono text-sm"
                  size="xs"
                  aria-label={`${t.platformCoupon} ${t.threshold}`}
                />
                <span className="shrink-0 text-[11px] text-foreground-faint">{t.threshold}</span>
                <Input
                  value={platformOff}
                  onChange={(event) => setPlatformOff(event.target.value)}
                  inputMode="decimal"
                  className="w-full font-mono text-sm"
                  size="xs"
                  aria-label={`${t.platformCoupon} ${t.off}`}
                />
                <span className="shrink-0 text-[11px] text-foreground-faint">{t.off}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Toggle checked={repeat} onChange={setRepeat} label={t.repeat} />
            <label className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.subsidy}</span>
              <Input
                value={subsidy}
                onChange={(event) => setSubsidy(event.target.value)}
                inputMode="decimal"
                className="w-20 font-mono text-sm"
                size="xs"
              />
            </label>
          </div>

          {solved.error && <ErrorNote>{errorText(solved.error, locale)}</ErrorNote>}
          {result !== null && result.profit !== null && result.profit < 0 && (
            <WarningNote>{t.loss}</WarningNote>
          )}
        </div>

        <div className="min-w-0 self-start overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.result}
            footer={
              <span>
                {t.saved} {result ? money(result.totalOff) : t.none}
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
                      {money(result.payable)}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-foreground-faint">
                      {locale === "zh"
                        ? `相当于 ${(result.effectivePct / 10).toFixed(1)} 折`
                        : `${result.effectivePct.toFixed(1)}% of list price`}
                    </div>
                  </div>
                  <CopyButton value={result.payable.toFixed(2)} size="icon-xs" />
                </div>

                <ol className="divide-y divide-border border-b border-border text-[12px]">
                  {result.steps.map((step) => (
                    <li key={step.id} className="flex items-center gap-3 px-3 py-2">
                      <span className={step.applied ? "text-foreground" : "text-foreground-faint"}>
                        {t[STEP_KEY[step.id]]}
                      </span>
                      <span className="ml-auto font-mono text-[11px] text-foreground-faint">
                        {step.applied
                          ? `−${money(step.off)}`
                          : step.id === "discount" || step.id === "subsidy"
                            ? t.none
                            : t.skipped}
                      </span>
                      <span
                        className={
                          step.applied
                            ? "w-20 shrink-0 text-right font-mono text-foreground"
                            : "w-20 shrink-0 text-right font-mono text-foreground-faint"
                        }
                      >
                        {money(step.after)}
                      </span>
                    </li>
                  ))}
                </ol>

                <dl className="divide-y divide-border text-[12px]">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <dt className="text-foreground-subtle">{t.merchant}</dt>
                    <dd className="ml-auto font-mono text-foreground">{money(result.merchantRevenue)}</dd>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <dt className="text-foreground-subtle">{t.profit}</dt>
                    <dd
                      className={
                        result.profit !== null && result.profit < 0
                          ? "ml-auto font-mono text-red-fg"
                          : "ml-auto font-mono text-foreground"
                      }
                    >
                      {result.profit === null
                        ? t.none
                        : result.marginPct === null
                          ? money(result.profit)
                          : `${money(result.profit)} · ${result.marginPct.toFixed(1)}%`}
                    </dd>
                  </div>
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
