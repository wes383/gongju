/**
 * Turn subtitle cues into a study sheet: a timestamped transcript plus the
 * vocabulary that keeps showing up in it.
 *
 * Cues are joined back into sentences before the glossary runs, otherwise a
 * line that was split for readability — "I really think we should" / "go now."
 * — would hand the learner a context fragment that is missing half a sentence.
 */

import { formatShortTime, type Cue } from "./subtitle";
import { buildGlossary, type WordEntry } from "./words";

export type StudyMode = "auto" | "latin" | "cjk";

export interface StudyLine {
  time: string;
  text: string;
  /** Word or character count of the line, whichever mode is active */
  length: number;
}

export interface StudyOptions {
  mode?: StudyMode;
  /** Only keep words seen at least this many times */
  minCount?: number;
  /** Words the learner already knows, as raw text */
  known?: string;
  limit?: number;
  title?: string;
}

export interface StudySheet {
  lines: StudyLine[];
  glossary: WordEntry[];
  /** Cues that carried text */
  cues: number;
  characters: number;
  duration: number;
  markdown: string;
  csv: string;
}

const ENDS_SENTENCE = /[.!?。！？…]["'”’)\]]?$/;

function cueText(cue: Cue): string {
  return cue.text.replace(/\s*\n\s*/g, " ").trim();
}

/** Join cues into running text, starting a new line only at real sentence ends */
export function joinCues(cues: readonly Cue[]): string {
  const parts: string[] = [];
  let previous: Cue | null = null;

  for (const cue of cues) {
    const text = cueText(cue);
    if (!text) continue;
    if (!previous) {
      parts.push(text);
    } else {
      const gap = cue.start - previous.end;
      const endsSentence = ENDS_SENTENCE.test(parts[parts.length - 1]);
      parts.push(endsSentence || gap > 1200 ? `\n${text}` : ` ${text}`);
    }
    previous = cue;
  }
  return parts.join("").trim();
}

function pickMode(text: string, mode: StudyMode): "latin" | "cjk" {
  if (mode !== "auto") return mode;
  const han = (text.match(/[\u3400-\u9fff]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  // Characters are denser than words, so an even split already leans Han
  return han >= latin / 3 ? "cjk" : "latin";
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

export function studySheet(cues: readonly Cue[], options: StudyOptions = {}): StudySheet {
  const text = joinCues(cues);
  const mode = pickMode(text, options.mode ?? "auto");
  const lines: StudyLine[] = cues
    .filter((cue) => cueText(cue) !== "")
    .map((cue) => ({
      time: formatShortTime(cue.start),
      text: cueText(cue),
      length: mode === "cjk" ? (cueText(cue).match(/[\u3400-\u9fff]/g) ?? []).length : cueText(cue).split(/\s+/).filter(Boolean).length,
    }));

  let glossary: WordEntry[] = [];
  if (text !== "") {
    try {
      const built = buildGlossary(text, {
        mode,
        minLength: mode === "cjk" ? 1 : 2,
        stopwords: true,
        known: options.known,
        limit: 0,
      });
      glossary = built.entries.filter((entry) => entry.count >= (options.minCount ?? 1));
    } catch {
      // Nothing worth counting (punctuation, numbers only) is not an error here
      glossary = [];
    }
  }
  if (options.limit && options.limit > 0) glossary = glossary.slice(0, options.limit);

  const duration = cues.reduce((max, cue) => Math.max(max, cue.end), 0);
  const characters = lines.reduce((sum, line) => sum + line.text.length, 0);
  const title = options.title?.trim() || (mode === "cjk" ? "字幕学习材料" : "Subtitle study sheet");

  const transcript = lines
    .map((line) => `- \`${line.time}\` ${line.text}`)
    .join("\n");

  const glossaryTable = glossary.length
    ? [
        "| 词 / Word | 次数 / Count | 例句 / Context |",
        "| --- | --- | --- |",
        ...glossary.map(
          (entry) =>
            `| ${markdownCell(entry.word)} | ${entry.count} | ${markdownCell(entry.context)} |`
        ),
      ].join("\n")
    : "（没有可提取的生词 / no vocabulary found）";

  const markdown = [
    `# ${title}`,
    "",
    `- ${lines.length} 条字幕 / cues`,
    `- ${Math.round(duration / 60000)} 分钟 / minutes`,
    `- ${glossary.length} 个生词 / words`,
    "",
    "## 台词 / Transcript",
    "",
    transcript || "（空）",
    "",
    "## 生词 / Vocabulary",
    "",
    glossaryTable,
  ].join("\n");

  const csv = [
    "word,count,context",
    ...glossary.map((entry) => [entry.word, String(entry.count), entry.context].map(csvCell).join(",")),
  ].join("\n");

  return {
    lines,
    glossary,
    cues: lines.length,
    characters,
    duration,
    markdown,
    csv,
  };
}
