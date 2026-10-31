"use client";

import * as React from "react";
import { Keyboard, Trash2 } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/tools/tool-ui";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    press: "在页面上按下任意键",
    hint: "焦点不在输入框时，按键会被这个工具接管",
    key: "key",
    code: "code",
    keyCode: "keyCode",
    location: "位置",
    modifiers: "修饰键",
    repeat: "长按重复",
    prevent: "阻止默认行为",
    history: "最近按键",
    clear: "清空",
    none: "还没有记录",
    yes: "是",
    no: "否",
    keyHint: "字符（受键盘布局与 Shift 影响）",
    codeHint: "物理键位（不受布局影响）",
    locationNames: { 0: "标准", 1: "左侧", 2: "右侧", 3: "小键盘" } as Record<number, string>,
    note: "Ctrl+W、Ctrl+T 等组合会被浏览器先截获，页面收不到事件，此时只剩下一个 key 值。keyCode 与 which 已经废弃，这里保留是为了对照旧代码。",
  },
  en: {
    press: "Press any key on the page",
    hint: "Keeps focus off inputs so the tool receives the keystroke",
    key: "key",
    code: "code",
    keyCode: "keyCode",
    location: "Location",
    modifiers: "Modifiers",
    repeat: "Auto-repeat",
    prevent: "Prevent default",
    history: "Recent keys",
    clear: "Clear",
    none: "Nothing yet",
    yes: "yes",
    no: "no",
    keyHint: "The character, shaped by layout and Shift",
    codeHint: "The physical key, independent of layout",
    locationNames: { 0: "Standard", 1: "Left", 2: "Right", 3: "Numpad" } as Record<number, string>,
    note: "Combos like Ctrl+W or Ctrl+T are swallowed by the browser and never reach the page, so only a bare key value arrives. keyCode and which are deprecated — they are shown for comparing against older code.",
  },
};

interface PressInfo {
  id: number;
  key: string;
  code: string;
  keyCode: number;
  location: number;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  repeat: boolean;
}

function displayKey(key: string): string {
  if (key === " ") return "Space";
  if (key === "Enter") return "↵";
  if (key === "Tab") return "⇥";
  if (key === "Backspace") return "⌫";
  if (key === "Escape") return "Esc";
  return key;
}

export function KeyEventTool() {
  const t = useCopy(COPY);
  const [current, setCurrent] = React.useState<PressInfo | null>(null);
  const [history, setHistory] = React.useState<PressInfo[]>([]);
  const [prevent, setPrevent] = React.useState(false);
  const preventRef = React.useRef(false);
  const seq = React.useRef(0);

  React.useEffect(() => {
    preventRef.current = prevent;
  }, [prevent]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (preventRef.current) event.preventDefault();
      const info: PressInfo = {
        id: (seq.current += 1),
        key: event.key,
        code: event.code,
        keyCode: event.keyCode,
        location: event.location,
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        alt: event.altKey,
        meta: event.metaKey,
        repeat: event.repeat,
      };
      setCurrent(info);
      setHistory((prev) => [info, ...prev].slice(0, 12));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const modifiers = current
    ? [
        current.ctrl && "Ctrl",
        current.shift && "Shift",
        current.alt && "Alt",
        current.meta && "Meta",
      ].filter(Boolean)
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
        <Toggle checked={prevent} onChange={setPrevent} label={t.prevent} hint={t.hint} />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-foreground-faint">{t.hint}</span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => {
              setHistory([]);
              setCurrent(null);
            }}
            className="gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t.clear}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface py-10",
          current ? "border-solid" : ""
        )}
      >
        {current ? (
          <>
            <span className="break-all font-mono text-4xl font-semibold text-foreground">
              {displayKey(current.key)}
            </span>
            <span className="font-mono text-xs text-foreground-subtle">{modifiers.join(" + ") || "—"}</span>
          </>
        ) : (
          <>
            <Keyboard className="h-6 w-6 text-foreground-faint" />
            <span className="text-sm text-foreground-subtle">{t.press}</span>
          </>
        )}
      </div>

      {current && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t.key} value={displayKey(current.key)} hint={t.keyHint} />
          <Field label={t.code} value={current.code} hint={t.codeHint} />
          <Field label={t.keyCode} value={String(current.keyCode)} />
          <Field label={t.location} value={t.locationNames[current.location] ?? String(current.location)} />
          <Field label={t.modifiers} value={modifiers.join(" + ") || "—"} />
          <Field label={t.repeat} value={current.repeat ? t.yes : t.no} />
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="border-b border-border px-4 py-2 text-xs font-medium text-foreground-muted">
          {t.history}
        </header>
        {history.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-foreground-faint">{t.none}</p>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 border-b border-border px-4 py-1.5 font-mono text-[11.5px] last:border-b-0"
            >
              <span className="w-20 shrink-0 truncate text-foreground">{displayKey(item.key)}</span>
              <span className="min-w-0 flex-1 truncate text-foreground-muted">{item.code}</span>
              <span className="shrink-0 text-foreground-faint">{item.keyCode}</span>
              <span className="w-24 shrink-0 text-right text-foreground-faint">
                {[
                  item.ctrl && "Ctrl",
                  item.shift && "Shift",
                  item.alt && "Alt",
                  item.meta && "Meta",
                ]
                  .filter(Boolean)
                  .join("+") || "—"}
              </span>
            </div>
          ))
        )}
      </section>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2" title={hint}>
      <p className="font-mono text-[10px] text-foreground-faint">{label}</p>
      <p className="mt-0.5 break-all font-mono text-[13px] text-foreground">{value}</p>
    </div>
  );
}
