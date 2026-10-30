"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { estimateStrength, generatePassword, type PasswordOptions } from "@/lib/random";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { CopyButton, OptionBar, Toggle } from "@/components/tools/tool-ui";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    length: "长度",
    count: "数量",
    upper: "大写字母",
    lower: "小写字母",
    digits: "数字",
    symbols: "符号",
    avoid: "排除易混淆字符",
    avoidHint: "去掉 0 O 1 l I | 等肉眼难分的字符",
    generate: "重新生成",
    strength: "强度",
    labels: ["很弱", "弱", "中等", "强", "很强"],
    noCharset: "至少选择一种字符集",
    note: "使用 crypto.getRandomValues 生成；密码只在本机生成，不会上传。",
  },
  en: {
    length: "Length",
    count: "Count",
    upper: "Uppercase",
    lower: "Lowercase",
    digits: "Digits",
    symbols: "Symbols",
    avoid: "Avoid ambiguous",
    avoidHint: "Drops look-alikes such as 0 O 1 l I |",
    generate: "Regenerate",
    strength: "Strength",
    labels: ["Very weak", "Weak", "Fair", "Strong", "Very strong"],
    noCharset: "Pick at least one character set",
    note: "Generated with crypto.getRandomValues. Passwords stay on your machine.",
  },
};

const BAR_COLORS = ["bg-red", "bg-orange", "bg-yellow", "bg-green", "bg-green"];

export function PasswordGeneratorTool() {
  const t = useCopy(COPY);
  const [options, setOptions] = React.useState<PasswordOptions>({
    length: 20,
    upper: true,
    lower: true,
    digits: true,
    symbols: true,
    avoidAmbiguous: true,
  });
  const [count, setCount] = React.useState(5);
  const [nonce, setNonce] = React.useState(0);
  const [passwords, setPasswords] = React.useState<string[]>([]);

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      setPasswords(
        Array.from({ length: Math.min(Math.max(count, 1), 50) }, () => generatePassword(options))
      );
    }, 0);
    return () => window.clearTimeout(id);
  }, [options, count, nonce]);

  const set = <K extends keyof PasswordOptions>(key: K) => (value: PasswordOptions[K]) =>
    setOptions((prev) => ({ ...prev, [key]: value }));

  const none = !options.upper && !options.lower && !options.digits && !options.symbols;
  const strength = passwords[0] ? estimateStrength(passwords[0]) : null;

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground-muted">{t.length}</span>
          <Input
            type="number"
            min={4}
            max={64}
            value={options.length}
            onChange={(e) =>
              set("length")(Math.min(Math.max(Number(e.target.value) || 4, 4), 64))
            }
            aria-label={t.length}
            size="xs"
            className="w-16 text-center font-mono"
          />
        </div>
        <input
          type="range"
          min={4}
          max={64}
          value={options.length}
          onChange={(e) => set("length")(Number(e.target.value))}
          aria-label={t.length}
          className="w-32 accent-[var(--accent)]"
        />
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground-muted">{t.count}</span>
          <Input
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(Math.min(Math.max(Number(e.target.value) || 1, 1), 50))}
            aria-label={t.count}
            size="xs"
            className="w-16 text-center font-mono"
          />
        </div>
        <Button
          type="button"
          variant="default"
          size="xs"
          onClick={() => setNonce((n) => n + 1)}
          className="ml-auto gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t.generate}
        </Button>
      </OptionBar>

      <OptionBar>
        <Toggle checked={options.upper} onChange={set("upper")} label="A-Z" />
        <Toggle checked={options.lower} onChange={set("lower")} label="a-z" />
        <Toggle checked={options.digits} onChange={set("digits")} label="0-9" />
        <Toggle checked={options.symbols} onChange={set("symbols")} label="!@#" />
        <Toggle
          checked={options.avoidAmbiguous}
          onChange={set("avoidAmbiguous")}
          label={t.avoid}
          hint={t.avoidHint}
        />
      </OptionBar>

      {none ? (
        <p className="py-10 text-center text-sm text-red-fg">{t.noCharset}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {passwords.map((password, i) => {
            const result = estimateStrength(password);
            return (
              <div
                key={`${password}-${i}`}
                className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
              >
                <code className="min-w-0 flex-1 break-all font-mono text-[13px] text-foreground">
                  {password}
                </code>
                <div className="flex shrink-0 items-center gap-1" title={t.labels[result.score]}>
                  {Array.from({ length: 5 }, (_, segment) => (
                    <span
                      key={segment}
                      className={cn(
                        "h-1 w-3 rounded-full",
                        segment <= result.score ? BAR_COLORS[result.score] : "bg-hover-bg"
                      )}
                    />
                  ))}
                </div>
                <CopyButton value={password} size="icon-xs" />
              </div>
            );
          })}
        </div>
      )}

      {strength && (
        <p className="text-xs text-foreground-muted">
          {t.strength}: {t.labels[strength.score]} · {strength.bits} bit
        </p>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
