/**
 * Container-level metadata reader for MP4/MOV and WebM/Matroska.
 *
 * Browser metadata is coarse, and `decodeAudioData` resamples every source to
 * the AudioContext rate, so values measured after decoding can be wrong. This
 * module reads the headers exactly as the muxer wrote them. Parsing never
 * throws: an unsupported or damaged file simply yields an empty result.
 */

import {
  ascii,
  channelLayout,
  decodeTag,
  EMPTY_CONTAINER,
  floatBE,
  fourcc,
  type MediaByteChunk,
  type MediaByteSource,
  type MediaContainerInfo,
  type MediaTrackInfo,
  readRange,
  u16be,
  u32be,
  u64be,
  wholeSource,
} from "./media-bytes";
import { parseFlac, parseMp3, parseOgg, parseWav } from "./media-audio-formats";

const HEAD_BYTES = 16 * 1024 * 1024;
const TAIL_BYTES = 16 * 1024 * 1024;

/** Buffer the whole file when it is small, otherwise just its head and tail. */
export async function readMediaBytes(file: Blob): Promise<MediaByteSource> {
  if (file.size <= HEAD_BYTES + TAIL_BYTES) {
    return wholeSource(new Uint8Array(await file.arrayBuffer()));
  }
  const head = new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer());
  const tail = new Uint8Array(await file.slice(file.size - TAIL_BYTES).arrayBuffer());
  const chunks: MediaByteChunk[] = [
    { offset: 0, data: head },
    { offset: file.size - TAIL_BYTES, data: tail },
  ];
  return { size: file.size, chunks };
}

/** Sniff the container from the file signature and dispatch to its parser. */
export function parseMediaContainer(source: MediaByteSource): MediaContainerInfo {
  const head = readRange(source, 0, 16);
  if (!head) return { ...EMPTY_CONTAINER, tracks: [], tags: {} };

  try {
    const firstType = fourcc(head, 4);
    if (
      ["ftyp", "moov", "free", "skip", "wide", "mdat", "styp"].includes(firstType)
    ) {
      return parseIsoBmff(source);
    }
    if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) {
      return parseMatroska(source);
    }
    if (fourcc(head, 0) === "RIFF" && fourcc(head, 8) === "WAVE") {
      return parseWav(source);
    }
    if (fourcc(head, 0) === "fLaC") {
      return parseFlac(source);
    }
    if (fourcc(head, 0) === "OggS") {
      return parseOgg(source);
    }
    if (fourcc(head, 0) === "ID3") {
      return parseMp3(source);
    }
    if (head[0] === 0xff && (head[1] & 0xe0) === 0xe0) {
      return parseMp3(source);
    }
  } catch {
    // A damaged header should not break the info panel.
  }
  return { ...EMPTY_CONTAINER, tracks: [], tags: {} };
}

/* ------------------------------------------------------------- ISO BMFF */

interface IsoBox {
  type: string;
  start: number;
  size: number;
  headerSize: number;
  payload: number;
  end: number;
}

function isoBoxAt(source: MediaByteSource, offset: number): IsoBox | null {
  const head = readRange(source, offset, 8);
  if (!head || head.length < 8) return null;

  let size = u32be(head, 0);
  const type = fourcc(head, 4);
  let headerSize = 8;

  if (size === 1) {
    const extra = readRange(source, offset, 16);
    if (!extra) return null;
    size = u64be(extra, 8);
    headerSize = 16;
  } else if (size === 0) {
    size = source.size - offset;
  }

  if (size < headerSize || offset + size > source.size) {
    if (source.size - offset < headerSize) return null;
    size = source.size - offset;
  }

  return {
    type,
    start: offset,
    size,
    headerSize,
    payload: offset + headerSize,
    end: Math.min(offset + size, source.size),
  };
}

function eachIsoChild(source: MediaByteSource, parent: IsoBox, visit: (box: IsoBox) => void) {
  let offset = parent.payload;
  if (parent.type === "meta") {
    // `meta` is a full box: four version/flags bytes precede its children.
    const probe = readRange(source, offset, 4);
    if (probe && probe[0] === 0 && probe[1] === 0 && probe[2] === 0 && probe[3] === 0) offset += 4;
  }

  for (let guard = 0; guard < 4096 && offset < parent.end; guard += 1) {
    const box = isoBoxAt(source, offset);
    if (!box || box.end <= offset) break;
    visit(box);
    offset = box.end;
  }
}

function parseIsoBmff(source: MediaByteSource): MediaContainerInfo {
  const info: MediaContainerInfo = { tracks: [], tags: {} };
  let foundMoov = false;

  let offset = 0;
  for (let guard = 0; guard < 128 && offset < source.size; guard += 1) {
    const box = isoBoxAt(source, offset);
    if (!box || box.end <= offset) break;
    if (box.type === "ftyp") parseFtyp(source, box, info);
    if (box.type === "moov") {
      foundMoov = true;
      parseMoov(source, box, info);
    }
    offset = box.end;
  }

  if (!foundMoov) {
    // Large files are buffered head+tail only; the moov may live in the tail.
    for (const chunk of source.chunks) {
      const index = findAscii(chunk.data, "moov");
      if (index < 4) continue;
      const candidate = chunk.offset + index - 4;
      const box = isoBoxAt(source, candidate);
      if (box && box.type === "moov" && box.size > 8) {
        parseMoov(source, box, info);
        foundMoov = true;
        break;
      }
    }
  }

  if (info.duration && info.duration > 0) {
    info.overallBitrate = (source.size * 8) / info.duration;
  }
  if (info.tracks.length === 1 && !info.tracks[0].bitrate) {
    info.tracks[0].bitrate = info.overallBitrate;
    info.tracks[0].bitrateEstimated = true;
  }
  return info;
}

function parseFtyp(source: MediaByteSource, box: IsoBox, info: MediaContainerInfo) {
  const head = readRange(source, box.payload, Math.min(box.size - box.headerSize, 64));
  if (!head || head.length < 8) return;
  const major = fourcc(head, 0).trim();
  const brands = [major];
  for (let offset = 8; offset + 4 <= head.length; offset += 4) {
    const brand = fourcc(head, offset).trim();
    if (brand && !brands.includes(brand)) brands.push(brand);
  }
  info.brands = brands;
  info.container = major === "qt" ? "QuickTime" : "MP4";
  info.containerDetail = brands.join(", ");
}

interface TrackDraft {
  info: MediaTrackInfo;
  timescale: number;
  durationTicks: number;
  sampleCount: number;
  sampleDuration: number;
}

function parseMoov(source: MediaByteSource, moov: IsoBox, container: MediaContainerInfo) {
  let timescale = 0;
  let duration = 0;
  let creation = 0;

  eachIsoChild(source, moov, (box) => {
    if (box.type === "mvhd") {
      const head = readRange(source, box.payload, 32);
      if (!head) return;
      if (head[0] === 1) {
        creation = u64be(head, 4);
        timescale = u32be(head, 20);
        duration = u64be(head, 24);
      } else {
        creation = u32be(head, 4);
        timescale = u32be(head, 12);
        duration = u32be(head, 16);
      }
    } else if (box.type === "trak") {
      const track = parseTrak(source, box);
      if (track) container.tracks.push(track.info);
    } else if (box.type === "udta") {
      parseUdta(source, box, container);
    }
  });

  if (timescale > 0 && duration > 0) container.duration = duration / timescale;
  if (creation > 0) container.creationTime = formatIsoDate(creation, 1904);
}

function parseTrak(source: MediaByteSource, trak: IsoBox): TrackDraft | null {
  const draft: TrackDraft = {
    info: { type: "other" },
    timescale: 0,
    durationTicks: 0,
    sampleCount: 0,
    sampleDuration: 0,
  };

  eachIsoChild(source, trak, (box) => {
    if (box.type === "tkhd") parseTkhd(source, box, draft.info);
    else if (box.type === "mdia") parseMdia(source, box, draft);
  });

  if (draft.timescale > 0 && draft.sampleCount > 0 && draft.sampleDuration > 0) {
    const fps = (draft.timescale * draft.sampleCount) / draft.sampleDuration;
    if (fps > 0 && fps < 1000) draft.info.frameRate = fps;
  }
  if (draft.info.type === "other" && draft.info.codec) draft.info.type = "video";
  return draft;
}

function parseTkhd(source: MediaByteSource, box: IsoBox, track: MediaTrackInfo) {
  const head = readRange(source, box.payload, 96);
  if (!head) return;
  const version = head[0];
  const matrixAt = version === 1 ? 52 : 40;
  const widthAt = version === 1 ? 88 : 76;

  if (head.length >= widthAt + 8) {
    const width = u32be(head, widthAt) / 65536;
    const height = u32be(head, widthAt + 4) / 65536;
    if (width > 0 && height > 0) {
      track.width = Math.round(width);
      track.height = Math.round(height);
    }
  }

  if (head.length >= matrixAt + 12) {
    const a = signed32(u32be(head, matrixAt));
    const b = signed32(u32be(head, matrixAt + 4));
    if (a !== 0 || b !== 0) {
      const degrees = (Math.atan2(b, a) * 180) / Math.PI;
      const rotation = Math.round(((degrees % 360) + 360) % 360);
      if (rotation !== 0 && rotation % 90 === 0) track.rotation = rotation;
    }
  }
}

function parseMdia(source: MediaByteSource, mdia: IsoBox, draft: TrackDraft) {
  eachIsoChild(source, mdia, (box) => {
    if (box.type === "mdhd") {
      const head = readRange(source, box.payload, 40);
      if (!head) return;
      if (head[0] === 1) {
        draft.timescale = u32be(head, 20);
        draft.durationTicks = u64be(head, 24);
        draft.info.language = decodeLanguage(head, 32);
      } else {
        draft.timescale = u32be(head, 12);
        draft.durationTicks = u32be(head, 16);
        draft.info.language = decodeLanguage(head, 20);
      }
    } else if (box.type === "hdlr") {
      const head = readRange(source, box.payload, 32);
      if (!head) return;
      const handler = fourcc(head, 8);
      draft.info.type =
        handler === "vide"
          ? "video"
          : handler === "soun"
            ? "audio"
            : handler === "subt" || handler === "text"
              ? "subtitle"
              : "other";
      const name = ascii(head, 20, Math.min(head.length - 20, 12));
      if (name) draft.info.name = name;
    } else if (box.type === "minf") {
      eachIsoChild(source, box, (child) => {
        if (child.type === "stbl") parseStbl(source, child, draft);
      });
    }
  });
}

function parseStbl(source: MediaByteSource, stbl: IsoBox, draft: TrackDraft) {
  eachIsoChild(source, stbl, (box) => {
    if (box.type === "stsd") parseStsd(source, box, draft);
    else if (box.type === "stts") parseStts(source, box, draft);
  });
}

function parseStts(source: MediaByteSource, box: IsoBox, draft: TrackDraft) {
  const head = readRange(source, box.payload, 8);
  if (!head) return;
  const count = Math.min(u32be(head, 4), 4096);
  if (count <= 0) return;
  const table = readRange(source, box.payload + 8, count * 8);
  if (!table) return;

  let samples = 0;
  let ticks = 0;
  for (let i = 0; i < count; i += 1) {
    const sampleCount = u32be(table, i * 8);
    const delta = u32be(table, i * 8 + 4);
    samples += sampleCount;
    ticks += sampleCount * delta;
  }
  draft.sampleCount = samples;
  draft.sampleDuration = ticks;
}

function parseStsd(source: MediaByteSource, box: IsoBox, draft: TrackDraft) {
  const head = readRange(source, box.payload, 8);
  if (!head) return;
  const count = Math.min(u32be(head, 4), 16);
  let offset = box.payload + 8;
  for (let i = 0; i < count; i += 1) {
    const entry = isoBoxAt(source, offset);
    if (!entry || entry.end <= offset) break;
    parseSampleEntry(source, entry, draft);
    offset = entry.end;
  }
}

function parseSampleEntry(source: MediaByteSource, entry: IsoBox, draft: TrackDraft) {
  draft.info.codecId = entry.type;
  draft.info.codec = codecName(entry.type);

  if (draft.info.type === "video") {
    const head = readRange(source, entry.start, 86);
    if (head && head.length >= 86) {
      const width = u16be(head, 32);
      const height = u16be(head, 34);
      if (width > 0 && height > 0) {
        draft.info.width = width;
        draft.info.height = height;
      }
      const depth = u16be(head, 82);
      if (depth > 0 && depth <= 32) draft.info.bitDepth = depth;
    }
    if (entry.size > 86) {
      eachIsoChild(source, { ...entry, payload: entry.start + 86 }, (child) => {
        if (child.type === "avcC") parseAvcC(source, child, draft.info);
        else if (child.type === "pasp") parsePasp(source, child, draft.info);
        else if (child.type === "colr") parseColr(source, child, draft.info);
        else if (child.type === "btrt") parseBtrt(source, child, draft.info);
      });
    }
    return;
  }

  if (draft.info.type === "audio") {
    const head = readRange(source, entry.start, 36);
    if (!head || head.length < 36) return;
    const version = u16be(head, 16);
    const channels = u16be(head, 24);
    const sampleSize = u16be(head, 26);
    const raw = u32be(head, 32);
    const high = raw >>> 16;
    const low = raw & 0xffff;
    const sampleRate = high > 0 && high <= 192000 ? high : low;
    if (channels > 0) {
      draft.info.channels = channels;
      draft.info.channelLayout = channelLayout(channels);
    }
    if (sampleSize > 0 && sampleSize <= 64) draft.info.bitDepth = sampleSize;
    if (sampleRate > 0) draft.info.sampleRate = sampleRate;

    if (version <= 1) {
      const start = entry.start + 36 + (version === 1 ? 16 : 0);
      eachIsoChild(source, { ...entry, payload: start }, (child) => {
        if (child.type === "esds") parseEsds(source, child, draft.info);
        else if (child.type === "btrt") parseBtrt(source, child, draft.info);
        else if (child.type === "dOps") parseDops(source, child, draft.info);
        else if (child.type === "wave") {
          eachIsoChild(source, child, (inner) => {
            if (inner.type === "esds") parseEsds(source, inner, draft.info);
            else if (inner.type === "btrt") parseBtrt(source, inner, draft.info);
          });
        }
      });
    }
  }
}

function parseAvcC(source: MediaByteSource, box: IsoBox, track: MediaTrackInfo) {
  const head = readRange(source, box.payload, 4);
  if (!head || head.length < 4) return;
  track.codecString = `avc1.${hex2(head[1])}${hex2(head[2])}${hex2(head[3])}`;
}

function parsePasp(source: MediaByteSource, box: IsoBox, track: MediaTrackInfo) {
  const head = readRange(source, box.payload, 8);
  if (!head) return;
  const hSpacing = u32be(head, 0);
  const vSpacing = u32be(head, 4);
  if (hSpacing > 0 && vSpacing > 0 && track.width && track.height) {
    track.displayWidth = Math.round(track.width * (hSpacing / vSpacing));
    track.displayHeight = track.height;
  }
}

function parseColr(source: MediaByteSource, box: IsoBox, track: MediaTrackInfo) {
  const head = readRange(source, box.payload, 11);
  if (!head || head.length < 11) return;
  if (fourcc(head, 0) !== "nclx") return;
  const primaries = u16be(head, 4);
  const transfer = u16be(head, 6);
  const matrix = u16be(head, 8);

  const hdr = transfer === 16 || transfer === 18;
  track.hdr = hdr;
  track.colorSpace = colorLabel(primaries, transfer, matrix);
}

function parseBtrt(source: MediaByteSource, box: IsoBox, track: MediaTrackInfo) {
  const head = readRange(source, box.payload, 12);
  if (!head) return;
  const maxBitrate = u32be(head, 4);
  const avgBitrate = u32be(head, 8);
  if (avgBitrate > 0) track.bitrate = avgBitrate;
  else if (maxBitrate > 0) track.bitrate = maxBitrate;
}

function parseDops(source: MediaByteSource, box: IsoBox, track: MediaTrackInfo) {
  const head = readRange(source, box.payload, 8);
  if (!head) return;
  const inputRate = u32be(head, 4);
  if (inputRate > 0) track.sampleRate = inputRate;
  track.codecString = "opus";
}

function parseEsds(source: MediaByteSource, box: IsoBox, track: MediaTrackInfo) {
  const bytes = readRange(source, box.payload, Math.min(box.size - box.headerSize, 4096));
  if (!bytes) return;

  walkDescriptors(bytes, 4, bytes.length, (tag, start) => {
    if (tag === 4 && start + 13 <= bytes.length) {
      const maxBitrate = u32be(bytes, start + 5);
      const avgBitrate = u32be(bytes, start + 9);
      if (avgBitrate > 0) track.bitrate = avgBitrate;
      else if (maxBitrate > 0) track.bitrate = maxBitrate;
    } else if (tag === 5 && start + 1 <= bytes.length) {
      let aot = bytes[start] >>> 3;
      if (aot === 31 && start + 2 <= bytes.length) {
        aot = 32 + (((bytes[start] & 0x07) << 3) | (bytes[start + 1] >>> 5));
      }
      track.codecString = `mp4a.40.${aot}`;
    }
  });
}

function walkDescriptors(
  bytes: Uint8Array,
  offset: number,
  end: number,
  visit: (tag: number, payloadStart: number) => void
) {
  let cursor = offset;
  for (let guard = 0; guard < 64 && cursor < end; guard += 1) {
    const tag = bytes[cursor];
    const size = descriptorLength(bytes, cursor + 1);
    if (!size) return;
    const payload = size.start;
    const payloadEnd = Math.min(payload + size.length, end);
    if (payload >= end) return;

    visit(tag, payload);

    if (tag === 3) {
      let childStart = payload + 3;
      if (childStart <= payloadEnd) {
        const flags = bytes[payload + 2] ?? 0;
        if (flags & 0x80) childStart += 2;
        if (flags & 0x40 && childStart < payloadEnd) childStart += 1 + bytes[childStart];
        if (flags & 0x20) childStart += 2;
        walkDescriptors(bytes, childStart, payloadEnd, visit);
      }
    } else if (tag === 4) {
      walkDescriptors(bytes, payload + 13, payloadEnd, visit);
    }
    cursor = payloadEnd;
  }
}

function descriptorLength(bytes: Uint8Array, offset: number): { length: number; start: number } | null {
  let length = 0;
  for (let i = 0; i < 4; i += 1) {
    const byte = bytes[offset + i];
    if (byte === undefined) return null;
    length = (length << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) return { length, start: offset + i + 1 };
  }
  return null;
}

function parseUdta(source: MediaByteSource, udta: IsoBox, info: MediaContainerInfo) {
  eachIsoChild(source, udta, (box) => {
    if (box.type === "meta") parseIlst(source, box, info);
    else if (box.type.startsWith("©")) {
      const value = readRange(source, box.payload, Math.min(box.size - box.headerSize, 2048));
      if (value) applyIsoTag(info, box.type, decodeTag(value));
    }
  });
}

function parseIlst(source: MediaByteSource, meta: IsoBox, info: MediaContainerInfo) {
  eachIsoChild(source, meta, (box) => {
    if (box.type !== "ilst") return;
    eachIsoChild(source, box, (item) => {
      const dataBox = isoBoxAt(source, item.payload);
      if (!dataBox || dataBox.type !== "data") return;
      const start = dataBox.payload + 8;
      const length = Math.min(dataBox.size - dataBox.headerSize - 8, 4096);
      const value = length > 0 ? readRange(source, start, length) : null;
      if (value) applyIsoTag(info, item.type, decodeTag(value));
    });
  });
}

const ISO_TAGS: Record<string, string> = {
  "©too": "encoder",
  "©swr": "encoder",
  "©nam": "title",
  "©ART": "artist",
  "©alb": "album",
  "©day": "date",
  "©gen": "genre",
  "©cmt": "comment",
  "©cpy": "copyright",
  "©des": "description",
  "©lyr": "lyrics",
  "©mak": "make",
  "©mod": "model",
};

function applyIsoTag(info: MediaContainerInfo, key: string, value: string) {
  if (!value) return;
  const name = ISO_TAGS[key];
  if (!name) return;
  info.tags[name] = value;
  if (name === "encoder") info.encoder = value;
  if (name === "title") info.title = value;
}

function decodeLanguage(bytes: Uint8Array, offset: number): string | undefined {
  if (offset + 2 > bytes.length) return undefined;
  const packed = u16be(bytes, offset);
  const letters = [
    ((packed >> 10) & 0x1f) + 0x60,
    ((packed >> 5) & 0x1f) + 0x60,
    (packed & 0x1f) + 0x60,
  ];
  if (letters.every((code) => code >= 0x61 && code <= 0x7a)) {
    const text = String.fromCharCode(...letters);
    return text === "und" ? undefined : text;
  }
  return undefined;
}

function formatIsoDate(value: number, epochYear: number): string {
  const epoch = Date.UTC(epochYear, 0, 1);
  const date = new Date(epoch + value * 1000);
  return Number.isNaN(date.getTime()) ? "" : `${date.toISOString().slice(0, 19)} UTC`;
}

function signed32(value: number): number {
  return value > 0x7fffffff ? value - 0x100000000 : value;
}

function hex2(value: number): string {
  return value.toString(16).toUpperCase().padStart(2, "0");
}

const CODEC_NAMES: Record<string, string> = {
  avc1: "H.264",
  avc3: "H.264",
  hvc1: "H.265",
  hev1: "H.265",
  av01: "AV1",
  vp09: "VP9",
  vp08: "VP8",
  mp4a: "AAC",
  "ac-3": "AC-3",
  "ec-3": "E-AC-3",
  "ac-4": "AC-4",
  Opus: "Opus",
  opus: "Opus",
  alac: "ALAC",
  fLaC: "FLAC",
  flac: "FLAC",
  lpcm: "PCM",
  sowt: "PCM",
  twos: "PCM",
  ulaw: "µ-law",
  alaw: "A-law",
  samr: "AMR",
  sawb: "AMR-WB",
};

function codecName(id: string): string {
  const name = CODEC_NAMES[id];
  return name ? `${name} (${id})` : id;
}

function colorLabel(primaries: number, transfer: number, matrix: number): string {
  const primariesName =
    primaries === 1 ? "BT.709" : primaries === 9 ? "BT.2020" : primaries === 12 ? "DCI-P3" : "";
  const transferName =
    transfer === 16
      ? "PQ (HDR10)"
      : transfer === 18
        ? "HLG"
        : transfer === 1
          ? "SDR"
          : transfer === 8
            ? "linear"
            : "";
  const matrixName =
    matrix === 1 ? "BT.709" : matrix === 9 ? "BT.2020 non-constant" : matrix === 0 ? "identity" : "";
  const parts = [primariesName, transferName, matrixName].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "";
}

function findAscii(bytes: Uint8Array, needle: string): number {
  for (let i = 0; i + needle.length <= bytes.length; i += 1) {
    let match = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (bytes[i + j] !== needle.charCodeAt(j)) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

/* ------------------------------------------------------------- Matroska */

interface EbmlElement {
  id: number;
  start: number;
  dataStart: number;
  dataEnd: number;
  end: number;
}

function ebmlElementAt(source: MediaByteSource, offset: number, limit: number): EbmlElement | null {
  const head = readRange(source, offset, 12);
  if (!head || head.length < 2) return null;

  let idLength = 1;
  let mask = 0x80;
  while (idLength <= 4 && (head[0] & mask) === 0) {
    mask >>= 1;
    idLength += 1;
  }
  if (idLength > 4 || mask === 0) return null;

  let id = 0;
  for (let i = 0; i < idLength; i += 1) id = id * 256 + head[i];

  const sizeByte = head[idLength];
  if (sizeByte === undefined) return null;
  let sizeLength = 1;
  let sizeMask = 0x80;
  while (sizeLength <= 8 && (sizeByte & sizeMask) === 0) {
    sizeMask >>= 1;
    sizeLength += 1;
  }
  if (sizeLength > 8 || sizeMask === 0) return null;

  let size = sizeByte & (sizeMask - 1);
  let unknown = size === sizeMask - 1;
  for (let i = 1; i < sizeLength; i += 1) {
    const byte = head[idLength + i];
    if (byte === undefined) return null;
    size = size * 256 + byte;
    if (byte !== 0xff) unknown = false;
  }

  const dataStart = offset + idLength + sizeLength;
  const dataEnd = unknown ? limit : Math.min(limit, dataStart + size);
  return { id, start: offset, dataStart, dataEnd, end: dataEnd };
}

function eachEbml(source: MediaByteSource, start: number, end: number, visit: (el: EbmlElement) => void) {
  let offset = start;
  for (let guard = 0; guard < 100000 && offset < end; guard += 1) {
    const element = ebmlElementAt(source, offset, end);
    if (!element || element.end <= offset) break;
    visit(element);
    offset = element.end;
  }
}

function ebmlUint(source: MediaByteSource, element: EbmlElement): number {
  const length = Math.min(element.dataEnd - element.dataStart, 8);
  const bytes = readRange(source, element.dataStart, length);
  if (!bytes) return 0;
  let value = 0;
  for (let i = 0; i < bytes.length; i += 1) value = value * 256 + bytes[i];
  return value;
}

function ebmlFloat(source: MediaByteSource, element: EbmlElement): number {
  const length = element.dataEnd - element.dataStart;
  if (length !== 4 && length !== 8) return 0;
  const bytes = readRange(source, element.dataStart, length);
  return bytes ? floatBE(bytes, 0, length) : 0;
}

function ebmlString(source: MediaByteSource, element: EbmlElement): string {
  const bytes = readRange(source, element.dataStart, Math.min(element.dataEnd - element.dataStart, 4096));
  return bytes ? decodeTag(bytes) : "";
}

function ebmlDate(source: MediaByteSource, element: EbmlElement): string {
  const length = element.dataEnd - element.dataStart;
  if (length !== 8) return "";
  const bytes = readRange(source, element.dataStart, 8);
  if (!bytes) return "";
  const view = new DataView(bytes.buffer, bytes.byteOffset, 8);
  const nanoseconds = Number(view.getBigInt64(0, false));
  const date = new Date(Date.UTC(2001, 0, 1) + nanoseconds / 1e6);
  return Number.isNaN(date.getTime()) ? "" : `${date.toISOString().slice(0, 19)} UTC`;
}

function parseMatroska(source: MediaByteSource): MediaContainerInfo {
  const info: MediaContainerInfo = { container: "Matroska", tracks: [], tags: {} };
  let segment: EbmlElement | null = null;

  eachEbml(source, 0, source.size, (element) => {
    if (element.id === 0x1a45dfa3) {
      eachEbml(source, element.dataStart, element.dataEnd, (child) => {
        if (child.id === 0x4282) {
          const docType = ebmlString(source, child).toLowerCase();
          if (docType === "webm") info.container = "WebM";
        }
      });
    } else if (element.id === 0x18538067) {
      segment = element;
    }
  });

  if (!segment) return info;

  let timecodeScale = 1_000_000;
  const section = (id: number): EbmlElement[] => {
    const found: EbmlElement[] = [];
    eachEbml(source, segment!.dataStart, segment!.dataEnd, (element) => {
      if (element.id === id) found.push(element);
    });
    return found;
  };

  for (const infoBox of section(0x1549a966)) {
    let durationRaw = 0;
    eachEbml(source, infoBox.dataStart, infoBox.dataEnd, (element) => {
      switch (element.id) {
        case 0x2ad7b1:
          timecodeScale = Math.max(1, ebmlUint(source, element));
          break;
        case 0x4489:
          durationRaw = ebmlFloat(source, element);
          break;
        case 0x4d80:
          info.tags.muxingApp = ebmlString(source, element);
          break;
        case 0x5741: {
          const writing = ebmlString(source, element);
          info.tags.writingApp = writing;
          if (writing) info.encoder = writing;
          break;
        }
        case 0x4461:
          info.creationTime = ebmlDate(source, element);
          break;
        case 0x7ba9:
          info.title = ebmlString(source, element);
          info.tags.title = info.title ?? "";
          break;
      }
    });
    if (durationRaw > 0) info.duration = (durationRaw * timecodeScale) / 1e9;
  }

  for (const tracksBox of section(0x1654ae6b)) {
    eachEbml(source, tracksBox.dataStart, tracksBox.dataEnd, (element) => {
      if (element.id === 0xae) {
        const track = parseMatroskaTrack(source, element);
        if (track) info.tracks.push(track);
      }
    });
  }

  for (const tagsBox of section(0x1254c367)) {
    eachEbml(source, tagsBox.dataStart, tagsBox.dataEnd, (element) => {
      if (element.id !== 0x7373) return;
      eachEbml(source, element.dataStart, element.dataEnd, (tag) => {
        if (tag.id !== 0x67c8) return;
        let name = "";
        let value = "";
        eachEbml(source, tag.dataStart, tag.dataEnd, (simple) => {
          if (simple.id === 0x45a3) name = ebmlString(source, simple).toUpperCase();
          else if (simple.id === 0x4487) value = ebmlString(source, simple);
        });
        if (!name || !value) return;
        info.tags[name.toLowerCase()] = value;
        if (name === "ENCODER") info.encoder = value;
        if (name === "TITLE") info.title = value;
      });
    });
  }

  if (info.duration && info.duration > 0) {
    info.overallBitrate = (source.size * 8) / info.duration;
    if (info.tracks.length === 1 && !info.tracks[0].bitrate) {
      info.tracks[0].bitrate = info.overallBitrate;
      info.tracks[0].bitrateEstimated = true;
    }
  }
  return info;
}

function parseMatroskaTrack(source: MediaByteSource, entry: EbmlElement): MediaTrackInfo | null {
  const track: MediaTrackInfo = { type: "other" };
  let trackType = 0;
  let defaultDuration = 0;

  eachEbml(source, entry.dataStart, entry.dataEnd, (element) => {
    switch (element.id) {
      case 0x83:
        trackType = ebmlUint(source, element);
        break;
      case 0x86:
        track.codecId = ebmlString(source, element);
        track.codec = matroskaCodec(track.codecId);
        break;
      case 0x22b59c:
        track.language = ebmlString(source, element) || undefined;
        break;
      case 0x536e:
        track.name = ebmlString(source, element) || undefined;
        break;
      case 0x88:
        track.default = ebmlUint(source, element) !== 0;
        break;
      case 0x23e383:
        defaultDuration = ebmlUint(source, element);
        break;
      case 0xe0:
        parseMatroskaVideo(source, element, track);
        break;
      case 0xe1:
        parseMatroskaAudio(source, element, track);
        break;
    }
  });

  if (trackType === 1) track.type = "video";
  else if (trackType === 2) track.type = "audio";
  else if (trackType === 0x11) track.type = "subtitle";

  if (defaultDuration > 0) {
    const fps = 1e9 / defaultDuration;
    if (fps > 0 && fps < 1000) track.frameRate = fps;
  }
  if (!track.codecId) return null;
  return track;
}

function parseMatroskaVideo(source: MediaByteSource, video: EbmlElement, track: MediaTrackInfo) {
  let frameRate = 0;
  eachEbml(source, video.dataStart, video.dataEnd, (element) => {
    switch (element.id) {
      case 0xb0:
        track.width = ebmlUint(source, element) || undefined;
        break;
      case 0xba:
        track.height = ebmlUint(source, element) || undefined;
        break;
      case 0x54b0:
        track.displayWidth = ebmlUint(source, element) || undefined;
        break;
      case 0x54ba:
        track.displayHeight = ebmlUint(source, element) || undefined;
        break;
      case 0x2383e3:
        frameRate = ebmlFloat(source, element);
        break;
      case 0x55b0:
        parseMatroskaColour(source, element, track);
        break;
    }
  });
  if (frameRate > 0) track.frameRate = frameRate;
}

function parseMatroskaColour(source: MediaByteSource, colour: EbmlElement, track: MediaTrackInfo) {
  let primaries = 0;
  let transfer = 0;
  let matrix = 0;
  eachEbml(source, colour.dataStart, colour.dataEnd, (element) => {
    if (element.id === 0x55bb) primaries = ebmlUint(source, element);
    else if (element.id === 0x55ba) transfer = ebmlUint(source, element);
    else if (element.id === 0x55b1) matrix = ebmlUint(source, element);
    else if (element.id === 0x55b2) {
      const bits = ebmlUint(source, element);
      if (bits > 0) track.bitDepth = bits;
    }
  });
  if (primaries || transfer || matrix) {
    track.hdr = transfer === 16 || transfer === 18;
    track.colorSpace = colorLabel(primaries, transfer, matrix);
  }
}

function parseMatroskaAudio(source: MediaByteSource, audio: EbmlElement, track: MediaTrackInfo) {
  let sampleRate = 0;
  let outputRate = 0;
  let channels = 0;
  eachEbml(source, audio.dataStart, audio.dataEnd, (element) => {
    switch (element.id) {
      case 0xb5:
        sampleRate = ebmlFloat(source, element);
        break;
      case 0x78b5:
        outputRate = ebmlFloat(source, element);
        break;
      case 0x9f:
        channels = ebmlUint(source, element);
        break;
      case 0x6264: {
        const bits = ebmlUint(source, element);
        if (bits > 0 && bits <= 64) track.bitDepth = bits;
        break;
      }
    }
  });
  track.sampleRate = Math.round(outputRate || sampleRate) || undefined;
  if (channels > 0) {
    track.channels = channels;
    track.channelLayout = channelLayout(channels);
  }
}

const MATROSKA_CODECS: Record<string, { name: string; codecString?: string }> = {
  V_VP8: { name: "VP8", codecString: "vp8" },
  V_VP9: { name: "VP9", codecString: "vp9" },
  V_AV1: { name: "AV1", codecString: "av1" },
  "V_MPEG4/ISO/AVC": { name: "H.264" },
  "V_MPEGH/ISO/HEVC": { name: "H.265" },
  V_THEORA: { name: "Theora" },
  A_OPUS: { name: "Opus", codecString: "opus" },
  A_VORBIS: { name: "Vorbis", codecString: "vorbis" },
  A_FLAC: { name: "FLAC", codecString: "flac" },
  A_AAC: { name: "AAC", codecString: "mp4a.40.2" },
  "A_MPEG/L3": { name: "MP3", codecString: "mp3" },
  "A_PCM/INT/LIT": { name: "PCM" },
  "A_PCM/INT/BIG": { name: "PCM" },
};

function matroskaCodec(id: string): string {
  const entry = MATROSKA_CODECS[id];
  return entry ? `${entry.name} (${id})` : id;
}

/* ---------------------------------------------- playback capability probe */

export interface PlaybackSupport {
  supported: boolean;
  smooth?: boolean;
  powerEfficient?: boolean;
}

/**
 * Ask MediaCapabilities whether this browser can decode the file. Returns null
 * when the API or the codec string is unavailable so the row can be hidden.
 */
export async function probePlaybackSupport(
  mimeType: string,
  info: MediaContainerInfo
): Promise<PlaybackSupport | null> {
  if (typeof navigator === "undefined" || !navigator.mediaCapabilities?.decodingInfo) return null;

  const video = info.tracks.find((track) => track.type === "video");
  const audio = info.tracks.find((track) => track.type === "audio");
  const track = video ?? audio;
  if (!track) return null;

  const base = mimeType.split(";")[0] || (video ? "video/mp4" : "audio/mp4");
  const contentType = track.codecString ? `${base}; codecs="${track.codecString}"` : base;

  try {
    if (video) {
      const config = {
        type: "file",
        video: {
          contentType,
          width: video.displayWidth ?? video.width ?? 0,
          height: video.displayHeight ?? video.height ?? 0,
          bitrate: video.bitrate ?? info.overallBitrate ?? 1_000_000,
          framerate: video.frameRate ?? 30,
        },
      } as MediaDecodingConfiguration;
      const result = await navigator.mediaCapabilities.decodingInfo(config);
      return {
        supported: result.supported,
        smooth: result.smooth,
        powerEfficient: result.powerEfficient,
      };
    }

    const config = {
      type: "file",
      audio: {
        contentType,
        channels: String(audio!.channels ?? 2),
        sampleRate: audio!.sampleRate ?? 48000,
        bitrate: audio!.bitrate ?? info.overallBitrate ?? 128_000,
      },
    } as MediaDecodingConfiguration;
    const result = await navigator.mediaCapabilities.decodingInfo(config);
    return {
      supported: result.supported,
      smooth: result.smooth,
      powerEfficient: result.powerEfficient,
    };
  } catch {
    return null;
  }
}

