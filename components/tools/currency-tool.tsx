"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CopyButton, ErrorNote, SwapButton } from "@/components/tools/tool-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText } from "@/lib/errors";
import { CURRENCIES, fetchRate, type RateQuote } from "@/lib/currency";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    amount: "金额",
    from: "从",
    to: "到",
    result: "换算结果",
    rate: "汇率",
    updated: "更新于",
    refresh: "刷新汇率",
    loading: "正在获取汇率…",
    inverse: "反向",
    note: "汇率来自 Frankfurter（欧洲央行等官方数据），每个工作日更新一次。请求只发送货币代码，金额始终留在本机。",
    source: "数据来源：frankfurter.dev",
    invalid: "请输入金额",
  },
  en: {
    amount: "Amount",
    from: "From",
    to: "To",
    result: "Converted",
    rate: "Rate",
    updated: "Updated",
    refresh: "Refresh rate",
    loading: "Fetching rate…",
    inverse: "Inverse",
    note: "Rates come from Frankfurter (ECB and other central banks) and update once per working day. Only the currency codes are sent; the amount stays on your device.",
    source: "Source: frankfurter.dev",
    invalid: "Enter an amount",
  },
};

const DEFAULT_FROM = "USD";
const DEFAULT_TO = "CNY";

function currencyOf(code: string) {
  return CURRENCIES.find((item) => item.code === code) ?? CURRENCIES[0];
}

export function CurrencyTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [amount, setAmount] = React.useState("100");
  const [from, setFrom] = React.useState(DEFAULT_FROM);
  const [to, setTo] = React.useState(DEFAULT_TO);
  const [nonce, setNonce] = React.useState(0);
  // A manual refresh bypasses the cache once; later pair changes read it again
  const forceNext = React.useRef(false);
  // The pair is stored with the answer, so a stale reply can never show up
  // under a different pair — no loading flag to keep in sync
  const [entry, setEntry] = React.useState<{ from: string; to: string; quote: RateQuote } | null>(null);
  const [failure, setFailure] = React.useState<{ from: string; to: string; error: unknown } | null>(
    null
  );

  React.useEffect(() => {
    let cancelled = false;
    fetchRate(from, to, forceNext.current)
      .then((next) => {
        forceNext.current = false;
        if (!cancelled) setEntry({ from, to, quote: next });
      })
      .catch((err: unknown) => {
        forceNext.current = false;
        if (!cancelled) setFailure({ from, to, error: err });
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, nonce]);

  const quote = entry && entry.from === from && entry.to === to ? entry.quote : null;
  const error = failure && failure.from === from && failure.to === to ? failure.error : null;
  const loading = !quote && !error;

  const parsed = Number(amount.replace(/,/g, ""));
  const valid = amount.trim() !== "" && Number.isFinite(parsed);
  const rate = quote?.rate ?? NaN;
  const converted = valid && Number.isFinite(rate) ? parsed * rate : NaN;

  const formatMoney = (value: number) => {
    if (!Number.isFinite(value)) return "—";
    const digits = Math.abs(value) < 1 ? 4 : 2;
    return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: digits,
    }).format(value);
  };

  const label = (code: string) => {
    const item = currencyOf(code);
    return `${item.code} ${locale === "zh" ? item.zh : item.en}`;
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center">
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label={t.amount}
          inputMode="decimal"
          spellCheck={false}
          className="font-mono text-sm sm:w-40"
        />

        <div className="flex flex-1 items-center gap-2">
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger size="sm" aria-label={t.from} className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((item) => (
                <SelectItem key={item.code} value={item.code}>
                  {label(item.code)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <SwapButton onClick={swap} />

          <Select value={to} onValueChange={setTo}>
            <SelectTrigger size="sm" aria-label={t.to} className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((item) => (
                <SelectItem key={item.code} value={item.code}>
                  {label(item.code)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <ErrorNote>{errorText(error, locale)}</ErrorNote>
      ) : (
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-10 items-center gap-2 border-b border-border px-3">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.result}
            </span>
            <div className="ml-auto flex items-center gap-1">
              {valid && !loading && Number.isFinite(converted) && (
                <CopyButton value={formatMoney(converted)} size="icon-xs" />
              )}
              <button
                type="button"
                onClick={() => {
                  forceNext.current = true;
                  setNonce((n) => n + 1);
                }}
                aria-label={t.refresh}
                title={t.refresh}
                className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-subtle transition-colors hover:bg-hover-bg hover:text-foreground"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              </button>
            </div>
          </header>

          <div className="px-4 py-4">
            {loading ? (
              <p className="text-sm text-foreground-subtle">{t.loading}</p>
            ) : (
              <p className="flex flex-wrap items-baseline gap-2">
                <span className="text-lg text-foreground-muted">{currencyOf(to).symbol}</span>
                <span className="break-all font-mono text-2xl font-medium text-foreground">
                  {valid ? formatMoney(converted) : "—"}
                </span>
                <span className="font-mono text-sm text-foreground-muted">{to}</span>
                {!valid && <span className="text-xs text-foreground-subtle">{t.invalid}</span>}
              </p>
            )}

            <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
              <div className="flex items-baseline gap-2">
                <dt className="text-foreground-subtle">{t.rate}</dt>
                <dd className="font-mono text-foreground">
                  1 {from} = {Number.isFinite(rate) ? formatMoney(rate) : "—"} {to}
                </dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="text-foreground-subtle">{t.inverse}</dt>
                <dd className="font-mono text-foreground-muted">
                  1 {to} = {Number.isFinite(rate) && rate !== 0 ? formatMoney(1 / rate) : "—"} {from}
                </dd>
              </div>
              {quote?.date && (
                <div className="flex items-baseline gap-2">
                  <dt className="text-foreground-subtle">{t.updated}</dt>
                  <dd className="font-mono text-foreground-muted">{quote.date}</dd>
                </div>
              )}
            </dl>
          </div>
        </section>
      )}

      <p className="text-[11px] leading-relaxed text-foreground-subtle">
        {t.note}{" "}
        <a
          href="https://frankfurter.dev"
          target="_blank"
          rel="noreferrer"
          className="text-foreground-muted underline decoration-border-strong underline-offset-2 hover:text-foreground"
        >
          {t.source}
        </a>
      </p>
    </div>
  );
}
