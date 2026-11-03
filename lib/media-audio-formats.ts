/**
 * Header parsers for audio-only containers: RIFF/WAVE, FLAC, MPEG audio
 * (MP3 + ADTS AAC) and Ogg (Opus/Vorbis/Theora/FLAC). Values come from the
 * stream headers, so sample rate, bit depth and bitrate are exact instead of
 * being measured after the browser's decoder has resampled the audio.
 */

import {
  ascii,
  channelLayout,
  decodeTag,
  fourcc,
  type MediaByteSource,
  type MediaContainerInfo,
  type MediaTrackInfo,
  readRange,
  u16le,
  u24be,
  u32be,
  u32le,
  u64le,
} from "./media-bytes";

const PCM_CODECS: Record<number, string> = {
  0x0001: "PCM",
  0x0003: "IEEE float",
  0x0006: "A-law",
  0x0007: "µ-law",
  0x0011: "IMA ADPCM",
  0x0055: "MP3",
  0x00ff: "AAC",
};

const BITRATE_TABLES: Record<string, number[]> = {
  // Keyed by "version-layer": MPEG1/2/2.5 × Layer I/II/III
  "1-3": [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  "2-3": [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  "1-2": [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
  "2-2": [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  "1-1": [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  "2-1": [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
};

const SAMPLE_RATES: Record<number, number[]> = {
  3: [44100, 48000, 32000],
  2: [22050, 24000, 16000],
  0: [11025, 12000, 8000],
};

const AAC_RATES = [
  96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350,
];

function baseInfo(container: string): MediaContainerInfo {
  return { container, tracks: [], tags: {} };
}

function finish(info: MediaContainerInfo, source: MediaByteSource) {
  if (info.duration && info.duration > 0) {
    info.overallBitrate = (source.size * 8) / info.duration;
  }
  if (info.tracks.length === 1 && info.tracks[0].type === "audio" && !info.tracks[0].bitrate) {
    info.tracks[0].bitrate = info.overallBitrate;
    info.tracks[0].bitrateEstimated = true;
  }
  return info;
}

/* ------------------------------------------------------------------ WAVE */

export function parseWav(source: MediaByteSource): MediaContainerInfo {
  const info = baseInfo("WAV");
  const head = readRange(source, 12, 4);
  if (!head) return info;

  let offset = 12;
  let dataSize = 0;
  let byteRate = 0;
  let formatTag = 0;
  let channels = 0;
  let sampleRate = 0;
  let bits = 0;
  let validBits = 0;
  let channelMask = 0;
  let codec = "PCM";

  while (offset + 8 <= source.size) {
    const header = readRange(source, offset, 8);
    if (!header) break;
    const id = fourcc(header, 0);
    const size = u32le(header, 4);
    const payload = offset + 8;

    if (id === "fmt " && size >= 16) {
      const fmt = readRange(source, payload, Math.min(size, 40));
      if (!fmt) break;
      formatTag = u16le(fmt, 0);
      channels = u16le(fmt, 2);
      sampleRate = u32le(fmt, 4);
      byteRate = u32le(fmt, 8);
      bits = u16le(fmt, 14);
      if (formatTag === 0xfffe && size >= 40 && fmt.length >= 26) {
        validBits = u16le(fmt, 18);
        channelMask = u32le(fmt, 20);
        const sub = u16le(fmt, 24);
        codec = PCM_CODECS[sub] ?? "PCM";
      } else {
        codec = PCM_CODECS[formatTag] ?? `0x${formatTag.toString(16)}`;
      }
    } else if (id === "data") {
      dataSize = size;
      if (size === 0) dataSize = Math.max(0, source.size - payload);
    } else if (id === "LIST") {
      parseRiffInfo(source, payload, Math.min(size, 1 << 20), info);
    }

    offset = payload + size + (size % 2);
  }

  if (sampleRate > 0) {
    const track: MediaTrackInfo = {
      type: "audio",
      codec,
      codecId: formatTag ? `0x${formatTag.toString(16).padStart(4, "0")}` : undefined,
      sampleRate,
      channels,
      channelLayout: channelLayout(channels, channelMask),
      bitDepth: validBits || bits || undefined,
      bitrate: byteRate > 0 ? byteRate * 8 : undefined,
    };
    info.tracks.push(track);
  }

  if (dataSize > 0 && byteRate > 0) info.duration = dataSize / byteRate;
  return finish(info, source);
}

function parseRiffInfo(
  source: MediaByteSource,
  offset: number,
  end: number,
  info: MediaContainerInfo
) {
  const listType = readRange(source, offset, 4);
  if (!listType || fourcc(listType, 0) !== "INFO") return;
  let cursor = offset + 4;
  while (cursor + 8 <= offset + end) {
    const header = readRange(source, cursor, 8);
    if (!header) return;
    const id = fourcc(header, 0);
    const size = u32le(header, 4);
    const value = readRange(source, cursor + 8, Math.min(size, 4096));
    if (value && size > 0) {
      const text = decodeTag(value);
      if (text) {
        info.tags[id] = text;
        if (id === "ISFT") info.encoder = text;
        if (id === "INAM") info.title = text;
      }
    }
    cursor += 8 + size + (size % 2);
  }
}

/* ------------------------------------------------------------------ FLAC */

interface FlacStreamInfo {
  sampleRate: number;
  channels: number;
  bits: number;
  totalSamples: number;
  minBlock?: number;
  maxBlock?: number;
}

/** Read the 34-byte STREAMINFO block. */
export function readFlacStreamInfo(bytes: Uint8Array, offset: number): FlacStreamInfo | null {
  if (bytes.length < offset + 18) return null;
  const sampleRate = (bytes[offset + 10] << 12) | (bytes[offset + 11] << 4) | (bytes[offset + 12] >> 4);
  const channels = ((bytes[offset + 12] >> 1) & 0x07) + 1;
  const bits = (((bytes[offset + 12] & 0x01) << 4) | (bytes[offset + 13] >> 4)) + 1;
  const totalSamples = (bytes[offset + 13] & 0x0f) * 0x100000000 + u32be(bytes, offset + 14);

  return {
    sampleRate,
    channels,
    bits,
    totalSamples,
    minBlock: (bytes[offset] << 8) | bytes[offset + 1],
    maxBlock: (bytes[offset + 2] << 8) | bytes[offset + 3],
  };
}

export function parseFlac(source: MediaByteSource): MediaContainerInfo {
  const info = baseInfo("FLAC");
  const head = readRange(source, 0, 8);
  if (!head || fourcc(head, 0) !== "fLaC") return info;
  const stream = parseFlacBlocks(source, 4, info);
  if (!stream) return info;

  info.tracks.push({
    type: "audio",
    codec: "FLAC",
    codecId: "fLaC",
    sampleRate: stream.sampleRate,
    channels: stream.channels,
    channelLayout: channelLayout(stream.channels),
    bitDepth: stream.bits,
  });
  if (stream.totalSamples > 0 && stream.sampleRate > 0) {
    info.duration = stream.totalSamples / stream.sampleRate;
  }
  return finish(info, source);
}

function parseFlacBlocks(
  source: MediaByteSource,
  start: number,
  info: MediaContainerInfo
): FlacStreamInfo | null {
  let offset = start;
  let stream: FlacStreamInfo | null = null;

  for (let guard = 0; guard < 64 && offset + 4 <= source.size; guard += 1) {
    const header = readRange(source, offset, 4);
    if (!header) break;
    const last = (header[0] & 0x80) !== 0;
    const type = header[0] & 0x7f;
    const size = u24be(header, 1);
    const payload = offset + 4;

    if (type === 0) {
      const block = readRange(source, payload, Math.min(size, 34));
      if (block && block.length >= 18) stream = readFlacStreamInfo(block, 0);
    } else if (type === 4) {
      const block = readRange(source, payload, Math.min(size, 1 << 20));
      if (block) parseVorbisComment(block, info);
    }

    offset = payload + size;
    if (last) break;
  }
  return stream;
}

function parseVorbisComment(bytes: Uint8Array, info: MediaContainerInfo) {
  if (bytes.length < 8) return;
  const vendorLength = u32le(bytes, 0);
  if (vendorLength > bytes.length) return;
  const vendor = decodeTag(bytes.subarray(4, 4 + vendorLength));
  if (vendor) info.encoder = vendor;
  let offset = 4 + vendorLength;
  if (offset + 4 > bytes.length) return;
  const count = u32le(bytes, offset);
  offset += 4;

  for (let i = 0; i < count && offset + 4 <= bytes.length && i < 128; i += 1) {
    const length = u32le(bytes, offset);
    offset += 4;
    if (length > bytes.length - offset) break;
    const entry = decodeTag(bytes.subarray(offset, offset + length));
    offset += length;
    const split = entry.indexOf("=");
    if (split < 0) continue;
    const key = entry.slice(0, split).toUpperCase();
    const value = entry.slice(split + 1).trim();
    if (!value) continue;
    info.tags[key] = value;
    applyTag(info, key, value);
  }
}

function applyTag(info: MediaContainerInfo, key: string, value: string) {
  switch (key) {
    case "TITLE":
      info.title = value;
      break;
    case "ARTIST":
      info.tags.artist = value;
      break;
    case "ALBUM":
      info.tags.album = value;
      break;
    case "DATE":
    case "DATE_RELEASED":
    case "YEAR":
      info.tags.date = value;
      break;
    case "GENRE":
      info.tags.genre = value;
      break;
    case "COMMENT":
    case "DESCRIPTION":
      info.tags.comment = value;
      break;
    case "ENCODER":
    case "ENCODER_OPTIONS":
      info.encoder = value;
      break;
  }
}

/* -------------------------------------------------------------- MPEG audio */

interface Mp3Frame {
  version: number; // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
  layer: number; // 1..3
  bitrate: number; // bits per second
  sampleRate: number;
  channels: number;
  frameBytes: number;
  samples: number;
  headerOffset: number;
  audioStart: number;
}

function readMp3Frame(source: MediaByteSource, offset: number): Mp3Frame | null {
  const head = readRange(source, offset, 4);
  if (!head) return null;
  if (head[0] !== 0xff || (head[1] & 0xe0) !== 0xe0) return null;

  const version = (head[1] >> 3) & 0x03;
  const layerBits = (head[1] >> 1) & 0x03;
  if (version === 1 || layerBits === 0) return null; // reserved / ADTS
  const layer = 4 - layerBits;
  const bitrateIndex = (head[2] >> 4) & 0x0f;
  const rateIndex = (head[2] >> 2) & 0x03;
  if (bitrateIndex === 0 || bitrateIndex === 0x0f || rateIndex === 3) return null;

  const table = BITRATE_TABLES[`${version === 3 ? 1 : 2}-${layer}`];
  const rates = SAMPLE_RATES[version];
  const bitrate = (table?.[bitrateIndex] ?? 0) * 1000;
  const sampleRate = rates?.[rateIndex] ?? 0;
  if (!bitrate || !sampleRate) return null;

  const padding = (head[2] >> 1) & 0x01;
  const channelMode = (head[3] >> 6) & 0x03;
  const channels = channelMode === 3 ? 1 : 2;

  const frameBytes =
    layer === 1
      ? Math.floor((12 * bitrate) / sampleRate + padding) * 4
      : Math.floor((((layer === 3 && version !== 3 ? 72 : 144) * bitrate) / sampleRate) + padding);

  const samples = layer === 1 ? 384 : layer === 2 ? 1152 : version === 3 ? 1152 : 576;
  return {
    version,
    layer,
    bitrate,
    sampleRate,
    channels,
    frameBytes,
    samples,
    headerOffset: offset,
    audioStart: offset,
  };
}

export function parseMp3(source: MediaByteSource): MediaContainerInfo {
  const info = baseInfo("MP3");
  const id3 = parseId3(source, info);
  const audioStart = id3 ?? 0;

  let frame: Mp3Frame | null = null;
  for (let probe = audioStart; probe < Math.min(source.size, audioStart + (1 << 16)); probe += 1) {
    frame = readMp3Frame(source, probe);
    if (frame) break;
  }
  if (!frame) {
    // ADTS AAC shares the 12-bit sync word but has a zero layer field.
    return parseAdts(source, audioStart);
  }

  const kind = frame.layer === 3 ? "MP3" : frame.layer === 2 ? "MP2" : "MP1";
  const track: MediaTrackInfo = {
    type: "audio",
    codec: kind,
    codecId: kind.toLowerCase(),
    sampleRate: frame.sampleRate,
    channels: frame.channels,
    channelLayout: channelLayout(frame.channels),
    bitrate: frame.bitrate,
  };

  const audioBytes = Math.max(0, source.size - audioStart);
  const xing = readXing(source, frame);
  if (xing && xing.frames > 0) {
    info.duration = (xing.frames * frame.samples) / frame.sampleRate;
    const bytes = xing.bytes > 0 ? xing.bytes : audioBytes;
    if (info.duration > 0) {
      track.bitrate = (bytes * 8) / info.duration;
      if (xing.averageBitrate > 0) track.bitrate = xing.averageBitrate;
    }
  } else if (frame.bitrate > 0) {
    info.duration = (audioBytes * 8) / frame.bitrate;
    track.bitrate = frame.bitrate;
  }

  info.tracks.push(track);
  return finish(info, source);
}

function readXing(
  source: MediaByteSource,
  frame: Mp3Frame
): { frames: number; bytes: number; averageBitrate: number } | null {
  const window = readRange(source, frame.headerOffset, Math.min(frame.frameBytes, 256));
  if (!window) return null;

  for (let i = 4; i + 12 <= window.length; i += 1) {
    const tag = fourcc(window, i);
    if (tag === "Xing" || tag === "Info") {
      const flags = u32le(window, i + 4);
      let cursor = i + 8;
      let frames = 0;
      let bytes = 0;
      if (flags & 0x01) {
        frames = u32le(window, cursor);
        cursor += 4;
      }
      if (flags & 0x02) {
        bytes = u32le(window, cursor);
        cursor += 4;
      }
      const duration = frames > 0 ? (frames * frame.samples) / frame.sampleRate : 0;
      return { frames, bytes, averageBitrate: duration > 0 ? (bytes * 8) / duration : 0 };
    }
    if (tag === "VBRI" && i === 32) {
      return {
        frames: u32le(window, i + 18),
        bytes: u32le(window, i + 14),
        averageBitrate: 0,
      };
    }
  }
  return null;
}

function parseAdts(source: MediaByteSource, audioStart: number): MediaContainerInfo {
  const info = baseInfo("MPEG audio");
  const head = readRange(source, audioStart, 7);
  if (!head || head[0] !== 0xff || (head[1] & 0xf6) !== 0xf0) return info;

  const rateIndex = (head[2] >> 2) & 0x0f;
  const channelConfig = ((head[2] & 0x01) << 2) | ((head[3] >> 6) & 0x03);
  const frameBytes = ((head[3] & 0x03) << 11) | (head[4] << 3) | (head[5] >> 5);
  const sampleRate = AAC_RATES[rateIndex];
  if (!sampleRate || frameBytes <= 0) return info;

  info.container = "AAC (ADTS)";

  const audioBytes = Math.max(0, source.size - audioStart);
  const frames = Math.floor(audioBytes / frameBytes);
  info.duration = (frames * 1024) / sampleRate;
  info.tracks.push({
    type: "audio",
    codec: "AAC (ADTS)",
    codecId: "adts",
    codecString: "mp4a.40.2",
    sampleRate,
    channels: channelConfig || 2,
    channelLayout: channelLayout(channelConfig || 2),
    bitrate: info.duration > 0 ? (audioBytes * 8) / info.duration : undefined,
    bitrateEstimated: true,
  });
  return finish(info, source);
}

function parseId3(source: MediaByteSource, info: MediaContainerInfo): number | null {
  const head = readRange(source, 0, 10);
  if (!head || fourcc(head, 0) !== "ID3") return null;
  const major = head[3];
  const flags = head[5];
  const size =
    ((head[6] & 0x7f) << 21) | ((head[7] & 0x7f) << 14) | ((head[8] & 0x7f) << 7) | (head[9] & 0x7f);
  const end = 10 + size + (major >= 4 && (flags & 0x10) !== 0 ? 10 : 0);
  let offset = 10;

  while (offset + 6 <= end && offset < source.size) {
    const header = readRange(source, offset, major >= 3 ? 10 : 6);
    if (!header) break;
    const id = ascii(header, 0, major >= 3 ? 4 : 3);
    if (!id) break;
    const frameSize =
      major >= 4
        ? ((header[4] & 0x7f) << 21) | ((header[5] & 0x7f) << 14) | ((header[6] & 0x7f) << 7) | (header[7] & 0x7f)
        : major === 3
          ? u32le(header, 4)
          : u24be(header, 3);
    const payloadOffset = offset + (major >= 3 ? 10 : 6);
    if (frameSize <= 0 || payloadOffset + frameSize > source.size) break;

    const payload = readRange(source, payloadOffset, Math.min(frameSize, 8192));
    if (payload && payload.length >= 2) {
      const text = readId3Text(payload);
      if (text) {
        const key = ID3_KEYS[id];
        if (key) {
          info.tags[key] = text;
          applyTag(info, TAG_ALIASES[key] ?? key, text);
        }
      }
    }
    offset = payloadOffset + frameSize;
  }
  return end;
}

const ID3_KEYS: Record<string, string> = {
  TIT2: "title",
  TT2: "title",
  TPE1: "artist",
  TP1: "artist",
  TALB: "album",
  TAL: "album",
  TDRC: "date",
  TYER: "date",
  TYE: "date",
  TCON: "genre",
  TCO: "genre",
  TSSE: "encoder",
  TSS: "encoder",
  TENC: "encoder",
  COMM: "comment",
  COM: "comment",
  TCOM: "composer",
  TP2: "composer",
};

const TAG_ALIASES: Record<string, string> = {
  title: "TITLE",
  artist: "ARTIST",
  album: "ALBUM",
  date: "DATE",
  genre: "GENRE",
  comment: "COMMENT",
  encoder: "ENCODER",
  composer: "COMPOSER",
};

function readId3Text(payload: Uint8Array): string {
  const encoding = payload[0];
  const body = payload.subarray(1);

  if (encoding === 1 || encoding === 2) {
    // UTF-16 values often carry a BOM; without one, assume the declared order.
    if (body.length >= 2 && ((body[0] === 0xff && body[1] === 0xfe) || (body[0] === 0xfe && body[1] === 0xff))) {
      return decodeTag(body);
    }
    const view = new DataView(body.buffer, body.byteOffset, body.length - (body.length % 2));
    let text = "";
    const bigEndian = encoding === 2;
    for (let i = 0; i + 1 < body.length; i += 2) {
      text += String.fromCharCode(
        bigEndian ? view.getUint16(i, false) : view.getUint16(i, true)
      );
    }
    return text.replace(/\0+$/g, "").trim();
  }

  return decodeTag(body);
}

/* ------------------------------------------------------------------- Ogg */

export function parseOgg(source: MediaByteSource): MediaContainerInfo {
  const info = baseInfo("Ogg");
  const first = firstOggPacket(source);
  if (!first) return info;
  const id = first.packet;
  let durationRate = 0;

  if (ascii(id, 0, 8) === "OpusHead") {
    const channels = id[9] ?? 0;
    const preSkip = u16le(id, 10);
    const inputRate = u32le(id, 12);
    const sampleRate = inputRate > 0 ? inputRate : 48000;
    info.tracks.push({
      type: "audio",
      codec: "Opus",
      codecId: "OpusHead",
      codecString: "opus",
      sampleRate,
      channels,
      channelLayout: channelLayout(channels),
    });
    durationRate = 48000;
    info.tags.preskip = String(preSkip);
  } else if (id.length >= 16 && id[0] === 0x01 && ascii(id, 1, 6) === "vorbis") {
    const channels = id[11];
    const sampleRate = u32le(id, 12);
    const nominal = u32le(id, 20);
    info.tracks.push({
      type: "audio",
      codec: "Vorbis",
      codecId: "vorbis",
      codecString: "vorbis",
      sampleRate,
      channels,
      channelLayout: channelLayout(channels),
      bitrate: nominal > 0 ? nominal : undefined,
    });
    durationRate = sampleRate;
  } else if (id.length >= 28 && id[0] === 0x80 && ascii(id, 1, 6) === "theora") {
    const width = u16le(id, 10);
    const height = u16le(id, 12);
    const fpsNum = u32le(id, 20);
    const fpsDen = u32le(id, 24);
    info.tracks.push({
      type: "video",
      codec: "Theora",
      codecId: "theora",
      codecString: "theora",
      width,
      height,
      frameRate: fpsDen > 0 ? fpsNum / fpsDen : undefined,
    });
  } else {
    const flacIndex = findAscii(id, "fLaC");
    if (flacIndex >= 0) {
      // "fLaC" is followed by the 4-byte metadata block header, then STREAMINFO.
      const stream = readFlacStreamInfo(id, flacIndex + 8);
      if (stream) {
        info.container = "Ogg (FLAC)";
        info.tracks.push({
          type: "audio",
          codec: "FLAC",
          codecId: "fLaC",
          sampleRate: stream.sampleRate,
          channels: stream.channels,
          channelLayout: channelLayout(stream.channels),
          bitDepth: stream.bits,
        });
        durationRate = stream.sampleRate;
      }
    }
  }

  // Ogg has no global duration field: the last page granule is the sample count.
  const last = lastOggPage(source);
  if (last && durationRate > 0 && last.granule > 0) {
    info.duration = last.granule / durationRate;
  }

  // Vorbis comment packets live in page two; scan buffered ranges for them.
  scanVorbisComments(source, info);
  return finish(info, source);
}

function firstOggPacket(source: MediaByteSource): { packet: Uint8Array; offset: number } | null {
  const head = readRange(source, 0, 27);
  if (!head || fourcc(head, 0) !== "OggS") return null;
  const segments = head[26];
  const table = readRange(source, 27, segments);
  if (!table) return null;
  let packetLength = 0;
  for (let i = 0; i < segments; i += 1) {
    packetLength += table[i];
    if (table[i] < 255) break;
  }
  const packet = readRange(source, 27 + segments, packetLength);
  return packet ? { packet, offset: 27 + segments } : null;
}

function lastOggPage(source: MediaByteSource): { granule: number } | null {
  for (let index = source.chunks.length - 1; index >= 0; index -= 1) {
    const chunk = source.chunks[index];
    const data = chunk.data;
    for (let i = data.length - 4; i >= 0; i -= 1) {
      if (data[i] !== 0x4f || data[i + 1] !== 0x67 || data[i + 2] !== 0x67 || data[i + 3] !== 0x53) {
        continue;
      }
      const header = readRange(source, chunk.offset + i, 14);
      if (!header || header[4] !== 0) continue;
      const granule = Number(
        BigInt.asIntN(
          64,
          BigInt(u64le(header, 6))
        )
      );
      if (granule > 0) return { granule };
    }
  }
  return null;
}

function scanVorbisComments(source: MediaByteSource, info: MediaContainerInfo) {
  for (const chunk of source.chunks) {
    const data = chunk.data;
    const marker = 0x03;
    for (let i = 0; i + 7 < data.length; i += 1) {
      if (ascii(data, i + 1, 6) === "vorbis" && data[i] === marker) {
        parseVorbisComment(data.subarray(i + 7), info);
        return;
      }
      if (ascii(data, i, 8) === "OpusTags") {
        parseVorbisComment(data.subarray(i + 8), info);
        return;
      }
    }
  }
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
