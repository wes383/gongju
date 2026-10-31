"use client";

import * as React from "react";
import { Download, Eraser, Loader2, MapPin } from "lucide-react";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { ImageDrop, useImageFiles } from "@/components/tools/image-drop";
import { canvasToBlob, decodeFile, downloadBlob, formatBytes, renderImage } from "@/lib/image";
import { readExif, type ExifEntry, type ExifResult } from "@/lib/exif";
import { cn } from "@/lib/utils";

const LABELS_ZH: Record<string, string> = {
  Make: "相机厂商",
  Model: "相机型号",
  LensModel: "镜头",
  Software: "处理软件",
  DateTime: "修改时间",
  DateTimeOriginal: "拍摄时间",
  ExposureTime: "快门速度",
  FNumber: "光圈",
  ISO: "感光度",
  FocalLength: "焦距",
  ExposureBias: "曝光补偿",
  Flash: "闪光灯",
  MeteringMode: "测光模式",
  Orientation: "方向",
  PixelXDimension: "宽度",
  PixelYDimension: "高度",
  XResolution: "水平分辨率",
  YResolution: "垂直分辨率",
  ResolutionUnit: "分辨率单位",
  Artist: "作者",
  Copyright: "版权",
  ImageDescription: "描述",
  GPS: "GPS 坐标",
  ShutterSpeedValue: "快门（APEX）",
  ApertureValue: "光圈（APEX）",
};

const LABELS_EN: Record<string, string> = {
  Make: "Camera make",
  Model: "Camera model",
  LensModel: "Lens",
  Software: "Software",
  DateTime: "Modified",
  DateTimeOriginal: "Taken",
  ExposureTime: "Shutter",
  FNumber: "Aperture",
  ISO: "ISO",
  FocalLength: "Focal length",
  ExposureBias: "Exposure bias",
  Flash: "Flash",
  MeteringMode: "Metering",
  Orientation: "Orientation",
  PixelXDimension: "Width",
  PixelYDimension: "Height",
  XResolution: "X resolution",
  YResolution: "Y resolution",
  ResolutionUnit: "Resolution unit",
  Artist: "Artist",
  Copyright: "Copyright",
  ImageDescription: "Description",
  GPS: "GPS",
  ShutterSpeedValue: "Shutter (APEX)",
  ApertureValue: "Aperture (APEX)",
};

const ORIENTATION_ZH = [
  "正常",
  "水平翻转",
  "旋转 180°",
  "垂直翻转",
  "转置",
  "顺时针旋转 90°",
  "横向",
  "逆时针旋转 90°",
];

const ORIENTATION_EN = [
  "Normal",
  "Flip horizontal",
  "Rotate 180°",
  "Flip vertical",
  "Transpose",
  "Rotate 90° CW",
  "Transverse",
  "Rotate 90° CCW",
];

const COPY = {
  zh: {
    empty: "选择图片后读取 EXIF",
    reading: "读取中…",
    none: "这张图片没有 EXIF 信息（可能是截图、已压缩过的图片或格式不支持）",
    summary: (tags: number) => `共解析 ${tags} 个标签`,
    gps: "这张图片记录了 GPS 坐标，分享前建议清除",
    clear: "清除 EXIF 并下载",
    cleared: "已重新编码，EXIF 与缩略图都已丢弃",
    original: "原始",
    cleaned: "清除后",
    download: "下载",
    flashOn: "已闪光",
    flashOff: "未闪光",
    note: "清除的方式是解码后重新绘制并编码，因此所有元数据（含 GPS、拍摄设备、缩略图）都会丢失，代价是重新压缩一次。",
    groups: { camera: "设备", exposure: "拍摄参数", gps: "位置", other: "其他" },
  },
  en: {
    empty: "Pick an image to read its EXIF",
    reading: "Reading…",
    none: "No EXIF found — screenshots, re-compressed images and some formats carry none",
    summary: (tags: number) => `${tags} tags parsed`,
    gps: "This image contains GPS coordinates, consider stripping them before sharing",
    clear: "Strip EXIF and download",
    cleared: "Re-encoded; EXIF and thumbnails are gone",
    original: "Original",
    cleaned: "Stripped",
    download: "Download",
    flashOn: "Fired",
    flashOff: "Did not fire",
    note: "Stripping works by decoding and re-encoding the image, so every metadata block (GPS, device, thumbnail) is dropped — at the cost of one extra compression pass.",
    groups: { camera: "Device", exposure: "Capture", gps: "Location", other: "Other" },
  },
};

export function ImageExifTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const labels = locale === "zh" ? LABELS_ZH : LABELS_EN;
  const orientations = locale === "zh" ? ORIENTATION_ZH : ORIENTATION_EN;

  const { images, add, remove, clear, error, loading } = useImageFiles();
  const image = images[0];

  // Results are tagged with the image they belong to, so switching files never
  // shows stale metadata and no state has to be reset inside an effect.
  const [read, setRead] = React.useState<{ id: string; result: ExifResult | null } | null>(null);
  const [cleaned, setCleaned] = React.useState<{ id: string; url: string; blob: Blob } | null>(null);
  const [working, setWorking] = React.useState(false);

  const exif = read && image && read.id === image.id ? read.result : undefined;
  const currentCleaned = cleaned && image && cleaned.id === image.id ? cleaned : null;

  React.useEffect(() => {
    if (!image) return;
    let cancelled = false;
    image.file
      .arrayBuffer()
      .then((buffer) => {
        if (!cancelled) setRead({ id: image.id, result: readExif(buffer) });
      })
      .catch(() => {
        if (!cancelled) setRead({ id: image.id, result: null });
      });
    return () => {
      cancelled = true;
    };
  }, [image]);

  const strip = async () => {
    if (!image) return;
    setWorking(true);
    try {
      const img = await decodeFile(image.file);
      const isPng = image.type === "image/png";
      const canvas = renderImage(img, {
        width: img.naturalWidth,
        height: img.naturalHeight,
        fit: "stretch",
        background: isPng ? undefined : "#ffffff",
      });
      const blob = await canvasToBlob(canvas, isPng ? "image/png" : "image/jpeg", 0.92);
      setCleaned({ id: image.id, url: URL.createObjectURL(blob), blob });
    } finally {
      setWorking(false);
    }
  };

  React.useEffect(() => {
    if (!cleaned) return;
    const url = cleaned.url;
    return () => URL.revokeObjectURL(url);
  }, [cleaned]);

  const groups: { id: ExifEntry["group"]; entries: ExifEntry[] }[] = exif
    ? (["camera", "exposure", "gps", "other"] as const)
        .map((id) => ({ id, entries: exif.entries.filter((e) => e.group === id) }))
        .filter((g) => g.entries.length > 0)
    : [];

  const valueOf = (entry: ExifEntry) => {
    if (entry.key === "Orientation") {
      return orientations[Number(entry.value) - 1] ?? entry.value;
    }
    if (entry.key === "Flash") {
      return Number(entry.value) ? t.flashOn : t.flashOff;
    }
    return entry.value;
  };

  return (
    <div className="flex flex-col gap-4">
      <ImageDrop
        images={images}
        onAdd={add}
        onRemove={remove}
        onClear={clear}
        error={error}
        loading={loading}
      />

      {image && (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-xs text-foreground">{image.name}</p>
              <p className="text-[11px] text-foreground-subtle">
                {image.width}×{image.height} · {formatBytes(image.size)}
                {exif && ` · ${t.summary(exif.tagCount)}`}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {currentCleaned && (
                <span className="text-[11px] text-foreground-subtle">
                  {t.original} {formatBytes(image.size)} → {t.cleaned} {formatBytes(currentCleaned.blob.size)}
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={strip}
                disabled={working}
                className="gap-1.5"
              >
                {working ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Eraser className="h-3.5 w-3.5" />
                )}
                {t.clear}
              </Button>
              {currentCleaned && (
                <Button
                  type="button"
                  size="xs"
                  className="gap-1.5"
                  onClick={() =>
                    downloadBlob(
                      currentCleaned.blob,
                      `${image.name.replace(/\.[^.]+$/, "")}-clean.${image.type === "image/png" ? "png" : "jpg"}`
                    )
                  }
                >
                  <Download className="h-3.5 w-3.5" />
                  {t.download}
                </Button>
              )}
            </div>
          </div>

          {exif === undefined && (
            <p className="py-8 text-center text-sm text-foreground-subtle">{t.reading}</p>
          )}

          {exif === null && (
            <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-foreground-subtle">
              {t.none}
            </p>
          )}

          {exif && (
            <>
              {exif.hasGps && (
                <p className="flex items-center gap-1.5 text-xs text-orange-fg">
                  <MapPin className="h-3.5 w-3.5" />
                  {t.gps}
                </p>
              )}
              <div className="overflow-hidden rounded-lg border border-border bg-surface">
                {groups.map((group) => (
                  <section key={group.id} className="border-b border-border last:border-b-0">
                    <h3 className="bg-hover-bg px-4 py-1.5 font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
                      {t.groups[group.id]}
                    </h3>
                    <dl>
                      {group.entries.map((entry) => (
                        <div
                          key={entry.key}
                          className="flex items-start gap-3 border-b border-border px-4 py-2 last:border-b-0"
                        >
                          <dt className="w-28 shrink-0 text-xs text-foreground-muted">
                            {labels[entry.key] ?? entry.key}
                          </dt>
                          <dd
                            className={cn(
                              "min-w-0 flex-1 break-all font-mono text-xs text-foreground"
                            )}
                          >
                            {valueOf(entry)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>
              <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
            </>
          )}
        </>
      )}

    </div>
  );
}
