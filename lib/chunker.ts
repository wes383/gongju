/**
 * Split long text into token-bounded chunks for embedding pipelines.
 *
 * Packing is sentence-first: an atom is a sentence (or a paragraph break), and
 * atoms are packed greedily until the token budget is used up. When a single
 * sentence is longer than the budget — a wall of Chinese text without full
 * stops, a minified log line — it is cut by characters so a chunk can never
 * blow past the limit.
 */

import { codedError } from "./errors";
import { DEFAULT_TOKENIZER, estimateTokens, type TokenizerFamily } from "./tokens";

/** Safety valve: beyond this the page would spend minutes in one render */
export const MAX_CHUNKS = 2_000;

export interface ChunkOptions {
  /** Hard upper bound per chunk, in estimated tokens */
  maxTokens: number;
  /** Tokens carried over from the end of the previous chunk */
  overlapTokens?: number;
  family?: TokenizerFamily;
}

export interface TextChunk {
  index: number;
  text: string;
  tokens: number;
}

/**
 * Sentence atoms that keep the original text intact: joining them back gives
 * the input byte for byte, which matters when the chunks feed an index that
 * has to quote the source.
 */
const ATOM = /[^。！？!?.\n]*[。！？!?.]+|[^。！？!?.\n]+|\n+/g;

interface Piece {
  text: string;
  tokens: number;
}

function toPieces(atoms: string[], maxTokens: number, family: TokenizerFamily): Piece[] {
  const pieces: Piece[] = [];

  for (const atom of atoms) {
    const tokens = estimateTokens(atom, family).total;
    if (tokens <= maxTokens) {
      pieces.push({ text: atom, tokens });
      continue;
    }

    // A single atom over budget: cut it by characters using the atom's own
    // characters-per-token ratio, so the pieces stay uniform
    const chars = [...atom];
    const perChar = chars.length / Math.max(1, tokens);
    const size = Math.max(1, Math.floor(maxTokens * perChar * 0.95));
    for (let i = 0; i < chars.length; i += size) {
      const text = chars.slice(i, i + size).join("");
      pieces.push({ text, tokens: estimateTokens(text, family).total });
    }
  }

  return pieces;
}

export function chunkText(text: string, options: ChunkOptions): TextChunk[] {
  const maxTokens = Math.floor(options.maxTokens);
  if (!Number.isFinite(maxTokens) || maxTokens < 8) {
    throw codedError("ai.chunkSize");
  }

  const overlap = Math.max(0, Math.min(Math.floor(options.overlapTokens ?? 0), maxTokens - 1));
  const family = options.family ?? DEFAULT_TOKENIZER;
  if (!text.trim()) return [];

  const pieces = toPieces(text.match(ATOM) ?? [text], maxTokens, family);
  const chunks: string[] = [];

  let start = 0;
  while (start < pieces.length) {
    const parts: string[] = [];
    let tokens = 0;
    let cursor = start;

    while (cursor < pieces.length) {
      const piece = pieces[cursor];
      if (parts.length > 0 && tokens + piece.tokens > maxTokens) break;
      parts.push(piece.text);
      tokens += piece.tokens;
      cursor += 1;
    }

    chunks.push(parts.join(""));
    if (chunks.length >= MAX_CHUNKS) throw codedError("ai.tooManyChunks", MAX_CHUNKS);
    if (cursor >= pieces.length) break;

    // Carry a few trailing pieces into the next chunk, but always advance so
    // an overlap as large as the budget cannot loop forever
    let carry = 0;
    let back = cursor - 1;
    while (back >= start && carry + pieces[back].tokens <= overlap) {
      carry += pieces[back].tokens;
      back -= 1;
    }
    start = Math.max(start + 1, back + 1);
  }

  return chunks.map((chunk, index) => ({
    index,
    text: chunk,
    tokens: estimateTokens(chunk, family).total,
  }));
}

export interface ChunkSummary {
  chunks: number;
  tokens: number;
  maxTokens: number;
  avgTokens: number;
}

export function summariseChunks(chunks: TextChunk[]): ChunkSummary {
  const tokens = chunks.reduce((sum, chunk) => sum + chunk.tokens, 0);
  return {
    chunks: chunks.length,
    tokens,
    maxTokens: chunks.reduce((max, chunk) => Math.max(max, chunk.tokens), 0),
    avgTokens: chunks.length > 0 ? Math.round(tokens / chunks.length) : 0,
  };
}
