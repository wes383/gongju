/**
 * Subtitle parsing and serialisation for SubRip (SRT), WebVTT, ASS/SSA, SBV,
 * LRC and plain text.
 *
 * Every cue time is stored in milliseconds. Parsing is deliberately tolerant:
 * BOMs, CRLF, dot or comma decimals, missing indices, stray blank lines and
 * out-of-order cues are all accepted, because real-world files contain them.
 */

export type SubtitleFormat = "srt" | "vtt" | "ass" | "sbv" | "lrc" | "txt";

export interface Cue {
  /** Start time in milliseconds */
  start: number;
  /** End time in milliseconds */
  end: number;
  /** Cue text, lines separated by "\n" */
  text: string;
}

export interface SubtitleDoc {
  format: SubtitleFormat;
  cues: Cue[];
  /** ASS style header, kept verbatim so an ASS round-trip keeps its styling */
  header?: string;
}

export const FORMAT_EXTENSIONS: Record<SubtitleFormat, string> = {
  srt: "srt",
  vtt: "vtt",
  ass: "ass",
  sbv: "sbv",
  lrc: "lrc",
  txt: "txt",
};

const DEFAULT_ASS_HEADER = `[Script Info]
Title: Untitled
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,64,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,3,0,2,60,60,40,1`;

const ASS_EVENT_FORMAT =
  "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text";

/* ------------------------------------------------------------------- time */

/**
 * Parse a timestamp into milliseconds.
 *
 * Accepts `HH:MM:SS,mmm`, `HH:MM:SS.mmm`, `MM:SS.mmm`, `H:MM:SS.cc` and the
 * bare `MM:SS` used by some LRC files.
 */
export function parseTimestamp(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;
  const match = /^(?:(\d+):)?(\d{1,3}):(\d{1,2})(?:[.,](\d{1,3}))?$/.exec(value);
  if (!match) return null;

  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const fraction = match[4] ?? "";
  // "5" → 500ms, "05" → 50ms, "005" → 5ms
  const millis = fraction ? Number(fraction.padEnd(3, "0")) : 0;

  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis;
}

function pad(value: number, width = 2): string {
  return String(Math.trunc(value)).padStart(width, "0");
}

function splitTime(ms: number) {
  const clamped = Math.max(0, Math.round(ms));
  const hours = Math.floor(clamped / 3_600_000);
  const minutes = Math.floor((clamped % 3_600_000) / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  const millis = clamped % 1000;
  return { hours, minutes, seconds, millis };
}

/** `00:00:01,000` */
export function formatSrtTime(ms: number): string {
  const { hours, minutes, seconds, millis } = splitTime(ms);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
}

/** `00:00:01.000` */
export function formatVttTime(ms: number): string {
  return formatSrtTime(ms).replace(",", ".");
}

/** `0:00:01.00` — ASS stores centiseconds */
export function formatAssTime(ms: number): string {
  const { hours, minutes, seconds, millis } = splitTime(ms);
  return `${hours}:${pad(minutes)}:${pad(seconds)}.${pad(Math.floor(millis / 10))}`;
}

/** `0:00:01.000` */
export function formatSbvTime(ms: number): string {
  const { hours, minutes, seconds, millis } = splitTime(ms);
  return `${hours}:${pad(minutes)}:${pad(seconds)}.${pad(millis, 3)}`;
}

/** `[mm:ss.xx]` */
export function formatLrcTime(ms: number): string {
  const { minutes, seconds, millis } = splitTime(ms);
  return `[${pad(minutes)}:${pad(seconds)}.${pad(Math.floor(millis / 10))}]`;
}

/** `00:01` / `01:02:03` — compact timecode for UI previews */
export function formatShortTime(ms: number): string {
  const { hours, minutes, seconds } = splitTime(ms);
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

/* ------------------------------------------------------------------ input */

function normalize(input: string): string {
  return input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ");
}

function splitBlocks(input: string): string[] {
  return normalize(input)
    .split(/\n[ \t]*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

export function detectFormat(input: string): SubtitleFormat {
  const text = normalize(input).trim();
  if (!text) return "txt";
  if (/^\[(?:script info|events|v4\+? ?styles|v4 styles)\]/im.test(text)) return "ass";
  if (/^WEBVTT\b/i.test(text)) return "vtt";
  if (/-->/.test(text)) return "srt";
  // SBV joins both timestamps with a comma and has no arrow
  if (/^\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}\s*,\s*\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}\s*$/m.test(text)) {
    return "sbv";
  }
  if (/^\s*\[\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?\]/m.test(text)) return "lrc";
  return "txt";
}

function parseArrowCues(input: string): Cue[] {
  const cues: Cue[] = [];
  for (const block of splitBlocks(input)) {
    const lines = block.split("\n");
    const timingAt = lines.findIndex((line) => line.includes("-->"));
    if (timingAt < 0) continue;

    const timing = lines[timingAt];
    const [left, right = ""] = timing.split("-->");
    const start = parseTimestamp(left);
    // Trailing cue settings (`align:start line:0`) follow the end timestamp
    const end = parseTimestamp(right.trim().split(/\s+/)[0] ?? "");
    if (start === null || end === null) continue;

    const text = lines
      .slice(timingAt + 1)
      .join("\n")
      .trim();
    if (!text) continue;
    cues.push({ start, end: Math.max(start, end), text });
  }
  return cues;
}

function parseSrt(input: string): Cue[] {
  return parseArrowCues(input);
}

function parseVtt(input: string): Cue[] {
  const cues: Cue[] = [];
  for (const block of splitBlocks(input)) {
    if (/^(?:WEBVTT|NOTE|STYLE|REGION)\b/.test(block)) continue;
    cues.push(...parseArrowCues(block));
  }
  return cues;
}

/** Split an ASS field list, letting the last field absorb the remaining commas */
function splitFields(line: string, count: number): string[] {
  const parts: string[] = [];
  let rest = line;
  for (let i = 0; i < count - 1; i += 1) {
    const at = rest.indexOf(",");
    if (at < 0) break;
    parts.push(rest.slice(0, at));
    rest = rest.slice(at + 1);
  }
  parts.push(rest);
  return parts;
}

/** ASS escapes hard breaks as `\N`, soft breaks as `\n`; override blocks go away */
export function plainAssText(raw: string): string {
  return raw
    .replace(/\{[^}]*\}/g, "")
    .replace(/\\N/g, "\n")
    .replace(/\\n/g, " ")
    .replace(/\\h/g, " ")
    .trim();
}

function parseAss(input: string): { cues: Cue[]; header: string } {
  const text = normalize(input);
  const eventsAt = text.search(/^\[Events\]/im);
  const header = eventsAt > 0 ? text.slice(0, eventsAt).trimEnd() : "";
  const body = eventsAt >= 0 ? text.slice(eventsAt) : text;

  let fields: string[] = [];
  const cues: Cue[] = [];

  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (/^Format:/i.test(trimmed)) {
      fields = trimmed
        .slice(trimmed.indexOf(":") + 1)
        .split(",")
        .map((name) => name.trim().toLowerCase());
      continue;
    }
    if (!/^Dialogue:/i.test(trimmed)) continue;

    const payload = trimmed.slice(trimmed.indexOf(":") + 1).trim();
    const count = fields.length || 10;
    const parts = splitFields(payload, count);
    const indexOf = (name: string, fallback: number) => {
      const at = fields.indexOf(name);
      return at >= 0 ? at : fallback;
    };

    const start = parseTimestamp(parts[indexOf("start", 1)] ?? "");
    const end = parseTimestamp(parts[indexOf("end", 2)] ?? "");
    const raw = parts[indexOf("text", count - 1)] ?? "";
    const text = plainAssText(raw);
    if (start === null || end === null || !text) continue;
    cues.push({ start, end: Math.max(start, end), text });
  }

  return { cues, header };
}

function parseSbv(input: string): Cue[] {
  const cues: Cue[] = [];
  for (const block of splitBlocks(input)) {
    const lines = block.split("\n");
    const match = /^(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3})\s*,\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3})\s*$/.exec(
      lines[0].trim()
    );
    if (!match) continue;
    const start = parseTimestamp(match[1]);
    const end = parseTimestamp(match[2]);
    if (start === null || end === null) continue;
    const text = lines.slice(1).join("\n").trim();
    if (!text) continue;
    cues.push({ start, end: Math.max(start, end), text });
  }
  return cues;
}

function parseLrc(input: string): Cue[] {
  const text = normalize(input);
  const offsetMatch = /\[offset:\s*([+-]?\d+)\s*\]/i.exec(text);
  const offset = offsetMatch ? Number(offsetMatch[1]) : 0;

  const timed: { start: number; text: string }[] = [];
  for (const line of text.split("\n")) {
    const stamps = [...line.matchAll(/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g)];
    if (stamps.length === 0) continue;
    const last = stamps[stamps.length - 1];
    const content = line.slice((last.index ?? 0) + last[0].length).trim();
    if (!content) continue;
    for (const stamp of stamps) {
      const minutes = Number(stamp[1]);
      const seconds = Number(stamp[2]);
      const fraction = stamp[3] ? Number(stamp[3].padEnd(3, "0")) : 0;
      timed.push({ start: (minutes * 60 + seconds) * 1000 + fraction + offset, text: content });
    }
  }

  timed.sort((a, b) => a.start - b.start);

  // Lyrics often share one timestamp across lines; fold them into a single cue
  const merged: { start: number; lines: string[] }[] = [];
  for (const entry of timed) {
    const previous = merged[merged.length - 1];
    if (previous && previous.start === entry.start) previous.lines.push(entry.text);
    else merged.push({ start: entry.start, lines: [entry.text] });
  }

  return merged.map((entry, index) => {
    const next = merged[index + 1];
    // Lyrics carry no end time, so a cue runs until the next line
    const end = next ? next.start : entry.start + 4000;
    return { start: entry.start, end, text: entry.lines.join("\n") };
  });
}

/** Plain text has no timing; each line gets a synthetic duration for conversion */
function parsePlain(input: string): Cue[] {
  const lines = normalize(input)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let cursor = 0;
  return lines.map((text) => {
    const duration = Math.min(6000, Math.max(1200, [...text].length * 90));
    const cue = { start: cursor, end: cursor + duration, text };
    cursor += duration + 200;
    return cue;
  });
}

export function parseSubtitle(input: string, format?: SubtitleFormat): SubtitleDoc {
  const resolved = format ?? detectFormat(input);
  switch (resolved) {
    case "ass": {
      const { cues, header } = parseAss(input);
      return { format: "ass", cues, header };
    }
    case "vtt":
      return { format: "vtt", cues: parseVtt(input) };
    case "sbv":
      return { format: "sbv", cues: parseSbv(input) };
    case "lrc":
      return { format: "lrc", cues: parseLrc(input) };
    case "txt":
      return { format: "txt", cues: parsePlain(input) };
    default:
      return { format: "srt", cues: parseSrt(input) };
  }
}

/* ----------------------------------------------------------------- output */

export interface SerializeOptions {
  /** ASS header reused from the source; a minimal default is emitted otherwise */
  header?: string;
  /** Emit CRLF line endings, which Windows players expect */
  crlf?: boolean;
}

function srtBlocks(cues: Cue[]): string[] {
  return cues.map((cue, index) =>
    [
      String(index + 1),
      `${formatSrtTime(cue.start)} --> ${formatSrtTime(cue.end)}`,
      cue.text,
    ].join("\n")
  );
}

/** Convert cue text back into an ASS event body (`\N` for hard breaks) */
function assText(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\\N");
}

export function serialize(
  cues: Cue[],
  format: SubtitleFormat,
  options: SerializeOptions = {}
): string {
  const text = (() => {
    switch (format) {
      case "vtt": {
        const body = cues
          .map(
            (cue) => `${formatVttTime(cue.start)} --> ${formatVttTime(cue.end)}\n${cue.text}`
          )
          .join("\n\n");
        return `WEBVTT\n\n${body}${body ? "\n" : ""}`;
      }
      case "ass": {
        const header = options.header?.includes("[Script Info]")
          ? options.header
          : DEFAULT_ASS_HEADER;
        const events = cues.map(
          (cue) =>
            `Dialogue: 0,${formatAssTime(cue.start)},${formatAssTime(cue.end)},Default,,0,0,0,,${assText(
              cue.text
            )}`
        );
        return [header, "[Events]", ASS_EVENT_FORMAT, ...events].join("\n") + "\n";
      }
      case "sbv":
        return (
          cues
            .map(
              (cue) => `${formatSbvTime(cue.start)},${formatSbvTime(cue.end)}\n${cue.text}`
            )
            .join("\n\n") + "\n"
        );
      case "lrc":
        return (
          cues
            .map(
              (cue) =>
                `${formatLrcTime(cue.start)}${cue.text
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .join(" ")}`
            )
            .join("\n") + "\n"
        );
      case "txt":
        return cues.map((cue) => cue.text).join("\n\n") + "\n";
      default:
        return srtBlocks(cues).join("\n\n") + "\n";
    }
  })();

  return options.crlf ? text.replace(/\n/g, "\r\n") : text;
}

/* ---------------------------------------------------------------- helpers */

/** Sort by start time and force every cue to have a positive duration */
export function normalizeCues(cues: Cue[], minDuration = 0): Cue[] {
  return [...cues]
    .sort((a, b) => a.start - b.start || a.end - b.end)
    .map((cue) => {
      const start = Math.max(0, Math.round(cue.start));
      const end = Math.max(start + Math.max(0, minDuration), Math.round(cue.end));
      return { ...cue, start, end };
    });
}

export function cueCount(doc: SubtitleDoc): number {
  return doc.cues.length;
}

export function totalDuration(cues: Cue[]): number {
  return cues.reduce((max, cue) => Math.max(max, cue.end), 0);
}

/** Number of visible characters, ignoring markup and whitespace */
export function visibleLength(text: string): number {
  return [...text.replace(/<[^>]*>/g, "").replace(/\{[^}]*\}/g, "").replace(/\s+/g, "")].length;
}

/** Characters per second — the usual readability metric for subtitles */
export function cueCps(cue: Cue): number {
  const seconds = (cue.end - cue.start) / 1000;
  if (seconds <= 0) return 0;
  return visibleLength(cue.text) / seconds;
}
