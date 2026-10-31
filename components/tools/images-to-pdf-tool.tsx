"use client";

import * as React from "react";
import { FileImage, Loader2 } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageDrop, useImageFiles } from "@/components/tools/image-drop";
import { PdfOutputList, usePdfOutputs } from "@/components/tools/pdf-output";
import { OptionBar, OptionField } from "@/components/tools/tool-ui";
import { baseName } from "@/lib/files";
import { canvasToBlob, decodeFile, renderImage } from "@/lib/image";
import { savePdf } from "@/lib/pdf";
import { A4_WIDTH, A4_HEIGHT } from "@/lib/pdf-pages";
import type { PDFImage } from "pdf-lib";

const COPY = {
  zh: {
    size: "页面尺寸",
    auto: "跟随图片",
    orientation: "方向",
    portrait: "纵向",
    landscape: "横向",
    margin: "页边距",
    fileName: "文件名",
    run: "生成 PDF",
    running: "生成中…",
    pages: (n: number) => `${n} 页`,
    failed: "生成失败，请确认图片格式受当前浏览器支持",
    note: "每张图片一页，等比缩放居中。全部在浏览器内完成，文件不会上传。",
    pt: "pt",
  },
  en: {
    size: "Page size",
    auto: "Fit to image",
    orientation: "Orientation",
    portrait: "Portrait",
    landscape: "Landscape",
    margin: "Margin",
    fileName: "File name",
    run: "Create PDF",
    running: "Creating…",
    pages: (n: number) => `${n} page${n > 1 ? "s" : ""}`,
    failed: "Could not build the PDF — check that this browser can decode the images",
    note: "One image per page, scaled to fit and centred. Everything runs in your browser, nothing is uploaded.",
    pt: "pt",
  },
};

type PageSize = "auto" | "a4" | "letter";
type Orientation = "auto" | "portrait" | "landscape";

const LETTER_WIDTH = 612;
const LETTER_HEIGHT = 792;

/** Embed JPEGs as-is and repaint everything else to PNG, so WebP/AVIF work too. */
async function embedImage(pdf: PDFDocument, file: File): Promise<PDFImage> {
  if (file.type === "image/jpeg") {
    return pdf.embedJpg(await file.arrayBuffer());
  }
  const img = await decodeFile(file);
  const canvas = renderImage(img, {
    width: img.naturalWidth,
    height: img.naturalHeight,
    background: "#ffffff",
  });
  const blob = await canvasToBlob(canvas, "image/png");
  return pdf.embedPng(await blob.arrayBuffer());
}

export function ImagesToPdfTool() {
  const t = useCopy(COPY);
  const { images, add, remove, clear, error, loading } = useImageFiles({ multiple: true });
  const { outputs, replace } = usePdfOutputs();
  const [size, setSize] = React.useState<PageSize>("auto");
  const [orientation, setOrientation] = React.useState<Orientation>("auto");
  const [margin, setMargin] = React.useState(24);
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  const run = async () => {
    if (images.length === 0) return;
    setBusy(true);
    setFailed(false);
    try {
      const pdf = await PDFDocument.create();
      for (const item of images) {
        const embedded = await embedImage(pdf, item.file);
        // Images are measured in CSS pixels; PDF user units are 1/72 inch
        const px = 0.75;

        let pageWidth: number;
        let pageHeight: number;
        if (size === "auto") {
          pageWidth = embedded.width * px;
          pageHeight = embedded.height * px;
        } else {
          const base =
            size === "a4"
              ? { w: A4_WIDTH, h: A4_HEIGHT }
              : { w: LETTER_WIDTH, h: LETTER_HEIGHT };
          const landscape =
            orientation === "landscape" ||
            (orientation === "auto" && embedded.width > embedded.height);
          pageWidth = landscape ? base.h : base.w;
          pageHeight = landscape ? base.w : base.h;
        }

        const page = pdf.addPage([pageWidth, pageHeight]);
        const boxWidth = Math.max(1, pageWidth - margin * 2);
        const boxHeight = Math.max(1, pageHeight - margin * 2);
        const scale = Math.min(boxWidth / embedded.width, boxHeight / embedded.height);
        const width = embedded.width * scale;
        const height = embedded.height * scale;

        page.drawImage(embedded, {
          x: (pageWidth - width) / 2,
          y: (pageHeight - height) / 2,
          width,
          height,
        });
      }

      replace([
        {
          name: `${(name.trim() || baseName(images[0].name, "images")).replace(/\.pdf$/i, "")}.pdf`,
          blob: await savePdf(pdf),
          note: t.pages(images.length),
        },
      ]);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
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
        multiple
      />

      {images.length > 0 && (
        <>
          <OptionBar>
            <OptionField label={t.size}>
              <Select value={size} onValueChange={(v) => setSize(v as PageSize)}>
                <SelectTrigger size="xs" aria-label={t.size} className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t.auto}</SelectItem>
                  <SelectItem value="a4">A4</SelectItem>
                  <SelectItem value="letter">Letter</SelectItem>
                </SelectContent>
              </Select>
            </OptionField>

            {size !== "auto" && (
              <OptionField label={t.orientation}>
                <Select value={orientation} onValueChange={(v) => setOrientation(v as Orientation)}>
                  <SelectTrigger size="xs" aria-label={t.orientation} className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t.auto}</SelectItem>
                    <SelectItem value="portrait">{t.portrait}</SelectItem>
                    <SelectItem value="landscape">{t.landscape}</SelectItem>
                  </SelectContent>
                </Select>
              </OptionField>
            )}

            <OptionField label={t.margin}>
              <Input
                type="number"
                min={0}
                max={200}
                value={margin}
                onChange={(e) => setMargin(Math.min(Math.max(Number(e.target.value) || 0, 0), 200))}
                aria-label={t.margin}
                size="xs"
                className="w-16 text-center font-mono"
              />
              <span className="text-[11px] text-foreground-subtle">{t.pt}</span>
            </OptionField>

            <OptionField label={t.fileName}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="images"
                aria-label={t.fileName}
                size="xs"
                className="w-40"
              />
            </OptionField>

            <Button
              type="button"
              size="xs"
              onClick={run}
              disabled={busy}
              className="ml-auto gap-1.5"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileImage className="h-3.5 w-3.5" />
              )}
              {busy ? t.running : t.run}
            </Button>
          </OptionBar>

          {failed && <p className="text-xs text-red-fg">{t.failed}</p>}

          <PdfOutputList outputs={outputs} zipName="images.zip" />
        </>
      )}
    </div>
  );
}
