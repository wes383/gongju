import { describe, expect, it } from "vitest";
import { parseMediaContainer } from "@/lib/media-container";
import { wholeSource } from "@/lib/media-bytes";

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function writeType(target: Uint8Array, offset: number, type: string) {
  for (let i = 0; i < 4; i += 1) target[offset + i] = type.charCodeAt(i);
}

function box(type: string, ...parts: Uint8Array[]): Uint8Array {
  const body = concat(parts);
  const out = new Uint8Array(8 + body.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, out.length, false);
  writeType(out, 4, type);
  out.set(body, 8);
  return out;
}

function fullBox(type: string, version: number, payload: Uint8Array): Uint8Array {
  const head = new Uint8Array(4);
  head[0] = version;
  return box(type, head, payload);
}

function wav({
  sampleRate = 48000,
  channels = 2,
  bits = 16,
  seconds = 1.5,
}: {
  sampleRate?: number;
  channels?: number;
  bits?: number;
  seconds?: number;
} = {}): Uint8Array {
  const blockAlign = (channels * bits) / 8;
  const dataSize = Math.round(seconds * sampleRate) * blockAlign;
  const byteRate = sampleRate * blockAlign;
  const out = new Uint8Array(12 + 8 + 16 + 8 + dataSize);
  const view = new DataView(out.buffer);

  writeType(out, 0, "RIFF");
  view.setUint32(4, out.length - 8, true);
  writeType(out, 8, "WAVE");
  writeType(out, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bits, true);
  writeType(out, 36, "data");
  view.setUint32(40, dataSize, true);
  return out;
}

function flac(): Uint8Array {
  const streamInfo = new Uint8Array(34);
  // min/max block size
  streamInfo[0] = 0x10;
  streamInfo[1] = 0x00;
  streamInfo[2] = 0x10;
  streamInfo[3] = 0x00;
  // 20-bit sample rate (48000), 3-bit channels (2), 5-bit depth (16)
  streamInfo[10] = 0x0b;
  streamInfo[11] = 0xb8;
  streamInfo[12] = 0x02;
  streamInfo[13] = 0xf0;
  // 36-bit total samples (72000 = 0x00011940)
  streamInfo[15] = 0x01;
  streamInfo[16] = 0x19;
  streamInfo[17] = 0x40;

  const blockHeader = new Uint8Array([0x80, 0x00, 0x00, 0x22]);
  return concat([new Uint8Array([0x66, 0x4c, 0x61, 0x43]), blockHeader, streamInfo]);
}

function mp3Frame(): Uint8Array {
  const header = new Uint8Array([0xff, 0xfb, 0x90, 0x00]);
  const frameLength = 417;
  const frame = new Uint8Array(frameLength);
  frame.set(header, 0);
  return frame;
}

function mp3(): Uint8Array {
  // One header frame plus 99 repeats: CBR at 128 kbps, 44.1 kHz, stereo.
  const frames = Array.from({ length: 100 }, () => mp3Frame());
  return concat(frames);
}

function mp4(): Uint8Array {
  const ftyp = box(
    "ftyp",
    new Uint8Array([0x69, 0x73, 0x6f, 0x6d]),
    new Uint8Array(4),
    new Uint8Array([0x6d, 0x70, 0x34, 0x32])
  );

  const mvhdPayload = new Uint8Array(96);
  const mvhdView = new DataView(mvhdPayload.buffer);
  mvhdView.setUint32(8, 1000, false); // timescale
  mvhdView.setUint32(12, 2000, false); // duration
  const mvhd = fullBox("mvhd", 0, mvhdPayload);

  const tkhdPayload = new Uint8Array(80);
  const tkhdView = new DataView(tkhdPayload.buffer);
  tkhdView.setUint32(36, 0x00010000, false); // identity matrix a
  tkhdView.setUint32(52, 0x00010000, false); // identity matrix d
  tkhdView.setUint32(72, 640 * 65536, false); // width
  tkhdView.setUint32(76, 360 * 65536, false); // height
  const tkhd = fullBox("tkhd", 0, tkhdPayload);

  const mdhdPayload = new Uint8Array(20);
  const mdhdView = new DataView(mdhdPayload.buffer);
  mdhdView.setUint32(8, 1000, false); // timescale
  mdhdView.setUint32(12, 2000, false); // duration
  mdhdView.setUint16(16, 0x55c4, false); // "und"
  const mdhd = fullBox("mdhd", 0, mdhdPayload);

  const hdlrPayload = new Uint8Array(21);
  writeType(hdlrPayload, 4, "vide");
  const hdlr = fullBox("hdlr", 0, hdlrPayload);

  const sttsPayload = new Uint8Array(12);
  const sttsView = new DataView(sttsPayload.buffer);
  sttsView.setUint32(0, 1, false); // entry count
  sttsView.setUint32(4, 50, false); // sample count
  sttsView.setUint32(8, 40, false); // sample delta
  const stts = fullBox("stts", 0, sttsPayload);

  const avcCPayload = new Uint8Array([0x01, 0x4d, 0x40, 0x1f, 0xff, 0xe0, 0x00, 0x1f]);
  const avcC = box("avcC", avcCPayload);

  const paspPayload = new Uint8Array(8);
  const paspView = new DataView(paspPayload.buffer);
  paspView.setUint32(0, 1, false);
  paspView.setUint32(4, 1, false);
  const pasp = box("pasp", paspPayload);

  const colrPayload = new Uint8Array(11);
  writeType(colrPayload, 0, "nclx");
  const colrView = new DataView(colrPayload.buffer);
  colrView.setUint16(4, 1, false); // BT.709 primaries
  colrView.setUint16(6, 1, false); // SDR transfer
  colrView.setUint16(8, 1, false); // BT.709 matrix
  const colr = box("colr", colrPayload);

  const btrtPayload = new Uint8Array(12);
  const btrtView = new DataView(btrtPayload.buffer);
  btrtView.setUint32(4, 900000, false); // max bitrate
  btrtView.setUint32(8, 800000, false); // average bitrate
  const btrt = box("btrt", btrtPayload);

  const entryBody = new Uint8Array(78);
  const entryView = new DataView(entryBody.buffer);
  entryView.setUint16(24, 640, false); // width at box offset 32
  entryView.setUint16(26, 360, false); // height at box offset 34
  entryView.setUint16(74, 24, false); // depth at box offset 82
  const avc1 = box("avc1", entryBody, avcC, pasp, colr, btrt);

  const stsdPayload = new Uint8Array(4);
  new DataView(stsdPayload.buffer).setUint32(0, 1, false);
  const stsd = fullBox("stsd", 0, concat([stsdPayload, avc1]));

  const stbl = box("stbl", stsd, stts);
  const minf = box("minf", stbl);
  const mdia = box("mdia", mdhd, hdlr, minf);
  const trak = box("trak", tkhd, mdia);

  const meta = box(
    "meta",
    new Uint8Array(4),
    box("hdlr", new Uint8Array(20)),
    box(
      "ilst",
      box("©too", box("data", new Uint8Array(8), new TextEncoder().encode("Lavf60.3.100")))
    )
  );
  const udta = box("udta", meta);
  const moov = box("moov", mvhd, trak, udta);

  return concat([ftyp, moov]);
}

function parse(bytes: Uint8Array) {
  return parseMediaContainer(wholeSource(bytes));
}

describe("parseMediaContainer", () => {
  it("reads exact WAV header values", () => {
    const info = parse(wav());
    expect(info.container).toBe("WAV");
    expect(info.duration).toBeCloseTo(1.5, 5);
    expect(info.tracks).toHaveLength(1);
    const track = info.tracks[0];
    expect(track.type).toBe("audio");
    expect(track.sampleRate).toBe(48000);
    expect(track.channels).toBe(2);
    expect(track.channelLayout).toBe("Stereo");
    expect(track.bitDepth).toBe(16);
    expect(track.bitrate).toBe(48000 * 2 * 2 * 8);
    expect(track.bitrateEstimated).toBeUndefined();
  });

  it("reads FLAC STREAMINFO", () => {
    const info = parse(flac());
    expect(info.container).toBe("FLAC");
    expect(info.duration).toBeCloseTo(1.5, 5);
    const track = info.tracks[0];
    expect(track.codec).toBe("FLAC");
    expect(track.sampleRate).toBe(48000);
    expect(track.channels).toBe(2);
    expect(track.bitDepth).toBe(16);
  });

  it("reads a CBR MP3 frame header", () => {
    const info = parse(mp3());
    const track = info.tracks[0];
    expect(info.container).toBe("MP3");
    expect(track.codec).toBe("MP3");
    expect(track.sampleRate).toBe(44100);
    expect(track.channels).toBe(2);
    expect(track.bitrate).toBe(128000);
    expect(info.duration).toBeCloseTo((41700 * 8) / 128000, 2);
  });

  it("reads MP4 video and tag boxes", () => {
    const info = parse(mp4());
    expect(info.container).toBe("MP4");
    expect(info.brands).toEqual(["isom", "mp42"]);
    expect(info.duration).toBeCloseTo(2, 5);
    expect(info.encoder).toBe("Lavf60.3.100");
    expect(info.tracks).toHaveLength(1);

    const track = info.tracks[0];
    expect(track.type).toBe("video");
    expect(track.codec).toBe("H.264 (avc1)");
    expect(track.codecString).toBe("avc1.4D401F");
    expect(track.width).toBe(640);
    expect(track.height).toBe(360);
    expect(track.frameRate).toBeCloseTo(25, 5);
    expect(track.bitrate).toBe(800000);
    expect(track.bitDepth).toBe(24);
    expect(track.displayWidth).toBe(640);
    expect(track.colorSpace).toContain("SDR");
    expect(track.hdr).toBe(false);
  });

  it("returns an empty result for unknown bytes", () => {
    const info = parse(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
    expect(info.tracks).toEqual([]);
  });
});
