"use client";

import * as React from "react";
import { Dices, Shuffle } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptionBar, Segmented, WarningNote } from "@/components/tools/tool-ui";
import { drawSample, rollDice } from "@/lib/chance";

type Mode = "dice" | "draw";

const PRESETS = [4, 6, 8, 10, 12, 20];

const COPY = {
  zh: {
    mode: "模式",
    dice: "骰子",
    draw: "抽签",
    sides: "面数",
    custom: "自定义",
    count: "数量",
    roll: "掷一次",
    total: "合计",
    each: "点数",
    history: "最近记录",
    noHistory: "还没有记录",
    names: "名单",
    namesHint: "每行一个名字",
    pool: (n: number) => `名单共 ${n} 人`,
    pick: "抽几人",
    drawAction: "开始抽签",
    picked: "抽中",
    notEnough: "名单人数少于要抽的人数，已抽出全部",
    emptyPool: "请先在名单里填写至少一个名字",
    noteDice: "每颗骰子独立均匀随机，使用 crypto.getRandomValues。",
    noteDraw: "抽签不放回，同一次结果里不会出现重复的名字。",
    defaultNames: "张三\n李四\n王五\n赵六\n钱七\n孙八",
  },
  en: {
    mode: "Mode",
    dice: "Dice",
    draw: "Draw lots",
    sides: "Sides",
    custom: "Custom",
    count: "Count",
    roll: "Roll",
    total: "Total",
    each: "Rolls",
    history: "Recent rolls",
    noHistory: "Nothing yet",
    names: "Entries",
    namesHint: "One name per line",
    pool: (n: number) => `${n} entr${n === 1 ? "y" : "ies"}`,
    pick: "How many",
    drawAction: "Draw",
    picked: "Picked",
    notEnough: "Fewer entries than requested — every entry was drawn",
    emptyPool: "Add at least one name first",
    noteDice: "Every die is independent and uniform, drawn with crypto.getRandomValues.",
    noteDraw: "Drawn without replacement, so a single result never repeats a name.",
    defaultNames: "Alice\nBob\nCarol\nDave\nErin\nFrank",
  },
};

interface RollRecord {
  key: number;
  sides: number;
  count: number;
  values: number[];
}

export function DiceTool() {
  const t = useCopy(COPY);
  const [mode, setMode] = React.useState<Mode>("dice");
  const [sides, setSides] = React.useState(6);
  const [diceCount, setDiceCount] = React.useState(2);
  const [values, setValues] = React.useState<number[]>([]);
  const [history, setHistory] = React.useState<RollRecord[]>([]);
  const [names, setNames] = React.useState(t.defaultNames);
  const [pickCount, setPickCount] = React.useState(1);
  const [picked, setPicked] = React.useState<string[]>([]);
  const [problem, setProblem] = React.useState<string | null>(null);

  const pool = names
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const roll = () => {
    const next = rollDice(sides, diceCount);
    setValues(next);
    setHistory((prev) =>
      [{ key: Date.now(), sides, count: diceCount, values: next }, ...prev].slice(0, 8)
    );
  };

  const draw = () => {
    if (pool.length === 0) {
      setProblem(t.emptyPool);
      setPicked([]);
      return;
    }
    setProblem(pickCount > pool.length ? t.notEnough : null);
    setPicked(drawSample(pool, pickCount));
  };

  // Roll once on mount so the panel is not empty; runs on the client only
  React.useEffect(() => {
    const id = window.setTimeout(() => {
      const next = rollDice(6, 2);
      setValues(next);
      setHistory([{ key: Date.now(), sides: 6, count: 2, values: next }]);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const total = values.reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.mode}
          value={mode}
          onChange={(next) => {
            setMode(next);
            setProblem(null);
          }}
          options={[
            { value: "dice", label: t.dice },
            { value: "draw", label: t.draw },
          ]}
        />

        {mode === "dice" ? (
          <>
            <div className="flex items-center gap-1">
              <span className="mr-1 text-xs font-medium text-foreground-muted">{t.sides}</span>
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSides(preset)}
                  className={
                    preset === sides
                      ? "rounded-full bg-accent px-2 py-0.5 font-mono text-[11px] text-accent-fg"
                      : "rounded-full px-2 py-0.5 font-mono text-[11px] text-foreground-muted transition-colors hover:bg-hover-bg hover:text-foreground"
                  }
                >
                  d{preset}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground-muted">{t.custom}</span>
              <Input
                type="number"
                min={2}
                max={1000}
                value={sides}
                onChange={(e) =>
                  setSides(Math.min(Math.max(Number(e.target.value) || 2, 2), 1000))
                }
                aria-label={t.sides}
                size="xs"
                className="w-16 text-center font-mono"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground-muted">{t.count}</span>
              <Input
                type="number"
                min={1}
                max={12}
                value={diceCount}
                onChange={(e) =>
                  setDiceCount(Math.min(Math.max(Number(e.target.value) || 1, 1), 12))
                }
                aria-label={t.count}
                size="xs"
                className="w-14 text-center font-mono"
              />
            </label>
            <Button type="button" size="xs" onClick={roll} className="ml-auto gap-1.5">
              <Dices className="h-3.5 w-3.5" />
              {t.roll}
            </Button>
          </>
        ) : (
          <>
            <label className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground-muted">{t.pick}</span>
              <Input
                type="number"
                min={1}
                max={Math.max(pool.length, 1)}
                value={pickCount}
                onChange={(e) =>
                  setPickCount(Math.min(Math.max(Number(e.target.value) || 1, 1), 50))
                }
                aria-label={t.pick}
                size="xs"
                className="w-14 text-center font-mono"
              />
            </label>
            <span className="font-mono text-[11px] text-foreground-faint">{t.pool(pool.length)}</span>
            <Button type="button" size="xs" onClick={draw} className="ml-auto gap-1.5">
              <Shuffle className="h-3.5 w-3.5" />
              {t.drawAction}
            </Button>
          </>
        )}
      </OptionBar>

      {problem && <WarningNote>{problem}</WarningNote>}

      {mode === "dice" ? (
        <>
          {values.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {values.map((value, index) => (
                <div
                  key={`${index}-${value}`}
                  className="flex flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface py-4"
                >
                  <span className="font-display text-2xl font-semibold text-foreground">{value}</span>
                  <span className="font-mono text-[10px] text-foreground-faint">
                    d{sides}
                  </span>
                </div>
              ))}
            </div>
          )}

          {values.length > 0 && (
            <p className="font-mono text-xs text-foreground-subtle">
              {t.total}: <span className="text-foreground">{total}</span>
              <span className="mx-2 text-foreground-faint">·</span>
              {values.join(" + ")}
            </p>
          )}

          {history.length > 0 && (
            <section className="overflow-hidden rounded-lg border border-border bg-surface">
              <header className="border-b border-border px-4 py-2 text-xs font-medium text-foreground-muted">
                {t.history}
              </header>
              {history.map((record) => (
                <div
                  key={record.key}
                  className="flex items-center gap-3 border-b border-border px-4 py-2 font-mono text-[11.5px] last:border-b-0"
                >
                  <span className="w-16 shrink-0 text-foreground-faint">
                    {record.count}d{record.sides}
                  </span>
                  <span className="min-w-0 flex-1 break-all text-foreground-muted">
                    {record.values.join(", ")}
                  </span>
                  <span className="shrink-0 text-foreground">
                    = {record.values.reduce((a, b) => a + b, 0)}
                  </span>
                </div>
              ))}
            </section>
          )}

          <p className="text-xs leading-relaxed text-foreground-subtle">{t.noteDice}</p>
        </>
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground-muted">{t.names}</span>
              <textarea
                value={names}
                onChange={(e) => setNames(e.target.value)}
                placeholder={t.namesHint}
                spellCheck={false}
                rows={8}
                className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 font-mono text-[13px] leading-relaxed text-foreground placeholder:text-foreground-faint focus:border-border-strong focus:outline-none"
              />
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground-muted">{t.picked}</span>
              <div className="flex min-h-[168px] flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface p-4">
                {picked.length === 0 ? (
                  <span className="text-xs text-foreground-faint">—</span>
                ) : (
                  picked.map((name, index) => (
                    <span key={`${name}-${index}`} className="font-display text-lg text-foreground">
                      {name}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-foreground-subtle">{t.noteDraw}</p>
        </>
      )}
    </div>
  );
}
