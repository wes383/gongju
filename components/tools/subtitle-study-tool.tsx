"use client";

import * as React from "react";
import { Download } from "lucide-react";
import {
  CopyButton,
  InputArea,
  Pane,
  PaneButton,
  SampleButton,
  Segmented,
  WarningNote,
} from "@/components/tools/tool-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadFileButton } from "@/components/tools/file-drop";
import { useCopy } from "@/components/locale-provider";
import { downloadBlob } from "@/lib/files";
import { parseSubtitle } from "@/lib/subtitle";
import { studySheet, type StudyMode, type StudySheet } from "@/lib/study";

const SAMPLE = `1
00:00:01,000 --> 00:00:04,200
The tide comes in twice a day, and every time it brings something new to the shore.

2
00:00:04,400 --> 00:00:07,800
We walked along the waterline, picking up whatever the sea had left behind.

3
00:00:08,000 --> 00:00:11,600
Most of it was ordinary: shells, driftwood, a single worn-out shoe.

4
00:00:12,000 --> 00:00:16,400
But my brother kept every ordinary thing, as if the shore owed him a story.`;

const COPY = {
  zh: {
    input: "字幕",
    placeholder: "粘贴 SRT / VTT 字幕，或把字幕文件拖进来…",
    sample: "示例",
    upload: "上传",
    noCues: "没有识别到字幕条目，检查时间轴是否完整（SRT 需要 `-->` 分隔开始与结束）。",
    mode: "分词方式",
    auto: "自动",
    latin: "英文词",
    cjk: "汉字",
    limit: "生词数",
    minCount: "至少出现",
    times: (n: number) => `${n} 次`,
    transcript: "台词",
    vocab: "生词",
    noVocab: "没有可提取的生词，试试降低「至少出现」或换一种分词方式",
    copyMarkdown: "复制 Markdown",
    copyCsv: "复制 CSV",
    download: "下载 Markdown",
    empty: "左侧贴入字幕后，这里列出带时间码的台词和生词",
    summary: (cues: number, words: number, minutes: number) =>
      `${cues} 条字幕 · ${minutes} 分钟 · ${words} 个生词`,
    hint: "台词按原始时间码列出，可以直接当精读材料；生词表带第一次出现的句子，方便回看上下文。导出的 Markdown 可以直接粘进笔记软件。",
    note: "字幕跨行的地方会先拼回整句再统计词频，避免把一句话切成两半。所有解析都在浏览器内完成，字幕文件不会上传。",
  },
  en: {
    input: "Subtitles",
    placeholder: "Paste SRT / VTT subtitles, or drop a subtitle file here…",
    sample: "Sample",
    upload: "Upload",
    noCues: "No cues found — check the timing lines (SRT needs `-->` between start and end).",
    mode: "Tokenise as",
    auto: "Auto",
    latin: "English",
    cjk: "Han",
    limit: "Words",
    minCount: "Appears at least",
    times: (n: number) => `${n}×`,
    transcript: "Transcript",
    vocab: "Vocabulary",
    noVocab: "Nothing to extract — lower the minimum count or switch the tokeniser",
    copyMarkdown: "Copy Markdown",
    copyCsv: "Copy CSV",
    download: "Download Markdown",
    empty: "Paste subtitles on the left to get a timestamped transcript and a study list",
    summary: (cues: number, words: number, minutes: number) =>
      `${cues} cues · ${minutes} min · ${words} words`,
    hint: "The transcript keeps the original timecodes so it works as close-reading material, and every vocabulary entry carries the sentence it first appeared in.",
    note: "Cues are joined back into whole sentences before counting, so a line broken for readability is not counted as two fragments. Everything runs locally — the subtitle file never leaves the browser.",
  },
};

const MODES: { value: StudyMode; key: "auto" | "latin" | "cjk" }[] = [
  { value: "auto", key: "auto" },
  { value: "latin", key: "latin" },
  { value: "cjk", key: "cjk" },
];

const LIMITS = [30, 50, 100];
const MIN_COUNTS = [1, 2, 3];

export function SubtitleStudyTool() {
  const t = useCopy(COPY);
  const [input, setInput] = React.useState(SAMPLE);
  const [fileName, setFileName] = React.useState("");
  const [mode, setMode] = React.useState<StudyMode>("auto");
  const [limit, setLimit] = React.useState("50");
  const [minCount, setMinCount] = React.useState("1");
  const [view, setView] = React.useState<"transcript" | "vocab">("transcript");

  const doc = React.useMemo(() => (input.trim() ? parseSubtitle(input) : null), [input]);

  const sheet: StudySheet | null = React.useMemo(() => {
    if (!doc || doc.cues.length === 0) return null;
    return studySheet(doc.cues, { mode, limit: Number(limit), minCount: Number(minCount) });
  }, [doc, mode, limit, minCount]);

  const loadText = (text: string, name = "") => {
    setInput(text);
    setFileName(name);
  };

  const downloadMarkdown = () => {
    if (!sheet) return;
    downloadBlob(
      new Blob([sheet.markdown], { type: "text/markdown;charset=utf-8" }),
      `${(fileName.replace(/\.[^.]+$/, "") || "subtitle")}-study.md`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Segmented
          ariaLabel={t.mode}
          value={mode}
          onChange={setMode}
          options={MODES.map((item) => ({ value: item.value, label: t[item.key] }))}
        />
        <label className="flex items-center gap-2 text-[11px] text-foreground-muted">
          {t.limit}
          <Select value={limit} onValueChange={setLimit}>
            <SelectTrigger size="xs" className="h-7 w-auto min-w-[68px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIMITS.map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex items-center gap-2 text-[11px] text-foreground-muted">
          {t.minCount}
          <Select value={minCount} onValueChange={setMinCount}>
            <SelectTrigger size="xs" className="h-7 w-auto min-w-[76px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MIN_COUNTS.map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {t.times(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      {input.trim() !== "" && doc?.cues.length === 0 && <WarningNote>{t.noCues}</WarningNote>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <Pane
              label={t.input}
              footer={
                <span>
                  {sheet
                    ? t.summary(sheet.cues, sheet.glossary.length, Math.max(1, Math.round(sheet.duration / 60000)))
                    : "—"}
                </span>
              }
              actions={
                <>
                  <UploadFileButton onText={loadText} label={t.upload} />
                  <SampleButton onClick={() => loadText(SAMPLE)} label={t.sample} />
                </>
              }
            >
              <InputArea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                aria-label={t.input}
                placeholder={t.placeholder}
                className="min-h-[360px]"
              />
            </Pane>
          </div>
          <p className="text-[11px] leading-relaxed text-foreground-subtle">{t.hint}</p>
        </div>

        <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
            <Segmented
              ariaLabel={t.vocab}
              value={view}
              onChange={setView}
              options={[
                { value: "transcript", label: t.transcript },
                { value: "vocab", label: t.vocab },
              ]}
            />
            {sheet && (
              <div className="ml-auto flex items-center gap-1">
                <CopyButton value={sheet.markdown} label={t.copyMarkdown} size="xs" />
                <CopyButton value={sheet.csv} label={t.copyCsv} size="xs" />
                <PaneButton onClick={downloadMarkdown}>
                  <Download className="size-3.5" />
                  {t.download}
                </PaneButton>
              </div>
            )}
          </div>

          {!sheet ? (
            <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
          ) : view === "transcript" ? (
            <ol className="max-h-[460px] overflow-y-auto">
              {sheet.lines.map((line, index) => (
                <li
                  key={`${line.time}-${index}`}
                  className="flex gap-3 border-b border-border px-3 py-1.5 last:border-b-0"
                >
                  <span className="shrink-0 font-mono text-[11px] leading-relaxed text-foreground-faint">
                    {line.time}
                  </span>
                  <span className="min-w-0 text-[12.5px] leading-relaxed text-foreground">
                    {line.text}
                  </span>
                </li>
              ))}
            </ol>
          ) : sheet.glossary.length === 0 ? (
            <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.noVocab}</p>
          ) : (
            <ol className="max-h-[460px] overflow-y-auto">
              {sheet.glossary.map((entry) => (
                <li key={entry.word} className="border-b border-border px-3 py-2 last:border-b-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-medium text-foreground">{entry.word}</span>
                    <span className="font-mono text-[11px] text-foreground-faint">×{entry.count}</span>
                  </div>
                  {entry.context && (
                    <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-foreground-subtle">
                      {entry.context}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
