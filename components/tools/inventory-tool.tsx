"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { CopyButton, ErrorNote, Pane, WarningNote } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { stockPlan, type StockInput, type StockStatus } from "@/lib/inventory";

const COPY = {
  zh: {
    onHand: "现有库存",
    inbound: "在途库存",
    daily: "日均销量",
    lead: "采购交期（天）",
    safety: "安全库存（天）",
    cover: "到货后覆盖（天）",
    moq: "起订量 MOQ",
    result: "库存状态",
    empty: "填入库存在售数据后这里给出补货建议",
    days: "天",
    available: "可售天数",
    status: {
      ok: "库存充足",
      reorder: "该补货了",
      stockout: "交期内会断货",
      out: "已售罄",
    } as Record<StockStatus, string>,
    reorderPoint: "补货点",
    untilReorder: "距离补货点",
    target: "目标库存",
    suggest: "建议下单量",
    inboundRow: "在途",
    ahead: (d: number) => `还有 ${d} 天`,
    behind: (d: number) => `已低于 ${d} 天`,
    units: "件",
    alertStockout: (d: number) => `现有库存只够 ${d} 天，短于采购交期，再不补就会断货。`,
    alertReorder: "已经到补货点了，按下面的数量下单能接上交期。",
    note: "补货点 = 日均销量 ×（交期 + 安全天数），意思是「等到这个库存再下单，货到之前刚好不会断」。建议下单量先把目标拉到「交期 + 覆盖天数」，再减去现有与在途，最后按起订量向上取整。日均销量要用最近 14–30 天的真实出库，做活动或换季时手动调高，这里的线性外推不认趋势。",
    none: "—",
  },
  en: {
    onHand: "On hand",
    inbound: "Inbound",
    daily: "Daily sales",
    lead: "Lead time (days)",
    safety: "Safety stock (days)",
    cover: "Cover after arrival (days)",
    moq: "MOQ",
    result: "Stock position",
    empty: "Enter stock and sales to see the replenishment plan",
    days: "days",
    available: "Days of cover",
    status: {
      ok: "Plenty",
      reorder: "Time to reorder",
      stockout: "Runs out before delivery",
      out: "Out of stock",
    } as Record<StockStatus, string>,
    reorderPoint: "Reorder point",
    untilReorder: "Until reorder point",
    target: "Target stock",
    suggest: "Order quantity",
    inboundRow: "Inbound",
    ahead: (d: number) => `${d} days left`,
    behind: (d: number) => `${d} days past it`,
    units: "units",
    alertStockout: (d: number) => `Current stock covers only ${d} days, less than the lead time — order now or it runs out.`,
    alertReorder: "You are at the reorder point; the quantity below arrives in time.",
    note: "Reorder point = daily sales × (lead time + safety days): order when stock falls to it and the next batch lands just before the shelf empties. The order quantity first lifts stock to lead time + cover days, subtracts what is on hand and inbound, then rounds up to the MOQ. Base daily sales on real outbound from the last 14–30 days, and raise it by hand for campaigns or season changes — this extrapolation ignores trends.",
    none: "—",
  },
};

const STATUS_CLASS: Record<StockStatus, string> = {
  ok: "bg-green/10 text-green-fg",
  reorder: "bg-yellow/10 text-yellow-fg",
  stockout: "bg-orange/10 text-orange-fg",
  out: "bg-red/10 text-red-fg",
};

const num = (value: number) => Math.round(value).toLocaleString("en-US");

export function InventoryTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [onHand, setOnHand] = React.useState("300");
  const [inbound, setInbound] = React.useState("0");
  const [daily, setDaily] = React.useState("20");
  const [lead, setLead] = React.useState("15");
  const [safety, setSafety] = React.useState("7");
  const [cover, setCover] = React.useState("30");
  const [moq, setMoq] = React.useState("100");

  const solved = React.useMemo(() => {
    const input: StockInput = {
      onHand: Number(onHand),
      inbound: Number(inbound),
      dailySales: Number(daily),
      leadDays: Number(lead),
      safetyDays: Number(safety),
      coverDays: Number(cover),
      moq: Number(moq),
    };
    return safe(() => stockPlan(input));
  }, [onHand, inbound, daily, lead, safety, cover, moq]);

  const result = solved.value;
  const availableDays = result ? Math.floor(result.availableDays) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: t.onHand, value: onHand, set: setOnHand },
              { label: t.inbound, value: inbound, set: setInbound },
              { label: t.daily, value: daily, set: setDaily },
              { label: t.moq, value: moq, set: setMoq },
              { label: t.lead, value: lead, set: setLead },
              { label: t.safety, value: safety, set: setSafety },
              { label: t.cover, value: cover, set: setCover },
            ].map((field) => (
              <label key={field.label} className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-foreground-subtle">{field.label}</span>
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
          {result?.status === "stockout" && availableDays !== null && (
            <WarningNote>{t.alertStockout(availableDays)}</WarningNote>
          )}
          {result?.status === "out" && <WarningNote>{t.alertStockout(0)}</WarningNote>}
          {result?.status === "reorder" && <WarningNote>{t.alertReorder}</WarningNote>}
        </div>

        <div className="min-w-0 self-start overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.result}
            footer={
              <span>
                {t.reorderPoint} {result ? `${num(result.reorderPoint)} ${t.units}` : t.none}
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
                        {availableDays}
                      </span>
                      <span className="text-[11px] text-foreground-faint">{t.days}</span>
                      <span
                        className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_CLASS[result.status]}`}
                      >
                        {t.status[result.status]}
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-foreground-faint">
                      {t.available} · {t.untilReorder}{" "}
                      {result.daysUntilReorder >= 0
                        ? t.ahead(Math.floor(result.daysUntilReorder))
                        : t.behind(Math.floor(-result.daysUntilReorder))}
                    </div>
                  </div>
                  <CopyButton value={String(result.suggestedQty)} size="icon-xs" />
                </div>

                <dl className="divide-y divide-border border-b border-border text-[12px]">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <dt className="text-foreground-subtle">{t.reorderPoint}</dt>
                    <dd className="ml-auto font-mono text-foreground">
                      {num(result.reorderPoint)} {t.units}
                    </dd>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <dt className="text-foreground-subtle">{t.target}</dt>
                    <dd className="ml-auto font-mono text-foreground">
                      {num(result.targetUnits)} {t.units}
                    </dd>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <dt className="text-foreground-subtle">{t.inboundRow}</dt>
                    <dd className="ml-auto font-mono text-foreground-muted">
                      {num(Number(inbound))} {t.units}
                    </dd>
                  </div>
                </dl>

                <div className="flex items-center gap-3 px-3 py-3">
                  <span className="text-[12px] font-medium text-foreground">{t.suggest}</span>
                  <span className="ml-auto font-mono text-lg text-foreground">
                    {num(result.suggestedQty)}
                    <span className="ml-1 text-[11px] text-foreground-faint">{t.units}</span>
                  </span>
                </div>
              </div>
            )}
          </Pane>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
