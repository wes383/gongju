"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { generateLorem, type LoremOptions } from "@/lib/text";
import { useCopy, useT } from "@/components/locale-provider";
import { CopyButton, OptionBar, Segmented, Toggle } from "@/components/tools/tool-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COPY = {
  zh: {
    latin: "Latin",
    zh: "中文",
    paragraphs: "段落",
    sentences: "句子",
    words: "单词",
    count: "数量",
    start: "以 Lorem ipsum 开头",
    regenerate: "重新生成",
    output: "生成结果",
    hint: "最多生成 100 个段落 / 句子 / 单词",
  },
  en: {
    latin: "Latin",
    zh: "Chinese",
    paragraphs: "Paragraphs",
    sentences: "Sentences",
    words: "Words",
    count: "Count",
    start: "Start with Lorem ipsum",
    regenerate: "Regenerate",
    output: "Output",
    hint: "Up to 100 paragraphs, sentences or words",
  },
};

export function LoremTool() {
  const t = useCopy(COPY);
  const shared = useT();
  const [language, setLanguage] = React.useState<LoremOptions["language"]>("latin");
  const [unit, setUnit] = React.useState<LoremOptions["unit"]>("paragraphs");
  const [count, setCount] = React.useState(3);
  const [startWithLorem, setStartWithLorem] = React.useState(true);
  const [nonce, setNonce] = React.useState(0);
  const [output, setOutput] = React.useState("");

  // Generate after mount: Math.random() during render would be an unstable
  // value for the prerender and break hydration.
  React.useEffect(() => {
    const id = window.setTimeout(() => {
      setOutput(generateLorem({ language, unit, count, startWithLorem }));
    }, 0);
    return () => window.clearTimeout(id);
  }, [language, unit, count, startWithLorem, nonce]);

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.latin}
          value={language}
          onChange={setLanguage}
          options={[
            { value: "latin", label: t.latin },
            { value: "zh", label: t.zh },
          ]}
        />
        <Segmented
          ariaLabel={t.paragraphs}
          value={unit}
          onChange={setUnit}
          options={[
            { value: "paragraphs", label: t.paragraphs },
            { value: "sentences", label: t.sentences },
            { value: "words", label: t.words },
          ]}
        />
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground-muted">{t.count}</span>
          <Input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Math.min(Math.max(Number(e.target.value) || 1, 1), 100))}
            aria-label={t.count}
            size="xs"
            className="w-16 text-center font-mono"
          />
        </div>
        {language === "latin" && (
          <Toggle checked={startWithLorem} onChange={setStartWithLorem} label={t.start} />
        )}
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => setNonce((n) => n + 1)}
          className="ml-auto gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t.regenerate}
        </Button>
      </OptionBar>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-11 items-center gap-2 border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.output}
          </span>
          <span className="text-[11px] text-foreground-faint">{t.hint}</span>
          <div className="ml-auto flex items-center gap-1">
            <span className="mr-2 font-mono text-[11px] text-foreground-faint">
              {output.length} {shared.chars}
            </span>
            <CopyButton value={output} />
          </div>
        </header>
        <textarea
          value={output}
          readOnly
          spellCheck={false}
          aria-label={t.output}
          className="min-h-[360px] w-full resize-y bg-transparent px-3.5 py-3 text-[13px] leading-relaxed text-foreground focus:outline-none"
        />
      </div>
    </div>
  );
}
