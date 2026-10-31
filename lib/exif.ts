/**
 * Minimal EXIF reader.
 *
 * Supports the three containers that actually carry EXIF on the web — JPEG
 * (APP1), PNG (eXIf) and WebP (EXIF) — and parses the TIFF block inside.
 * Only the tags shown to users are decoded; everything else is reported by
 * tag number so nothing silently disappears.
 */

export interface ExifEntry {
  /** Stable key used for the translated label, e.g. "Make" */
  key: string;
  /** English fallback label */
  label: string;
  value: string;
  group: "camera" | "exposure" | "gps" | "other";
}

export interface ExifResult {
  entries: ExifEntry[];
  /** Total tags found, including ones we do not decode */
  tagCount: number;
  orientation: number | null;
  hasGps: boolean;
}

const TAG_LABELS: Record<number, { key: string; group: ExifEntry["group"] }> = {
  0x010f: { key: "Make", group: "camera" },
  0x0110: { key: "Model", group: "camera" },
  0x0112: { key: "Orientation", group: "other" },
  0x011a: { key: "XResolution", group: "other" },
  0x011b: { key: "YResolution", group: "other" },
  0x0128: { key: "ResolutionUnit", group: "other" },
  0x0131: { key: "Software", group: "other" },
  0x0132: { key: "DateTime", group: "other" },
  0x829a: { key: "ExposureTime", group: "exposure" },
  0x829d: { key: "FNumber", group: "exposure" },
  0x8827: { key: "ISO", group: "exposure" },
  0x9003: { key: "DateTimeOriginal", group: "exposure" },
  0x9201: { key: "ShutterSpeedValue", group: "exposure" },
  0x9202: { key: "ApertureValue", group: "exposure" },
  0x9204: { key: "ExposureBias", group: "exposure" },
  0x9207: { key: "MeteringMode", group: "exposure" },
  0x9209: { key: "Flash", group: "exposure" },
  0x920a: { key: "FocalLength", group: "exposure" },
  0xa002: { key: "PixelXDimension", group: "other" },
  0xa003: { key: "PixelYDimension", group: "other" },
  0xa434: { key: "LensModel", group: "camera" },
  0x010e: { key: "ImageDescription", group: "other" },
  0x013b: { key: "Artist", group: "other" },
  0x8298: { key: "Copyright", group: "other" },
};

const TYPE_SIZES: Record<number, number> = {
  1: 1, // BYTE
  2: 1, // ASCII
  3: 2, // SHORT
  4: 4, // LONG
  5: 8, // RATIONAL
  6: 1, // SBYTE
  7: 1, // UNDEFINED
  8: 2, // SSHORT
  9: 4, // SLONG
  10: 8, // SRATIONAL
  11: 4, // FLOAT
  12: 8, // DOUBLE
};

/** Find the TIFF block inside a JPEG / PNG / WebP buffer. */
function locateTiff(buffer: ArrayBuffer): { view: DataView; start: number } | null {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // JPEG: SOI then a chain of markers
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      const size = view.getUint16(offset + 2, false);
      if (marker === 0xe1) {
        const start = offset + 4;
        if (
          bytes[start] === 0x45 && // E
          bytes[start + 1] === 0x78 && // x
          bytes[start + 2] === 0x69 && // i
          bytes[start + 3] === 0x66 // f
        ) {
          return { view, start: start + 6 };
        }
      }
      if (marker === 0xda) break; // start of scan, no metadata after this
      offset += 2 + size;
    }
    return null;
  }

  // PNG: walk chunks looking for eXIf
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    let offset = 8;
    while (offset + 8 < bytes.length) {
      const length = view.getUint32(offset, false);
      const type = String.fromCharCode(
        bytes[offset + 4],
        bytes[offset + 5],
        bytes[offset + 6],
        bytes[offset + 7]
      );
      if (type === "eXIf") return { view, start: offset + 8 };
      offset += 12 + length;
    }
    return null;
  }

  // WebP: RIFF container with an EXIF chunk
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    let offset = 12;
    while (offset + 8 < bytes.length) {
      const type = String.fromCharCode(
        bytes[offset],
        bytes[offset + 1],
        bytes[offset + 2],
        bytes[offset + 3]
      );
      const size = view.getUint32(offset + 4, true);
      if (type === "EXIF") return { view, start: offset + 8 };
      offset += 8 + size + (size % 2);
    }
  }

  return null;
}

interface IfdEntry {
  tag: number;
  type: number;
  count: number;
  valueOffset: number;
  inline: boolean;
}

function readIfd(view: DataView, tiffStart: number, offset: number, little: boolean): IfdEntry[] {
  const entries: IfdEntry[] = [];
  const countOffset = tiffStart + offset;
  if (countOffset + 2 > view.byteLength) return entries;
  const count = view.getUint16(countOffset, little);
  for (let i = 0; i < count; i += 1) {
    const base = countOffset + 2 + i * 12;
    if (base + 12 > view.byteLength) break;
    const tag = view.getUint16(base, little);
    const type = view.getUint16(base + 2, little);
    const valueCount = view.getUint32(base + 4, little);
    const size = (TYPE_SIZES[type] ?? 0) * valueCount;
    entries.push({
      tag,
      type,
      count: valueCount,
      valueOffset: size <= 4 ? base + 8 : tiffStart + view.getUint32(base + 8, little),
      inline: size <= 4,
    });
  }
  return entries;
}

function readAscii(view: DataView, entry: IfdEntry): string {
  let out = "";
  for (let i = 0; i < entry.count; i += 1) {
    const code = view.getUint8(entry.valueOffset + i);
    if (code === 0) break;
    out += String.fromCharCode(code);
  }
  return out.trim();
}

function readRationals(view: DataView, entry: IfdEntry, little: boolean): number[] {
  const out: number[] = [];
  const signed = entry.type === 10;
  for (let i = 0; i < entry.count; i += 1) {
    const base = entry.valueOffset + i * 8;
    if (base + 8 > view.byteLength) break;
    const num = signed ? view.getInt32(base, little) : view.getUint32(base, little);
    const den = signed ? view.getInt32(base + 4, little) : view.getUint32(base + 4, little);
    out.push(den === 0 ? 0 : num / den);
  }
  return out;
}

function readNumbers(view: DataView, entry: IfdEntry, little: boolean): number[] {
  const out: number[] = [];
  for (let i = 0; i < entry.count; i += 1) {
    const base = entry.valueOffset + i * (TYPE_SIZES[entry.type] ?? 1);
    if (base + 4 > view.byteLength) break;
    switch (entry.type) {
      case 1:
      case 7:
        out.push(view.getUint8(base));
        break;
      case 3:
        out.push(view.getUint16(base, little));
        break;
      case 4:
        out.push(view.getUint32(base, little));
        break;
      case 6:
        out.push(view.getInt8(base));
        break;
      case 8:
        out.push(view.getInt16(base, little));
        break;
      case 9:
        out.push(view.getInt32(base, little));
        break;
      default:
        out.push(view.getUint8(base));
    }
  }
  return out;
}

function formatEntry(view: DataView, entry: IfdEntry, little: boolean): string {
  if (entry.type === 2) return readAscii(view, entry);
  if (entry.type === 5 || entry.type === 10) {
    const values = readRationals(view, entry, little);
    if (entry.tag === 0x829a) {
      // Exposure time reads better as a fraction
      return values[0] >= 1 ? `${values[0]} s` : `1/${Math.round(1 / values[0])} s`;
    }
    if (entry.tag === 0x829d) return `f/${values[0].toFixed(1)}`;
    if (entry.tag === 0x920a) return `${values[0].toFixed(1)} mm`;
    if (entry.tag === 0x9202) return `f/${(2 ** (values[0] / 2)).toFixed(1)}`;
    if (entry.tag === 0x9204) return `${values[0] > 0 ? "+" : ""}${values[0].toFixed(2)} EV`;
    return values.map((v) => (Number.isInteger(v) ? String(v) : v.toFixed(2))).join(", ");
  }
  return readNumbers(view, entry, little).join(", ");
}

function readGps(
  view: DataView,
  tiffStart: number,
  offset: number,
  little: boolean
): { lat: number | null; lon: number | null } {
  const entries = readIfd(view, tiffStart, offset, little);
  const byTag = new Map(entries.map((e) => [e.tag, e]));
  const readRef = (tag: number) => {
    const entry = byTag.get(tag);
    return entry ? readAscii(view, entry) : "";
  };
  const toDegrees = (tag: number) => {
    const entry = byTag.get(tag);
    if (!entry) return null;
    const [d = 0, m = 0, s = 0] = readRationals(view, entry, little);
    return d + m / 60 + s / 3600;
  };
  const lat = toDegrees(2);
  const lon = toDegrees(4);
  const latRef = readRef(1);
  const lonRef = readRef(3);
  return {
    lat: lat === null ? null : latRef === "S" ? -lat : lat,
    lon: lon === null ? null : lonRef === "W" ? -lon : lon,
  };
}

export function readExif(buffer: ArrayBuffer): ExifResult | null {
  const located = locateTiff(buffer);
  if (!located) return null;
  const { view, start } = located;
  if (start + 8 > view.byteLength) return null;

  const order = view.getUint16(start, false);
  const little = order === 0x4949;
  if (!little && order !== 0x4d4d) return null;
  if (view.getUint16(start + 2, little) !== 0x002a) return null;

  const ifd0Offset = view.getUint32(start + 4, little);
  const ifd0 = readIfd(view, start, ifd0Offset, little);
  if (ifd0.length === 0) return null;

  const entries: ExifEntry[] = [];
  const seen = new Set<string>();
  const push = (group: ExifEntry["group"], key: string, value: string) => {
    if (!value || seen.has(key)) return;
    seen.add(key);
    entries.push({ key, label: key, value, group });
  };

  let exifOffset: number | null = null;
  let gpsOffset: number | null = null;
  let orientation: number | null = null;

  for (const entry of ifd0) {
    if (entry.tag === 0x8769) {
      exifOffset = view.getUint32(entry.valueOffset, little);
      continue;
    }
    if (entry.tag === 0x8825) {
      gpsOffset = view.getUint32(entry.valueOffset, little);
      continue;
    }
    if (entry.tag === 0x0112) orientation = readNumbers(view, entry, little)[0] ?? null;
    const meta = TAG_LABELS[entry.tag];
    const value = formatEntry(view, entry, little);
    push(meta?.group ?? "other", meta?.key ?? `Tag 0x${entry.tag.toString(16)}`, value);
  }

  let tagCount = ifd0.length;

  if (exifOffset !== null) {
    const sub = readIfd(view, start, exifOffset, little);
    tagCount += sub.length;
    for (const entry of sub) {
      const meta = TAG_LABELS[entry.tag];
      if (!meta) continue;
      push(meta.group, meta.key, formatEntry(view, entry, little));
    }
  }

  let hasGps = false;
  if (gpsOffset !== null) {
    const gps = readGps(view, start, gpsOffset, little);
    if (gps.lat !== null && gps.lon !== null) {
      hasGps = true;
      push(
        "gps",
        "GPS",
        `${gps.lat.toFixed(6)}, ${gps.lon.toFixed(6)}`
      );
    }
  }

  return { entries, tagCount, orientation, hasGps };
}
