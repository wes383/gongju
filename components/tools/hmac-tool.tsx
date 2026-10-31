"use client";

import * as React from "react";
import { HMAC_ALGORITHMS, hexToBase64, hmacText, type HmacAlgorithm } from "@/lib/hash";
import { errorText } from "@/lib/errors";
import { useCopy, useLocale } from "@/components/locale-provider";
import { CopyButton, ErrorNote, OptionBar, SampleButton, Segmented } from "@/components/tools/tool-ui";
import { Input } from "@/components/ui/input";

const COPY = {
  zh: {
    key: "密钥",
    keyPlaceholder: "输入密钥（secret）",
    message: "消息",
    messagePlaceholder: "输入要签名的消息…",
    sample: "示例",
    sampleKey: "gongju-secret",
    sampleMessage: "message to sign",
    hex: "十六进制",
    base64: "Base64",
    output: "签名结果",
    empty: "输入密钥和消息后自动计算",
    note: "HMAC 不是「先拼接密钥再哈希」，它对密钥和消息分别做两轮哈希，能抵御长度扩展攻击。",
    uppercase: "大写",
  },
  en: {
    key: "Key",
    keyPlaceholder: "Secret key",
    message: "Message",
    messagePlaceholder: "Message to sign…",
    sample: "Sample",
    sampleKey: "gongju-secret",
    sampleMessage: "message to sign",
    hex: "Hex",
    base64: "Base64",
    output: "Signature",
    empty: "Enter a key and a message",
    note: "HMAC is not hash(key + message): it hashes in two passes so length-extension attacks do not apply.",
    uppercase: "Uppercase",
  },
};

export function HmacTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [key, setKey] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [algorithm, setAlgorithm] = React.useState<HmacAlgorithm>("SHA-256");
  const [format, setFormat] = React.useState<"hex" | "base64">("hex");
  const [uppercase, setUppercase] = React.useState(false);
  const [signature, setSignature] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!key && !message) {
      const id = window.setTimeout(() => {
        setSignature("");
        setError(null);
      }, 0);
      return () => window.clearTimeout(id);
    }

    let cancelled = false;
    const id = window.setTimeout(async () => {
      try {
        const hex = await hmacText(algorithm, key, message);
        if (cancelled) return;
        setSignature(hex);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setSignature("");
        setError(errorText(e, locale));
      }
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [key, message, algorithm, locale]);

  const display = signature
    ? format === "hex"
      ? uppercase
        ? signature.toUpperCase()
        : signature
      : hexToBase64(signature)
    : "";

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.output}
          value={algorithm}
          onChange={setAlgorithm}
          options={HMAC_ALGORITHMS.map((a) => ({ value: a.value, label: a.label }))}
        />
        <Segmented
          ariaLabel={t.hex}
          value={format}
          onChange={setFormat}
          options={[
            { value: "hex", label: t.hex },
            { value: "base64", label: t.base64 },
          ]}
        />
        {format === "hex" && (
          <button
            type="button"
            onClick={() => setUppercase((v) => !v)}
            aria-pressed={uppercase}
            className="rounded-full border border-border px-3 py-1 text-[11px] text-foreground-muted transition-colors hover:border-border-strong hover:text-foreground"
          >
            {t.uppercase}
          </button>
        )}
      </OptionBar>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="w-16 shrink-0 text-xs text-foreground-muted">{t.key}</span>
          <Input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={t.keyPlaceholder}
            aria-label={t.key}
            spellCheck={false}
            className="font-mono text-sm"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs text-foreground-muted">{t.message}</span>
            <SampleButton
              onClick={() => {
                setKey(t.sampleKey);
                setMessage(t.sampleMessage);
              }}
            />
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            spellCheck={false}
            placeholder={t.messagePlaceholder}
            aria-label={t.message}
            className="min-h-[100px] w-full resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-[13px] leading-relaxed text-foreground placeholder:text-foreground-faint focus:border-border-strong focus:outline-none"
          />
        </div>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-11 items-center gap-2 border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.output}
          </span>
          <div className="ml-auto">
            <CopyButton value={display} />
          </div>
        </header>
        <pre className="min-h-[64px] whitespace-pre-wrap break-all px-3.5 py-3 font-mono text-[12.5px] leading-relaxed text-foreground">
          {display || <span className="text-foreground-faint">{t.empty}</span>}
        </pre>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
