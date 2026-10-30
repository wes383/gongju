"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { estimateStrength, type StrengthIssue } from "@/lib/random";
import { useCopy } from "@/components/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    password: "密码",
    placeholder: "输入要检测的密码…",
    show: "显示",
    hide: "隐藏",
    labels: ["很弱", "弱", "中等", "强", "很强"],
    entropy: "估算熵",
    charset: "字符集大小",
    crackTime: "离线破解时间",
    issues: "发现的问题",
    none: "没有发现明显弱点",
    empty: "输入密码后开始检测",
    instant: "瞬间",
    seconds: "秒",
    minutes: "分钟",
    hours: "小时",
    days: "天",
    years: "年",
    centuries: "世纪",
    issueLabels: {
      tooShort: "长度不足 8 位",
      common: "这是常见密码，字典里就有",
      repeated: "有连续重复字符（如 aaa）",
      sequence: "有连续字符序列（如 abc、123）",
      keyboard: "有键盘相邻序列（如 qwe、asd）",
      digitsOnly: "全是数字",
      singleClass: "只用了一种字符类型",
      longButSimple: "虽然很长，但只用了一种字符类型",
      empty: "还没有输入",
    },
    note: "强度按字符集与长度估算熵，并对常见密码、重复、序列、键盘串做扣分。这里不做联网查询，密码不会离开浏览器。",
  },
  en: {
    password: "Password",
    placeholder: "Type a password to test…",
    show: "Show",
    hide: "Hide",
    labels: ["Very weak", "Weak", "Fair", "Strong", "Very strong"],
    entropy: "Estimated entropy",
    charset: "Character set",
    crackTime: "Offline crack time",
    issues: "Issues found",
    none: "No obvious weaknesses",
    empty: "Enter a password to start",
    instant: "instant",
    seconds: "seconds",
    minutes: "minutes",
    hours: "hours",
    days: "days",
    years: "years",
    centuries: "centuries",
    issueLabels: {
      tooShort: "Shorter than 8 characters",
      common: "A common password that appears in wordlists",
      repeated: "Contains a repeated run (e.g. aaa)",
      sequence: "Contains a sequence (e.g. abc, 123)",
      keyboard: "Contains a keyboard run (e.g. qwe, asd)",
      digitsOnly: "Digits only",
      singleClass: "Uses a single character class",
      longButSimple: "Long, but still only one character class",
      empty: "Nothing entered yet",
    },
    note: "Entropy is estimated from length and character set, with penalties for common passwords, repeats, sequences and keyboard runs. Nothing is sent anywhere.",
  },
};

const BAR_COLORS = ["bg-red", "bg-orange", "bg-yellow", "bg-green", "bg-green"];

export function PasswordStrengthTool() {
  const t = useCopy(COPY);
  const [password, setPassword] = React.useState("");
  const [visible, setVisible] = React.useState(false);

  const result = React.useMemo(() => estimateStrength(password), [password]);

  const crackTime = (seconds: number): string => {
    if (seconds < 1) return t.instant;
    if (seconds < 60) return `${Math.round(seconds)} ${t.seconds}`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} ${t.minutes}`;
    if (seconds < 86_400) return `${Math.round(seconds / 3600)} ${t.hours}`;
    if (seconds < 31_536_000) return `${Math.round(seconds / 86_400)} ${t.days}`;
    const years = seconds / 31_536_000;
    if (years < 100) return `${Math.round(years)} ${t.years}`;
    return `${Math.round(years / 100)} ${t.centuries}`;
  };

  const issues = result.issues.filter((issue) => issue !== "empty");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
        <div className="flex items-center gap-2">
          <Input
            type={visible ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.placeholder}
            aria-label={t.password}
            autoComplete="off"
            spellCheck={false}
            className="font-mono text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? t.hide : t.show}
            title={visible ? t.hide : t.show}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_, segment) => (
            <span
              key={segment}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                password && segment <= result.score ? BAR_COLORS[result.score] : "bg-hover-bg"
              )}
            />
          ))}
        </div>
      </div>

      {!password ? (
        <p className="py-10 text-center text-sm text-foreground-subtle">{t.empty}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: t.labels[result.score], value: `${result.score + 1}/5`, highlight: true },
              { label: t.entropy, value: `${result.bits} bit` },
              { label: t.charset, value: String(result.charsetSize) },
              { label: t.crackTime, value: crackTime(result.crackSeconds) },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col gap-1 rounded-lg border border-border bg-surface px-4 py-3"
              >
                <span className="text-[11px] leading-tight text-foreground-subtle">
                  {item.label}
                </span>
                <span
                  className={cn(
                    "font-display text-lg font-semibold tabular-nums",
                    item.highlight ? "text-foreground" : "text-foreground"
                  )}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
            <span className="text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.issues}
            </span>
            {issues.length === 0 ? (
              <span className="text-sm text-green-fg">{t.none}</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {issues.map((issue: StrengthIssue) => (
                  <Badge key={issue} variant="warning" size="sm">
                    {t.issueLabels[issue as keyof typeof t.issueLabels]}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
