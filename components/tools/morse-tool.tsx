"use client";

import * as React from "react";
import { Volume2 } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { DualPane, SampleButton } from "@/components/tools/tool-ui";
import { decodeMorse, encodeMorse, morseChart } from "@/lib/morse";

const COPY = {
  zh: {
    text: "文本",
    morse: "摩斯电码",
    textPlaceholder: "输入要转换的文本，字母会自动转成摩斯码",
    morsePlaceholder: "输入形如 ... --- ... 的摩斯码，字母之间用空格分隔",
    detectedEncode: "已识别为文本，正在编码",
    detectedDecode: "已识别为摩斯码，正在解码",
    play: "播放",
    sample: "示例",
    unsupported: (chars: string) => `这些字符没有对应摩斯码，已跳过：${chars}`,
    invalid: (codes: string) => `这些码无法识别：${codes}`,
    note: "字母之间用空格分隔，单词之间用 / 分隔。播放使用 700 Hz 提示音、约 12 词/分钟的节奏，需要浏览器允许播放声音。",
    chart: "速查表",
    chartHint: "点击任意一行填入摩斯码",
    letters: "字母",
    digits: "数字",
    punctuation: "标点",
  },
  en: {
    text: "Text",
    morse: "Morse code",
    textPlaceholder: "Type the text to convert — letters become dots and dashes",
    morsePlaceholder: "Type code such as ... --- ..., separating letters with spaces",
    detectedEncode: "Looks like text, encoding it",
    detectedDecode: "Looks like Morse, decoding it",
    play: "Play",
    sample: "Sample",
    unsupported: (chars: string) => `No Morse code for these characters, skipped: ${chars}`,
    invalid: (codes: string) => `Unrecognised code: ${codes}`,
    note: "Separate letters with a space and words with a slash. Playback uses a 700 Hz tone at roughly 12 words per minute and needs the browser's audio permission.",
    chart: "Quick reference",
    chartHint: "Click a row to append its code",
    letters: "Letters",
    digits: "Digits",
    punctuation: "Punctuation",
  },
};

/** Any input made only of dots, dashes and separators is read as Morse. */
function looksLikeMorse(text: string): boolean {
  return text.length > 0 && /^[.\-/\s]+$/.test(text);
}

export function MorseTool() {
  const t = useCopy(COPY);
  const [input, setInput] = React.useState("");
  const [playing, setPlaying] = React.useState(false);

  const decoding = looksLikeMorse(input.trim());
  const encoded = React.useMemo(() => encodeMorse(input), [input]);
  const decoded = React.useMemo(() => decodeMorse(input), [input]);
  const chart = React.useMemo(() => morseChart(), []);

  /** Append a code from the chart; a text side gets replaced rather than mixed. */
  const insertCode = (code: string) => {
    setInput((prev) => {
      const trimmed = prev.trimEnd();
      if (!trimmed) return code;
      return looksLikeMorse(trimmed) ? `${trimmed} ${code}` : code;
    });
  };

  const output = decoding ? decoded.text : encoded.code;
  const unsupported = decoding ? decoded.unsupported : encoded.unsupported;
  const code = decoding ? input : encoded.code;

  const play = async () => {
    if (playing) return;
    const context = new AudioContext();
    const unit = 1.2 / 12; // seconds per dot at 12 wpm
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.value = 700;
    gain.gain.value = 0;
    osc.connect(gain).connect(context.destination);

    let at = context.currentTime + 0.06;
    for (const char of code) {
      if (char === "." || char === "-") {
        gain.gain.setValueAtTime(0.2, at);
        at += char === "." ? unit : unit * 3;
        gain.gain.setValueAtTime(0, at);
        at += unit;
      } else if (char === " ") {
        at += unit * 2;
      } else if (char === "/" || char === "\n") {
        at += unit * 6;
      }
    }

    setPlaying(true);
    osc.start();
    osc.stop(at + 0.05);
    osc.onended = () => {
      void context.close();
      setPlaying(false);
    };
  };

  return (
    <div className="flex flex-col gap-4">
      <DualPane
        input={input}
        onInputChange={setInput}
        output={output}
        inputLabel={t.text}
        outputLabel={t.morse}
        inputPlaceholder={t.textPlaceholder}
        inputActions={
          <SampleButton
            label={t.sample}
            onClick={() => setInput(input.trim() ? "" : "SOS hello 2026")}
          />
        }
        outputActions={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={play}
            disabled={playing || !code.trim()}
            aria-label={t.play}
            title={t.play}
          >
            <Volume2 className="h-3.5 w-3.5" />
          </Button>
        }
        onSwap={() => setInput(output)}
        onClear={() => setInput("")}
        inputFooter={
          <span className="truncate">{input.trim() ? (decoding ? t.detectedDecode : t.detectedEncode) : ""}</span>
        }
        inputMinHeight="min-h-[220px]"
      />

      {unsupported.length > 0 && (
        <p className="text-xs text-orange-fg">
          {decoding ? t.invalid(unsupported.join(" ")) : t.unsupported(unsupported.join(" "))}
        </p>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-border px-4 py-2">
          <h2 className="text-xs font-medium text-foreground-muted">{t.chart}</h2>
          <span className="text-[11px] text-foreground-faint">{t.chartHint}</span>
        </header>
        <div className="flex flex-col gap-4 px-4 py-3">
          {[
            { label: t.letters, entries: chart.letters },
            { label: t.digits, entries: chart.digits },
            { label: t.punctuation, entries: chart.punctuation },
          ].map((group) => (
            <div key={group.label} className="flex flex-col gap-1.5">
              <p className="text-[11px] text-foreground-faint">{group.label}</p>
              <div className="grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(52px,1fr))]">
                {group.entries.map((entry) => (
                  <button
                    key={entry.char}
                    type="button"
                    onClick={() => insertCode(entry.code)}
                    title={`${entry.char} → ${entry.code}`}
                    className="flex flex-col items-center gap-1 rounded border border-border bg-background px-1 py-1.5 transition-colors hover:border-accent hover:bg-hover-bg"
                  >
                    <span className="text-xs font-medium text-foreground">{entry.char}</span>
                    <span className="font-mono text-[10px] leading-none text-foreground-subtle">
                      {entry.code}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
