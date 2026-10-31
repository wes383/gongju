"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { CopyButton, Segmented } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import {
  formatCount,
  formatMoney,
  llmCost,
  parseNumber,
  requestsForBudget,
  type Currency,
} from "@/lib/llm-cost";

const COPY = {
  zh: {
    currency: "货币",
    rates: "单价",
    usage: "每次请求用量",
    inputPrice: "输入",
    outputPrice: "输出",
    inputTokens: "输入 tokens",
    outputTokens: "输出 tokens",
    requests: "请求次数",
    results: "费用",
    inputCost: "输入",
    outputCost: "输出",
    perRequest: "单次请求",
    total: "合计",
    times: "次",
    budget: "预算",
    budgetResult: "可请求",
    needPrice: "填写单价后显示",
    note: "费用 = 单价 ÷ 100 万 × tokens。单价按你选中的币种直接计算，不做汇率换算；不含缓存命中折扣、批处理折扣，思考模型的推理 token 需自行算进输出 tokens。",
  },
  en: {
    currency: "Currency",
    rates: "Price",
    usage: "Per-request usage",
    inputPrice: "Input",
    outputPrice: "Output",
    inputTokens: "Input tokens",
    outputTokens: "Output tokens",
    requests: "Requests",
    results: "Cost",
    inputCost: "Input",
    outputCost: "Output",
    perRequest: "Per request",
    total: "Total",
    times: "requests",
    budget: "Budget",
    budgetResult: "Covers",
    needPrice: "Enter a price to see costs",
    note: "Cost = price ÷ 1M × tokens. Prices are taken as USD, with no currency conversion; cache discounts and batch pricing are not applied, and reasoning tokens count as output.",
  },
};

function Field({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string;
  suffix: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="truncate text-[11px] text-foreground-muted">{label}</span>
      <span className="flex min-w-0 items-center gap-2">
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
          spellCheck={false}
          aria-label={label}
          size="xs"
          className="min-w-0 font-mono text-sm"
        />
        <span className="shrink-0 text-[11px] text-foreground-faint">{suffix}</span>
      </span>
    </label>
  );
}

export function LlmCostTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [currency, setCurrency] = React.useState<Currency>("USD");
  const [inputPrice, setInputPrice] = React.useState("");
  const [outputPrice, setOutputPrice] = React.useState("");
  const [inputTokens, setInputTokens] = React.useState("1000");
  const [outputTokens, setOutputTokens] = React.useState("500");
  const [requests, setRequests] = React.useState("1000");
  const [budget, setBudget] = React.useState("100");

  const usage = {
    inputTokens: parseNumber(inputTokens),
    outputTokens: parseNumber(outputTokens),
    requests: parseNumber(requests),
  };
  const cost = llmCost(
    { inputPrice: parseNumber(inputPrice), outputPrice: parseNumber(outputPrice) },
    usage
  );
  const ready = inputPrice.trim() !== "" || outputPrice.trim() !== "";
  // 英文界面不提供人民币切换，统一按美元计算
  const activeCurrency: Currency = locale === "zh" ? currency : "USD";
  const money = (value: number) =>
    ready ? formatMoney(value, activeCurrency, locale) : "—";
  const covered = ready ? requestsForBudget(parseNumber(budget), cost.perRequest) : 0;
  const currencySign = activeCurrency === "CNY" ? "¥" : "$";
  const priceUnit = `${currencySign} / 1M tokens`;

  const summary = ready
    ? [
        `${t.inputCost}: ${money(cost.input)}`,
        `${t.outputCost}: ${money(cost.output)}`,
        `${t.perRequest}: ${money(cost.perRequest)}`,
        `${t.total} (${formatCount(usage.requests, locale)} ${t.times}): ${money(cost.total)}`,
        `${t.budget} ${formatMoney(parseNumber(budget), activeCurrency, locale)} → ${formatCount(covered, locale)} ${t.times}`,
      ].join("\n")
    : "";

  const row = (label: string, value: string, strong = false) => (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="min-w-0 flex-1 truncate text-sm text-foreground-muted">{label}</span>
      <span
        className={
          strong
            ? "shrink-0 font-mono text-sm font-semibold tabular-nums text-foreground"
            : "shrink-0 font-mono text-sm tabular-nums text-foreground-muted"
        }
      >
        {value}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2.5">
          <span className="text-xs font-medium text-foreground-muted">{t.rates}</span>
          {locale === "zh" && (
            <Segmented
              ariaLabel={t.currency}
              value={currency}
              onChange={setCurrency}
              options={[
                { value: "USD", label: "USD" },
                { value: "CNY", label: "CNY" },
              ]}
            />
          )}
        </header>
        <div className="grid gap-x-6 gap-y-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t.inputPrice} suffix={priceUnit} value={inputPrice} onChange={setInputPrice} />
          <Field label={t.outputPrice} suffix={priceUnit} value={outputPrice} onChange={setOutputPrice} />
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="border-b border-border px-4 py-2.5">
          <span className="text-xs font-medium text-foreground-muted">{t.usage}</span>
        </header>
        <div className="grid gap-x-6 gap-y-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t.inputTokens} suffix="tokens" value={inputTokens} onChange={setInputTokens} />
          <Field label={t.outputTokens} suffix="tokens" value={outputTokens} onChange={setOutputTokens} />
          <Field label={t.requests} suffix={t.times} value={requests} onChange={setRequests} />
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-11 items-center gap-2 border-b border-border px-4">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.results}
          </span>
          <div className="ml-auto">
            <CopyButton value={summary} />
          </div>
        </header>

        <div className="divide-y divide-border">
          {row(`${t.inputCost} · ${formatCount(usage.inputTokens, locale)} tokens`, money(cost.input))}
          {row(`${t.outputCost} · ${formatCount(usage.outputTokens, locale)} tokens`, money(cost.output))}
          {row(t.perRequest, money(cost.perRequest), true)}
          {row(
            `${t.total} · ${formatCount(usage.requests, locale)} ${t.times}`,
            money(cost.total),
            true
          )}
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2.5">
          <span className="text-[11px] text-foreground-faint">{t.budget}</span>
          <span className="flex items-center gap-1.5">
            <Input
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              inputMode="decimal"
              spellCheck={false}
              aria-label={t.budget}
              size="xs"
              className="w-24 font-mono text-xs"
            />
            <span className="text-[11px] tabular-nums text-foreground-faint">{currencySign}</span>
          </span>
          <span className="text-[11px] text-foreground-faint">→</span>
          <span className="text-[11px] text-foreground-faint">{t.budgetResult}</span>
          <span className="font-mono text-xs tabular-nums text-foreground-muted">
            {ready ? `${formatCount(covered, locale)} ${t.times}` : t.needPrice}
          </span>
        </footer>
      </section>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
