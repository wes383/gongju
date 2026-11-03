/**
 * Shared types and byte helpers for the container parsers.
 *
 * Files can be up to 1 GB, so the parsers never require the whole file in
 * memory: `MediaByteSource` holds one or more buffered chunks (the head and
 * tail of a large file, or the whole file when it is small) and every read
 * fails soft when the requested range is not buffered.
 */

export interface MediaTrackInfo {
  type: "video" | "audio" | "subtitle" | "other";
  /** Human readable codec, e.g. "H.264 (avc1)" */
  codec?: string;
  /** Raw container identifier (fourcc or Matroska CodecID) */
  codecId?: string;
  /** RFC 6381 codec string used for MediaCapabilities probes */
  codecString?: string;
  language?: string;
  name?: string;
  /** Bits per second */
  bitrate?: number;
  /** True when the bitrate was derived from file size instead of a header */
  bitrateEstimated?: boolean;
  width?: number;
  height?: number;
  frameRate?: number;
  bitDepth?: number;
  sampleRate?: number;
  channels?: number;
  channelLayout?: string;
  /** Degrees clockwise, 0/90/180/270 */
  rotation?: number;
  displayWidth?: number;
  displayHeight?: number;
  colorSpace?: string;
  hdr?: boolean;
  default?: boolean;
}

export interface MediaContainerInfo {
  container?: string;
  containerDetail?: string;
  brands?: string[];
  /** Seconds */
  duration?: number;
  /** ISO timestamp, UTC */
  creationTime?: string;
  encoder?: string;
  title?: string;
  /** Bits per second for the whole file */
  overallBitrate?: number;
  tracks: MediaTrackInfo[];
  tags: Record<string, string>;
}

export interface MediaByteChunk {
  offset: number;
  data: Uint8Array;
}

export interface MediaByteSource {
  size: number;
  chunks: MediaByteChunk[];
}

export const EMPTY_CONTAINER: MediaContainerInfo = { tracks: [], tags: {} };

export function byteSource(chunks: MediaByteChunk[], size: number): MediaByteSource {
  const sorted = [...chunks]
    .filter((chunk) => chunk.data.length > 0)
    .sort((a, b) => a.offset - b.offset);
  return { size, chunks: sorted };
}

export function wholeSource(data: Uint8Array): MediaByteSource {
  return byteSource([{ offset: 0, data }], data.length);
}

/** Read an exact range, returning null when it is not buffered or out of range. */
export function readRange(
  source: MediaByteSource,
  offset: number,
  length: number
): Uint8Array | null {
  if (offset < 0 || length <= 0 || offset + length > source.size) return null;

  for (const chunk of source.chunks) {
    const start = chunk.offset;
    if (offset < start) break;
    const end = start + chunk.data.length;
    if (offset >= end) continue;
    if (offset + length <= end) {
      const local = offset - start;
      return chunk.data.subarray(local, local + length);
    }

    const out = new Uint8Array(length);
    let written = 0;
    let cursor = offset;
    for (const part of source.chunks) {
      const partStart = part.offset;
      const partEnd = partStart + part.data.length;
      if (cursor < partStart) break;
      if (cursor >= partEnd) continue;
      const take = Math.min(partEnd - cursor, length - written);
      out.set(part.data.subarray(cursor - partStart, cursor - partStart + take), written);
      written += take;
      cursor += take;
      if (written === length) return out;
    }
    return null;
  }
  return null;
}

export function u8(source: MediaByteSource, offset: number): number | null {
  const bytes = readRange(source, offset, 1);
  return bytes ? bytes[0] : null;
}

export function u16be(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

export function u16le(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

export function u24be(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 16) | (bytes[offset + 1] << 8) | bytes[offset + 2];
}

export function u32be(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]) >>>
    0
  );
}

export function u32le(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

export function u64be(bytes: Uint8Array, offset: number): number {
  return u32be(bytes, offset) * 0x100000000 + u32be(bytes, offset + 4);
}

export function u64le(bytes: Uint8Array, offset: number): number {
  return u32le(bytes, offset + 4) * 0x100000000 + u32le(bytes, offset);
}

export function floatBE(bytes: Uint8Array, offset: number, size: number): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset, size);
  return size === 4 ? view.getFloat32(0, false) : view.getFloat64(0, false);
}

export function fourcc(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

export function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let text = "";
  for (let i = 0; i < length && offset + i < bytes.length; i += 1) {
    const code = bytes[offset + i];
    if (code === 0) break;
    text += String.fromCharCode(code);
  }
  return text.trim();
}

const utf8 = new TextDecoder("utf-8");
const utf16be = new TextDecoder("utf-16be");
const utf16le = new TextDecoder("utf-16le");

/** Decode a tag value, honouring the UTF-16 BOM when present. */
export function decodeTag(bytes: Uint8Array): string {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return utf16le.decode(bytes.subarray(2)).replace(/\0+$/g, "").trim();
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return utf16be.decode(bytes.subarray(2)).replace(/\0+$/g, "").trim();
  }
  return utf8.decode(bytes).replace(/^\uFEFF/, "").replace(/\0+$/g, "").trim();
}

export function channelLayout(count: number | undefined, mask?: number): string | undefined {
  if (mask && mask > 0) {
    return maskLayout(mask);
  }
  if (!count || count < 1) return undefined;
  const names: Record<number, string> = {
    1: "Mono",
    2: "Stereo",
    3: "2.1",
    4: "4.0",
    5: "5.0",
    6: "5.1",
    7: "6.1",
    8: "7.1",
  };
  return names[count] ?? `${count} ch`;
}

const SPEAKERS: Array<[number, string]> = [
  [0x0001, "L"],
  [0x0002, "R"],
  [0x0004, "C"],
  [0x0008, "LFE"],
  [0x0010, "Lb"],
  [0x0020, "Rb"],
  [0x0040, "Lc"],
  [0x0080, "Rc"],
  [0x0100, "Cb"],
  [0x0200, "Ls"],
  [0x0400, "Rs"],
  [0x0800, "Tc"],
  [0x1000, "Tl"],
  [0x2000, "Tc2"],
  [0x4000, "Tr"],
  [0x8000, "Tb"],
];

function maskLayout(mask: number): string {
  const parts = SPEAKERS.filter(([bit]) => (mask & bit) !== 0).map(([, name]) => name);
  return parts.length > 0 ? parts.join("+") : `${mask.toString(16)}`;
}
