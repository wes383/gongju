/**
 * Turn exported chat logs into clean Markdown.
 *
 * Three shapes are understood: the ChatGPT data export (`conversations.json`,
 * a graph of `mapping` nodes), the Claude export (`chat_messages`), and plain
 * transcripts with `User:` / `Assistant:` markers. Everything runs on the
 * pasted text, so the file never leaves the browser.
 */

import { codedError } from "./errors";

export type ChatRole = "user" | "assistant" | "system" | "tool";
export type ChatFormat = "chatgpt" | "claude" | "generic" | "text";

export interface ChatMessage {
  role: ChatRole;
  text: string;
}

export interface ChatThread {
  title: string;
  /** Epoch milliseconds, when the export carries one */
  time?: number;
  messages: ChatMessage[];
}

export interface MarkdownOptions {
  /** Heading text per role; defaults to English labels */
  labels?: Partial<Record<ChatRole, string>>;
  /** Skip system prompts, which are usually the tool's own packaging */
  includeSystem?: boolean;
}

const DEFAULT_LABELS: Record<ChatRole, string> = {
  user: "User",
  assistant: "Assistant",
  system: "System",
  tool: "Tool",
};

function mapRole(raw: unknown): ChatRole {
  const value = typeof raw === "string" ? raw.toLowerCase() : "";
  if (value === "user" || value === "human") return "user";
  if (value === "assistant" || value === "ai" || value === "model" || value === "bot") {
    return "assistant";
  }
  if (value === "tool" || value === "function" || value === "tool_result") return "tool";
  return "system";
}

/** Pull text out of the many shapes a `content` field takes in exports */
function readContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(readContent).filter(Boolean).join("\n\n");
  if (content && typeof content === "object") {
    const record = content as Record<string, unknown>;
    if (Array.isArray(record.parts)) return readContent(record.parts);
    if (typeof record.text === "string") return record.text;
  }
  return "";
}

function seconds(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value * 1000)
    : undefined;
}

interface ChatGptNode {
  message?: {
    author?: { role?: string };
    content?: unknown;
    create_time?: number;
  };
  parent?: string | null;
  children?: string[];
}

/**
 * The export is a tree: edits and regenerations create siblings. Walking the
 * `current_node` back to the root returns the conversation exactly as it was
 * left, instead of all branches interleaved.
 */
function chatGptPath(mapping: Record<string, ChatGptNode>, current?: string): ChatGptNode[] {
  let id = current && mapping[current] ? current : undefined;

  if (!id) {
    // No current_node: fall back to the deepest leaf, by creation time
    let best: { id: string; time: number } | null = null;
    for (const [key, node] of Object.entries(mapping)) {
      if (node.children && node.children.length > 0) continue;
      const time = node.message?.create_time ?? 0;
      if (!best || time > best.time) best = { id: key, time };
    }
    id = best?.id;
  }

  const path: ChatGptNode[] = [];
  const seen = new Set<string>();
  while (id && mapping[id] && !seen.has(id)) {
    seen.add(id);
    const node = mapping[id];
    path.push(node);
    id = node.parent ?? undefined;
  }
  return path.reverse();
}

function fromChatGpt(raw: Record<string, unknown>): ChatThread {
  const mapping = (raw.mapping ?? {}) as Record<string, ChatGptNode>;
  const nodes = chatGptPath(mapping, typeof raw.current_node === "string" ? raw.current_node : undefined);

  const messages: ChatMessage[] = [];
  for (const node of nodes) {
    const message = node.message;
    if (!message) continue;
    const text = readContent(message.content).trim();
    if (!text) continue;
    messages.push({ role: mapRole(message.author?.role), text });
  }

  return {
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "",
    time: seconds(raw.create_time),
    messages,
  };
}

function fromClaude(raw: Record<string, unknown>): ChatThread {
  const list = Array.isArray(raw.chat_messages) ? raw.chat_messages : [];
  const messages: ChatMessage[] = [];

  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const text = (readContent(record.content) || readContent(record.text)).trim();
    if (!text) continue;
    messages.push({ role: mapRole(record.sender), text });
  }

  return {
    title: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "",
    time: seconds(raw.created_at) ?? (typeof raw.created_at === "string" ? Date.parse(raw.created_at) : undefined),
    messages,
  };
}

function fromMessageList(list: unknown[]): ChatThread {
  const messages: ChatMessage[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const text = readContent(record.content ?? record.text).trim();
    if (!text) continue;
    messages.push({ role: mapRole(record.role ?? record.sender), text });
  }
  return { title: "", messages };
}

const MARKER =
  /^(?:[*_>#\s]*)(you said|chatgpt said|user|assistant|human|ai|system|用户|助手|系统)(?:[*_\s]*)[:：]?(?:[*_\s]*)$/i;

/**
 * Plain transcripts: a marker line switches the speaker, everything else is
 * body text. This covers copied share pages and hand-written logs.
 */
function fromPlainText(source: string): ChatThread[] {
  const lines = source.split(/\r?\n/);
  const messages: ChatMessage[] = [];
  let role: ChatRole | null = null;
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join("\n").replace(/^\n+|\n+$/g, "");
    if (role && text.trim()) messages.push({ role, text });
    buffer = [];
  };

  for (const line of lines) {
    const match = line.trim().match(MARKER);
    if (match) {
      flush();
      const marker = match[1].toLowerCase();
      role =
        marker === "you said" || marker === "user" || marker === "human" || marker === "用户"
          ? "user"
          : marker === "system" || marker === "系统"
            ? "system"
            : "assistant";
      continue;
    }
    buffer.push(line);
  }
  flush();

  if (messages.length === 0) throw codedError("ai.noMessages");
  return [{ title: "", messages }];
}

export function detectFormat(source: string): ChatFormat {
  const trimmed = source.trim();
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return "text";

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return "text";
  }

  const first = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!first || typeof first !== "object") return "text";
  const record = first as Record<string, unknown>;

  if (record.mapping) return "chatgpt";
  if (Array.isArray(record.chat_messages)) return "claude";
  if (Array.isArray(record.messages)) return "generic";
  if (Array.isArray(parsed) && ("role" in record || "sender" in record)) return "generic";
  return "text";
}

/** Parse any supported export into threads, newest data first untouched */
export function parseChats(source: string): ChatThread[] {
  const trimmed = source.trim();
  if (!trimmed) throw codedError("ai.empty");

  const format = detectFormat(trimmed);
  if (format === "text") return fromPlainText(trimmed);

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw codedError("ai.invalidJson");
  }

  const list = Array.isArray(parsed) ? parsed : [parsed];
  const threads: ChatThread[] = [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const thread =
      format === "chatgpt"
        ? fromChatGpt(record)
        : format === "claude"
          ? fromClaude(record)
          : fromMessageList(Array.isArray(record.messages) ? record.messages : [record]);
    if (thread.messages.length > 0) threads.push(thread);
  }

  if (threads.length === 0) throw codedError("ai.noMessages");
  return threads;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function stamp(time: number): string {
  const date = new Date(time);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function threadToMarkdown(thread: ChatThread, options: MarkdownOptions = {}): string {
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  const blocks: string[] = [];

  if (thread.title) blocks.push(`# ${thread.title}`);
  if (thread.time) blocks.push(`_${stamp(thread.time)}_`);

  for (const message of thread.messages) {
    if (message.role === "system" && !options.includeSystem) continue;
    const heading = `## ${labels[message.role] ?? labels.system}`;
    blocks.push(heading, message.text.trim());
  }

  return `${blocks.join("\n\n")}\n`;
}

export function chatsToMarkdown(threads: ChatThread[], options: MarkdownOptions = {}): string {
  if (threads.length === 1) return threadToMarkdown(threads[0], options);
  return threads.map((thread) => threadToMarkdown(thread, options)).join("\n---\n\n");
}

/** Message count after the system filter, used for the summary line */
export function countMessages(thread: ChatThread, options: MarkdownOptions = {}): number {
  return thread.messages.filter(
    (message) => options.includeSystem || message.role !== "system"
  ).length;
}
