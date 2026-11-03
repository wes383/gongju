"use client";

import * as React from "react";
import { Download } from "lucide-react";
import {
  FORMAT_EXTENSIONS,
  parseSubtitle,
  serialize,
  type Cue,
  type SubtitleFormat,
} from "@/lib/subtitle";
import { mergeBilingual, splitBilingual } from "@/lib/subtitle-merge";
import { downloadBlob } from "@/lib/files";
import { useCopy } from "@/components/locale-provider";
import {
  CopyButton,
  InputArea,
  OptionBar,
  Pane,
  PaneButton,
  SampleButton,
  Segmented,
  Toggle,
  WarningNote,
} from "@/components/tools/tool-ui";

type Mode = "merge" | "split";

const COPY = {
  zh: {
    merge: "合并成双语",
    split: "拆成两份",
    translationFirst: "译文在上",
    format: "输出格式",
    primary: "主字幕（原文）",
    secondary: "副字幕（译文）",
    bilingual: "双语字幕",
    origin: "原文",
    translation: "译文",
    primaryPlaceholder: "粘贴原文 SRT / VTT…",
    secondaryPlaceholder: "粘贴译文 SRT / VTT…",
    bilingualPlaceholder: "粘贴双语字幕（每条两行）…",
    empty: "合并结果会显示在这里",
    noCues: "没有识别到字幕条目，检查时间轴行是否完整。",
    cues: "条",
    download: "下载",
    samplePrimary: `1
00:00:01,000 --> 00:00:03,200
夜色落在这座城市上

2
00:00:03,400 --> 00:00:06,000
没有人记得它原来的样子。`,
    sampleSecondary: `1
00:00:01,120 --> 00:00:03,400
Night falls over the city

2
00:00:03,500 --> 00:00:06,100
and no one remembers how it used to look.`,
    sampleBilingual: `1
00:00:01,000 --> 00:00:03,200
夜色落在这座城市上
Night falls over the city

2
00:00:03,400 --> 00:00:06,000
没有人记得它原来的样子。
and no one remembers how it used to look.`,
    hint: "按时间重叠匹配：每条译文会归到重叠最多的那条原文上，重叠不到的译文会被丢弃。",
  },
  en: {
    merge: "Merge",
    split: "Split",
    translationFirst: "Translation first",
    format: "Format",
    primary: "Primary (original)",
    secondary: "Secondary (translation)",
    bilingual: "Bilingual",
    origin: "Original",
    translation: "Translation",
    primaryPlaceholder: "Paste the original SRT / VTT…",
    secondaryPlaceholder: "Paste the translated SRT / VTT…",
    bilingualPlaceholder: "Paste a bilingual track (two lines per cue)…",
    empty: "The merged track appears here",
    noCues: "No cues found. Check the timing lines.",
    cues: "cues",
    download: "Download",
    samplePrimary: `1
00:00:01,000 --> 00:00:03,200
Night falls over the city

2
00:00:03,400 --> 00:00:06,000
and no one remembers how it used to look.`,
    sampleSecondary: `1
00:00:01,120 --> 00:00:03,400
夜色落在这座城市上

2
00:00:03,500 --> 00:00:06,100
没有人记得它原来的样子。`,
    sampleBilingual: `1
00:00:01,000 --> 00:00:03,200
Night falls over the city
夜色落在这座城市上

2
00:00:03,400 --> 00:00:06,000
and no one remembers how it used to look.
没有人记得它原来的样子。`,
    hint: "Cues are paired by overlap: each translation goes to the original it overlaps most, and unmatched translations are dropped.",
  },
};

function save(cues: Cue[], format: SubtitleFormat, name: string) {
  if (!cues.length) return;
  downloadBlob(
    new Blob([serialize(cues, format)], { type: "text/plain;charset=utf-8" }),
    `${name}.${FORMAT_EXTENSIONS[format]}`
  );
}

function DownloadButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <PaneButton onClick={onClick} title={label}>
      <Download className="h-3.5 w-3.5" />
      <span>{label}</span>
    </PaneButton>
  );
}

export function SubtitleMergeTool() {
  const t = useCopy(COPY);
  const [mode, setMode] = React.useState<Mode>("merge");
  const [format, setFormat] = React.useState<"srt" | "vtt">("srt");
  const [translationFirst, setTranslationFirst] = React.useState(false);
  const [primary, setPrimary] = React.useState("");
  const [secondary, setSecondary] = React.useState("");

  const primaryDoc = React.useMemo(
    () => (primary.trim() ? parseSubtitle(primary) : null),
    [primary]
  );
  const secondaryDoc = React.useMemo(
    () => (secondary.trim() ? parseSubtitle(secondary) : null),
    [secondary]
  );

  const merged = React.useMemo(() => {
    if (!primaryDoc || primaryDoc.cues.length === 0) return [];
    return mergeBilingual(primaryDoc.cues, secondaryDoc?.cues ?? [], { translationFirst });
  }, [primaryDoc, secondaryDoc, translationFirst]);

  const split = React.useMemo(() => {
    if (!primaryDoc || mode !== "split") return { primary: [], secondary: [] };
    return splitBilingual(primaryDoc.cues);
  }, [primaryDoc, mode]);

  const mergedOutput = React.useMemo(
    () => (merged.length ? serialize(merged, format) : ""),
    [merged, format]
  );

  const splitPrimaryOutput = React.useMemo(
    () => (split.primary.length ? serialize(split.primary, format) : ""),
    [split.primary, format]
  );

  const splitSecondaryOutput = React.useMemo(
    () => (split.secondary.length ? serialize(split.secondary, format) : ""),
    [split.secondary, format]
  );

  const emptyDoc = (cues: Cue[] | null | undefined) => cues !== undefined && cues !== null && cues.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.merge}
          value={mode}
          onChange={setMode}
          options={[
            { value: "merge", label: t.merge },
            { value: "split", label: t.split },
          ]}
        />
        {mode === "merge" && (
          <Toggle
            checked={translationFirst}
            onChange={setTranslationFirst}
            label={t.translationFirst}
          />
        )}
        <span className="ml-auto flex items-center gap-2">
          <span className="text-xs text-foreground-muted">{t.format}</span>
          <Segmented
            ariaLabel={t.format}
            value={format}
            onChange={setFormat}
            options={[
              { value: "srt", label: "SRT" },
              { value: "vtt", label: "VTT" },
            ]}
          />
        </span>
      </OptionBar>

      {mode === "merge" ? (
        <>
          {emptyDoc(primaryDoc?.cues) && <WarningNote>{t.noCues}</WarningNote>}
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <Pane
                label={t.primary}
                className="border-b border-border lg:border-b-0 lg:border-r"
                actions={<SampleButton onClick={() => setPrimary(t.samplePrimary)} />}
                footer={
                  primaryDoc ? (
                    <span>
                      {primaryDoc.cues.length} {t.cues}
                    </span>
                  ) : null
                }
              >
                <InputArea
                  value={primary}
                  onChange={(event) => setPrimary(event.target.value)}
                  placeholder={t.primaryPlaceholder}
                  aria-label={t.primary}
                  className="min-h-[200px]"
                />
              </Pane>
              <Pane
                label={t.secondary}
                actions={<SampleButton onClick={() => setSecondary(t.sampleSecondary)} />}
                footer={
                  secondaryDoc ? (
                    <span>
                      {secondaryDoc.cues.length} {t.cues}
                    </span>
                  ) : null
                }
              >
                <InputArea
                  value={secondary}
                  onChange={(event) => setSecondary(event.target.value)}
                  placeholder={t.secondaryPlaceholder}
                  aria-label={t.secondary}
                  className="min-h-[200px]"
                />
              </Pane>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <Pane
              label={t.bilingual}
              actions={
                <>
                  <DownloadButton
                    onClick={() => save(merged, format, "bilingual")}
                    label={t.download}
                  />
                  <CopyButton value={mergedOutput} />
                </>
              }
              footer={
                merged.length ? (
                  <span>
                    {merged.length} {t.cues}
                  </span>
                ) : null
              }
            >
              <pre className="max-h-[420px] min-h-[180px] overflow-auto whitespace-pre-wrap break-all px-3.5 py-3 font-mono text-[13px] leading-relaxed text-foreground">
                {mergedOutput || (
                  <span className="text-foreground-faint">{t.empty}</span>
                )}
              </pre>
            </Pane>
          </div>

          <p className="text-xs leading-relaxed text-foreground-subtle">{t.hint}</p>
        </>
      ) : (
        <>
          {emptyDoc(primaryDoc?.cues) && <WarningNote>{t.noCues}</WarningNote>}
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <Pane
              label={t.bilingual}
              actions={<SampleButton onClick={() => setPrimary(t.sampleBilingual)} />}
              footer={
                primaryDoc ? (
                  <span>
                    {primaryDoc.cues.length} {t.cues}
                  </span>
                ) : null
              }
            >
              <InputArea
                value={primary}
                onChange={(event) => setPrimary(event.target.value)}
                placeholder={t.bilingualPlaceholder}
                aria-label={t.bilingual}
                className="min-h-[200px]"
              />
            </Pane>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <Pane
                label={t.origin}
                className="border-b border-border lg:border-b-0 lg:border-r"
                actions={
                  <>
                    <DownloadButton
                      onClick={() => save(split.primary, format, "original")}
                      label={t.download}
                    />
                    <CopyButton value={splitPrimaryOutput} />
                  </>
                }
              >
                <pre className="max-h-[360px] min-h-[180px] overflow-auto whitespace-pre-wrap break-all px-3.5 py-3 font-mono text-[13px] leading-relaxed text-foreground">
                  {splitPrimaryOutput}
                </pre>
              </Pane>
              <Pane
                label={t.translation}
                actions={
                  <>
                    <DownloadButton
                      onClick={() => save(split.secondary, format, "translation")}
                      label={t.download}
                    />
                    <CopyButton value={splitSecondaryOutput} />
                  </>
                }
              >
                <pre className="max-h-[360px] min-h-[180px] overflow-auto whitespace-pre-wrap break-all px-3.5 py-3 font-mono text-[13px] leading-relaxed text-foreground">
                  {splitSecondaryOutput}
                </pre>
              </Pane>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
