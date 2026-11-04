"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import {
  DualPane,
  OptionBar,
  SampleButton,
  Segmented,
} from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import {
  ALL_KINDS,
  SENSITIVE_KINDS,
  countByKind,
  redactText,
  type RedactMode,
  type SensitiveKind,
} from "@/lib/redact";
import { cn } from "@/lib/utils";

const SAMPLE_ZH = `客户：张伟
手机：13812345678
身份证：11010519491231002X
邮箱：zhangwei@example.com
收款卡：4111 1111 1111 1111
来源 IP：192.168.1.20`;

const SAMPLE_EN = `Customer: Zhang Wei
Phone: 13812345678
ID: 11010519491231002X
Email: zhangwei@example.com
Card: 4111 1111 1111 1111
Source IP: 192.168.1.20`;

const COPY = {
  zh: {
    mode: "处理方式",
    mask: "部分遮盖",
    replace: "整体替换",
    keepFormat: "保留格式",
    kinds: "识别类型",
    inputLabel: "原文",
    outputLabel: "脱敏结果",
    placeholder: "粘贴包含手机号、身份证号、邮箱等信息的文本…",
    sample: "示例",
    hits: (kind: string, count: number) => `${kind} ${count}`,
    noHits: "没有识别到敏感信息",
    note: "识别基于格式与校验位（身份证校验码、银行卡 Luhn），只能作为辅助手段，不保证覆盖全部敏感信息；姓名、地址等自由文本无法可靠识别，请人工复核后再对外发送。",
    local: "文本只在本机处理，不会上传。",
  },
  en: {
    mode: "Mode",
    mask: "Mask",
    replace: "Replace",
    keepFormat: "Keep layout",
    kinds: "Detect",
    inputLabel: "Input",
    outputLabel: "Redacted",
    placeholder: "Paste text containing phone numbers, ID numbers, emails and so on…",
    sample: "Sample",
    hits: (kind: string, count: number) => `${kind} ${count}`,
    noHits: "No sensitive data detected",
    note: "Detection relies on patterns plus checksums (ID check digit, card Luhn), so it is an assist rather than a guarantee. Free-form names and addresses cannot be detected reliably — review before sharing.",
    local: "Text is processed on your device and never uploaded.",
  },
};

export function RedactTextTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [input, setInput] = React.useState("");
  const [mode, setMode] = React.useState<RedactMode>("mask");
  const [kinds, setKinds] = React.useState<SensitiveKind[]>(ALL_KINDS);

  const result = React.useMemo(
    () => redactText(input, { mode, kinds, locale }),
    [input, mode, kinds, locale]
  );

  const counts = React.useMemo(
    () => countByKind(result.matches, kinds).filter((item) => item.count > 0),
    [result.matches, kinds]
  );

  const toggleKind = (kind: SensitiveKind) => {
    setKinds((prev) => {
      if (!prev.includes(kind)) return [...prev, kind];
      const next = prev.filter((item) => item !== kind);
      // An empty selection would silently disable the tool
      return next.length === 0 ? prev : next;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.mode}
          value={mode}
          onChange={setMode}
          options={[
            { value: "mask", label: t.mask },
            { value: "replace", label: t.replace },
            { value: "keep-format", label: t.keepFormat },
          ]}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-foreground-muted">{t.kinds}</span>
          {SENSITIVE_KINDS.map((item) => {
            const active = kinds.includes(item.value);
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => toggleKind(item.value)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] transition-colors duration-base ease-out",
                  active
                    ? "border-transparent bg-accent text-accent-fg"
                    : "border-border bg-surface text-foreground-muted hover:bg-hover-bg hover:text-foreground"
                )}
              >
                {locale === "zh" ? item.zh : item.en}
              </button>
            );
          })}
        </div>
        {input.trim() && (
          <div className="ml-auto flex flex-wrap items-center gap-2 font-mono text-[11px] text-foreground-subtle">
            <ShieldCheck className="h-3.5 w-3.5 text-green-fg" />
            {counts.length === 0
              ? t.noHits
              : counts.map((item) => {
                  const kind = SENSITIVE_KINDS.find((entry) => entry.value === item.kind)!;
                  return (
                    <span key={item.kind}>
                      {t.hits(locale === "zh" ? kind.zh : kind.en, item.count)}
                    </span>
                  );
                })}
          </div>
        )}
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={result.text}
        inputLabel={t.inputLabel}
        outputLabel={t.outputLabel}
        inputPlaceholder={t.placeholder}
        inputActions={
          <SampleButton
            label={t.sample}
            onClick={() => setInput(locale === "zh" ? SAMPLE_ZH : SAMPLE_EN)}
          />
        }
        onClear={() => setInput("")}
        inputDrop={{ onText: (text) => setInput(text) }}
      />

      <div className="flex flex-col gap-1 text-xs leading-relaxed text-foreground-subtle">
        <p>{t.note}</p>
        <p>{t.local}</p>
      </div>
    </div>
  );
}
