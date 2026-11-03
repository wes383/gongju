"use client";

import * as React from "react";
import { Download } from "lucide-react";
import {
  FORMAT_EXTENSIONS,
  formatShortTime,
  parseSubtitle,
  parseTimestamp,
  serialize,
  type SubtitleFormat,
} from "@/lib/subtitle";
import { applyTiming, inspectCues, type TimingPlan } from "@/lib/subtitle-timing";
import { downloadBlob } from "@/lib/files";
import { Input } from "@/components/ui/input";
import { useCopy } from "@/components/locale-provider";
import {
  DualPane,
  OptionBar,
  OptionField,
  PaneButton,
  SampleButton,
  Segmented,
  Toggle,
  WarningNote,
} from "@/components/tools/tool-ui";

type Mode = "shift" | "fps" | "align";

const COPY = {
  zh: {
    shift: "整体偏移",
    fps: "帧率换算",
    align: "首尾对齐",
    offset: "偏移",
    seconds: "秒",
    offsetHint: "正数延后，负数提前",
    from: "原帧率",
    to: "新帧率",
    fpsHint: "23.976 → 25 表示按 PAL 加速后的时间轴修正，结果会整体提前",
    first: "首条起点",
    last: "末条终点",
    alignHint: "留空表示保持原值，支持 90.5 秒或 00:01:30.500",
    minDuration: "最短时长",
    ms: "毫秒",
    fixOverlaps: "修掉重叠",
    inputLabel: "字幕原文",
    outputLabel: "调整结果",
    placeholder: "粘贴 SRT / VTT / ASS / SBV / LRC 内容…",
    noCues: "没有识别到字幕条目，检查时间轴行是否完整。",
    issues: "条问题",
    download: "下载",
    sample: `1
00:00:01,000 --> 00:00:03,200
时间轴整体偏移了 2.5 秒

2
00:00:03,400 --> 00:00:06,000
用这里的偏移量可以一次修好`,
  },
  en: {
    shift: "Shift",
    fps: "Frame rate",
    align: "Align ends",
    offset: "Offset",
    seconds: "s",
    offsetHint: "Positive delays, negative advances",
    from: "From",
    to: "To",
    fpsHint: "23.976 → 25 corrects a PAL speed-up, which moves the track earlier",
    first: "First start",
    last: "Last end",
    alignHint: "Leave blank to keep the source value; accepts 90.5 or 00:01:30.500",
    minDuration: "Min duration",
    ms: "ms",
    fixOverlaps: "Fix overlaps",
    inputLabel: "Subtitle source",
    outputLabel: "Adjusted",
    placeholder: "Paste SRT, VTT, ASS, SBV or LRC content…",
    noCues: "No cues found. Check the timing lines.",
    issues: " issues",
    download: "Download",
    sample: `1
00:00:01,000 --> 00:00:03,200
The whole track is 2.5 seconds late

2
00:00:03,400 --> 00:00:06,000
One offset fixes every cue at once`,
  },
};

/** Accept plain seconds or a full timecode such as `00:01:30.500` */
function toMs(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) return parseTimestamp(trimmed);
  const seconds = Number(trimmed);
  return Number.isFinite(seconds) ? Math.round(seconds * 1000) : null;
}

export function SubtitleTimingTool() {
  const t = useCopy(COPY);
  const [input, setInput] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("shift");
  const [offset, setOffset] = React.useState("2.5");
  const [fromFps, setFromFps] = React.useState("23.976");
  const [toFps, setToFps] = React.useState("25");
  const [firstStart, setFirstStart] = React.useState("");
  const [lastEnd, setLastEnd] = React.useState("");
  const [minDuration, setMinDuration] = React.useState("0");
  const [fixOverlaps, setFixOverlaps] = React.useState(true);

  const doc = React.useMemo(() => (input.trim() ? parseSubtitle(input) : null), [input]);

  const plan = React.useMemo<TimingPlan>(() => {
    const plan: TimingPlan = {
      shiftMs: 0,
      minDuration: Math.max(0, Number(minDuration) || 0),
      fixOverlaps,
    };
    if (mode === "shift") {
      plan.shiftMs = toMs(offset) ?? 0;
    } else if (mode === "fps") {
      plan.fps = { from: Number(fromFps) || 0, to: Number(toFps) || 0 };
    } else {
      const start = toMs(firstStart);
      const end = toMs(lastEnd);
      const source = doc?.cues.length
        ? { firstStart: doc.cues[0].start, lastEnd: doc.cues[doc.cues.length - 1].end }
        : null;
      plan.align = {
        firstStart: start ?? source?.firstStart ?? 0,
        lastEnd: end ?? source?.lastEnd ?? 0,
      };
    }
    return plan;
  }, [mode, offset, fromFps, toFps, firstStart, lastEnd, minDuration, fixOverlaps, doc]);

  const cues = React.useMemo(
    () => (doc ? applyTiming(doc.cues, plan) : []),
    [doc, plan]
  );

  const outputFormat: SubtitleFormat = doc && doc.format !== "txt" ? doc.format : "srt";
  const output = React.useMemo(
    () => (cues.length ? serialize(cues, outputFormat, { header: doc?.header }) : ""),
    [cues, outputFormat, doc]
  );

  const issues = React.useMemo(() => (doc ? inspectCues(cues) : []), [doc, cues]);
  const first = cues[0]?.start;
  const last = cues[cues.length - 1]?.end;

  const download = () => {
    if (!output) return;
    downloadBlob(
      new Blob([output], { type: "text/plain;charset=utf-8" }),
      `subtitle.${FORMAT_EXTENSIONS[outputFormat]}`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.shift}
          value={mode}
          onChange={setMode}
          options={[
            { value: "shift", label: t.shift },
            { value: "fps", label: t.fps },
            { value: "align", label: t.align },
          ]}
        />

        {mode === "shift" && (
          <OptionField label={t.offset} hint={t.offsetHint}>
            <span className="flex items-center gap-1.5">
              <Input
                value={offset}
                onChange={(event) => setOffset(event.target.value)}
                inputMode="decimal"
                spellCheck={false}
                size="xs"
                aria-label={t.offset}
                className="w-24 font-mono text-xs"
              />
              <span className="text-[11px] text-foreground-faint">{t.seconds}</span>
            </span>
          </OptionField>
        )}

        {mode === "fps" && (
          <>
            <OptionField label={t.from} hint={t.fpsHint}>
              <Input
                value={fromFps}
                onChange={(event) => setFromFps(event.target.value)}
                inputMode="decimal"
                spellCheck={false}
                size="xs"
                aria-label={t.from}
                className="w-20 font-mono text-xs"
              />
            </OptionField>
            <OptionField label={t.to}>
              <Input
                value={toFps}
                onChange={(event) => setToFps(event.target.value)}
                inputMode="decimal"
                spellCheck={false}
                size="xs"
                aria-label={t.to}
                className="w-20 font-mono text-xs"
              />
            </OptionField>
          </>
        )}

        {mode === "align" && (
          <>
            <OptionField label={t.first} hint={t.alignHint}>
              <Input
                value={firstStart}
                onChange={(event) => setFirstStart(event.target.value)}
                placeholder={doc?.cues.length ? String(doc.cues[0].start / 1000) : "0"}
                spellCheck={false}
                size="xs"
                aria-label={t.first}
                className="w-28 font-mono text-xs"
              />
            </OptionField>
            <OptionField label={t.last}>
              <Input
                value={lastEnd}
                onChange={(event) => setLastEnd(event.target.value)}
                placeholder={
                  doc?.cues.length ? String(doc.cues[doc.cues.length - 1].end / 1000) : "0"
                }
                spellCheck={false}
                size="xs"
                aria-label={t.last}
                className="w-28 font-mono text-xs"
              />
            </OptionField>
          </>
        )}

        <OptionField label={t.minDuration}>
          <span className="flex items-center gap-1.5">
            <Input
              value={minDuration}
              onChange={(event) => setMinDuration(event.target.value)}
              inputMode="numeric"
              spellCheck={false}
              size="xs"
              aria-label={t.minDuration}
              className="w-20 font-mono text-xs"
            />
            <span className="text-[11px] text-foreground-faint">{t.ms}</span>
          </span>
        </OptionField>

        <Toggle checked={fixOverlaps} onChange={setFixOverlaps} label={t.fixOverlaps} />
      </OptionBar>

      {input.trim() !== "" && doc?.cues.length === 0 && <WarningNote>{t.noCues}</WarningNote>}

      <DualPane
        input={input}
        onInputChange={setInput}
        output={output}
        inputLabel={t.inputLabel}
        outputLabel={t.outputLabel}
        inputPlaceholder={t.placeholder}
        inputActions={<SampleButton onClick={() => setInput(t.sample)} />}
        outputActions={
          <PaneButton onClick={download} title={t.download}>
            <Download className="h-3.5 w-3.5" />
            <span>{t.download}</span>
          </PaneButton>
        }
        onClear={() => setInput("")}
        inputFooter={
          doc?.cues.length ? (
            <span>
              {formatShortTime(doc.cues[0].start)} → {formatShortTime(doc.cues[doc.cues.length - 1].end)}
            </span>
          ) : null
        }
        outputFooter={
          output ? (
            <>
              <span>
                {first !== undefined && last !== undefined
                  ? `${formatShortTime(first)} → ${formatShortTime(last)}`
                  : ""}
              </span>
              {issues.length > 0 && (
                <span className="text-orange-fg">
                  {issues.length} {t.issues}
                </span>
              )}
            </>
          ) : null
        }
      />
    </div>
  );
}
