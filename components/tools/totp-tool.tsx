"use client";

import * as React from "react";
import { Check, KeyRound, RefreshCw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton, ErrorNote } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText } from "@/lib/errors";
import {
  currentTotp,
  isBase32,
  parseOtpAuthUri,
  randomSecret,
  verifyTotp,
  type TotpAlgorithm,
} from "@/lib/totp";

const COPY = {
  zh: {
    secret: "密钥（Base32）",
    secretPlaceholder: "JBSWY3DPEHPK3PXP，或粘贴 otpauth:// 链接",
    digits: "位数",
    period: "周期",
    algorithm: "算法",
    generate: "随机密钥",
    current: "当前验证码",
    next: "下一个",
    remaining: (seconds: number) => `${seconds} 秒后刷新`,
    label: "账号 / 发行方",
    verify: "校验一个验证码",
    verifyPlaceholder: "输入 6 位验证码",
    verifyButton: "校验",
    verifyOk: "验证通过",
    verifyFail: "不匹配（已容忍前后 1 个周期）",
    invalidSecret: "密钥不是合法的 Base32：只允许 A–Z 与 2–7，空格和连字符会被忽略",
    note: "验证码由 Web Crypto 在本地计算，密钥不会离开这台设备。校验时允许前后各 1 个周期的时钟误差。",
    empty: "输入密钥后显示验证码",
  },
  en: {
    secret: "Secret (Base32)",
    secretPlaceholder: "JBSWY3DPEHPK3PXP, or paste an otpauth:// URI",
    digits: "Digits",
    period: "Period",
    algorithm: "Algorithm",
    generate: "Random secret",
    current: "Current code",
    next: "Next",
    remaining: (seconds: number) => `refreshes in ${seconds}s`,
    label: "Account / issuer",
    verify: "Verify a code",
    verifyPlaceholder: "Enter the 6-digit code",
    verifyButton: "Verify",
    verifyOk: "Verified",
    verifyFail: "No match (one step of drift is tolerated either way)",
    invalidSecret: "Not a valid Base32 secret: A–Z and 2–7 only, spaces and dashes are ignored",
    note: "Codes are computed locally with Web Crypto — the secret never leaves this device. Verification tolerates one period of clock drift in either direction.",
    empty: "Enter a secret to see the code",
  },
};

const ALGORITHMS: TotpAlgorithm[] = ["SHA-1", "SHA-256", "SHA-512"];

/** Whole seconds, ticking once a second while mounted */
function subscribeSecond(onChange: () => void): () => void {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

const currentSecond = () => Math.floor(Date.now() / 1000);
/** Prerender has no clock: 0 means "not hydrated yet" */
const noSecond = () => 0;

/**
 * The clock is read through useSyncExternalStore rather than a Date.now() call
 * during render, so the prerendered HTML stays stable and the value only comes
 * from the browser after hydration.
 */
function useSecond(): number {
  return React.useSyncExternalStore(subscribeSecond, currentSecond, noSecond);
}

export function TotpTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [secret, setSecret] = React.useState("JBSWY3DPEHPK3PXP");
  const [label, setLabel] = React.useState("");
  const [digits, setDigits] = React.useState(6);
  const [period, setPeriod] = React.useState(30);
  const [algorithm, setAlgorithm] = React.useState<TotpAlgorithm>("SHA-1");
  const now = useSecond();
  const [computed, setComputed] = React.useState<{
    key: string;
    code: string;
    next: string;
    remaining: number;
  } | null>(null);
  const [error, setError] = React.useState<unknown>(null);
  const [code, setCode] = React.useState("");
  const [verdict, setVerdict] = React.useState<"ok" | "fail" | null>(null);

  const valid = isBase32(secret);
  const ready = now > 0;

  // The step number is part of the key, so a stale code is ignored at render
  // time instead of being cleared inside the effect.
  const step = ready ? Math.floor(now / period) : 0;
  const key = `${secret}|${digits}|${period}|${algorithm}|${step}`;
  const state = computed && computed.key === key ? computed : null;

  React.useEffect(() => {
    if (!valid || !ready) return;
    let cancelled = false;
    currentTotp({ secret, digits, period, algorithm }, now * 1000)
      .then((result) => {
        if (cancelled) return;
        setComputed({ key, ...result });
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [key, secret, digits, period, algorithm, now, valid, ready]);

  const handleSecret = (value: string) => {
    if (value.trim().startsWith("otpauth://")) {
      const info = parseOtpAuthUri(value);
      if (info && info.secret) {
        setSecret(info.secret);
        setLabel(info.issuer || info.label);
        setDigits(info.digits);
        setPeriod(info.period);
        setAlgorithm(info.algorithm);
        return;
      }
    }
    setSecret(value);
  };

  const verify = async () => {
    if (!valid || !code.trim()) return;
    const ok = await verifyTotp(code.trim(), { secret, digits, period, algorithm }, 1, Date.now());
    setVerdict(ok ? "ok" : "fail");
  };

  const progress = state ? (state.remaining / period) * 100 : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-foreground-subtle">{t.secret}</span>
          <div className="flex items-center gap-2">
            <Input
              value={secret}
              onChange={(event) => handleSecret(event.target.value)}
              placeholder={t.secretPlaceholder}
              spellCheck={false}
              autoComplete="off"
              className="font-mono text-sm"
              size="xs"
            />
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setSecret(randomSecret())}
              title={t.generate}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.generate}</span>
            </Button>
          </div>
        </label>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-foreground-subtle">{t.digits}</span>
            <Select value={String(digits)} onValueChange={(value) => setDigits(Number(value))}>
              <SelectTrigger size="xs" aria-label={t.digits} className="w-[72px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[6, 7, 8].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-foreground-subtle">{t.period}</span>
            <Select value={String(period)} onValueChange={(value) => setPeriod(Number(value))}>
              <SelectTrigger size="xs" aria-label={t.period} className="w-[72px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[30, 60].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value}s
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-foreground-subtle">{t.algorithm}</span>
            <Select value={algorithm} onValueChange={(value) => setAlgorithm(value as TotpAlgorithm)}>
              <SelectTrigger size="xs" aria-label={t.algorithm} className="w-[104px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALGORITHMS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          {label && (
            <span className="text-xs text-foreground-muted">
              {t.label}: <span className="text-foreground">{label}</span>
            </span>
          )}
        </div>
      </div>

      {!valid && secret.trim() !== "" && <ErrorNote>{t.invalidSecret}</ErrorNote>}
      {error ? <ErrorNote>{errorText(error, locale)}</ErrorNote> : null}

      <div className="rounded-lg border border-border bg-surface">
        <div className="flex flex-col items-center gap-2 px-4 py-7">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.current}
          </span>
          {state ? (
            <>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[40px] font-semibold leading-none tracking-[0.18em] text-foreground">
                  {state.code.slice(0, Math.ceil(digits / 2))}
                  <span className="text-foreground-subtle"> </span>
                  {state.code.slice(Math.ceil(digits / 2))}
                </span>
                <CopyButton value={state.code} size="icon-sm" />
              </div>
              <div className="h-1 w-full max-w-[280px] overflow-hidden rounded-full bg-hover-bg-strong">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-1000 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[11px] text-foreground-faint">
                {t.remaining(state.remaining)} · {t.next} {state.next}
              </span>
            </>
          ) : (
            <span className="py-4 text-xs text-foreground-faint">{t.empty}</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-surface p-3">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1">
          <span className="text-[11px] font-medium text-foreground-subtle">{t.verify}</span>
          <Input
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/[^\d]/g, "").slice(0, digits));
              setVerdict(null);
            }}
            placeholder={t.verifyPlaceholder}
            inputMode="numeric"
            className="font-mono text-sm tracking-[0.3em]"
            size="xs"
          />
        </label>
        <Button type="button" size="xs" onClick={verify} disabled={!valid || code.length < 4}>
          <KeyRound className="h-3.5 w-3.5" />
          {t.verifyButton}
        </Button>
        {verdict === "ok" && (
          <Badge variant="success" size="sm">
            <Check className="h-3 w-3" />
            {t.verifyOk}
          </Badge>
        )}
        {verdict === "fail" && (
          <Badge variant="danger" size="sm">
            <X className="h-3 w-3" />
            {t.verifyFail}
          </Badge>
        )}
      </div>

      <p className="px-1 text-[11px] leading-relaxed text-foreground-faint">{t.note}</p>
    </div>
  );
}
