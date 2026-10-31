"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import { useCopy, useT } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { ImageDrop, ImagePreview, useImageFiles } from "@/components/tools/image-drop";
import {
  CopyButton,
  InputArea,
  OptionBar,
  OptionField,
  OutputArea,
  Segmented,
} from "@/components/tools/tool-ui";
import { baseName, downloadBlob, extensionFor, formatBytes } from "@/lib/image";

const COPY = {
  zh: {
    mode: "方向",
    toBase64: "图片 → Base64",
    toImage: "Base64 → 图片",
    style: "输出形式",
    plain: "纯 Base64",
    dataUrl: "Data URL",
    css: "CSS",
    html: "HTML 标签",
    original: "原图",
    encoded: "编码后",
    growth: "体积增长",
    inputPlaceholder: "粘贴 Base64 或 Data URL，支持带换行",
    empty: "结果会显示在这里",
    invalid: "这段内容不是有效的 Base64 图片",
    preview: "预览",
    download: "下载图片",
    note: "Base64 会把体积撑大约 33%，超过 2MB 的图片不建议内联到 HTML / CSS 里。",
    paste: "粘贴 Base64",
  },
  en: {
    mode: "Direction",
    toBase64: "Image → Base64",
    toImage: "Base64 → Image",
    style: "Output",
    plain: "Plain Base64",
    dataUrl: "Data URL",
    css: "CSS",
    html: "HTML tag",
    original: "Original",
    encoded: "Encoded",
    growth: "Size growth",
    inputPlaceholder: "Paste Base64 or a Data URL, line breaks are fine",
    empty: "Output appears here",
    invalid: "This is not a valid Base64 image",
    preview: "Preview",
    download: "Download image",
    note: "Base64 inflates the payload by about 33%; avoid inlining images over 2 MB into HTML or CSS.",
    paste: "Paste Base64",
  },
};

type Style = "plain" | "dataUrl" | "css" | "html";

export function ImageBase64Tool() {
  const t = useCopy(COPY);
  const shared = useT();
  const [mode, setMode] = React.useState<"encode" | "decode">("encode");
  const [style, setStyle] = React.useState<Style>("dataUrl");

  // encode side
  const { images, add, remove, clear, error, loading } = useImageFiles();
  const image = images[0];
  const [dataUrl, setDataUrl] = React.useState<{ id: string; url: string } | null>(null);
  const [encoding, setEncoding] = React.useState(false);

  // decode side
  const [raw, setRaw] = React.useState("");
  const [decoded, setDecoded] = React.useState<{ url: string; blob: Blob; type: string } | null>(null);
  const [decodeError, setDecodeError] = React.useState(false);

  React.useEffect(() => {
    if (!image) return;
    let cancelled = false;
    const reader = new FileReader();
    // Fires asynchronously, so the loading flag never lands in the effect body
    reader.onloadstart = () => {
      if (!cancelled) setEncoding(true);
    };
    reader.onload = () => {
      if (!cancelled && typeof reader.result === "string") {
        setDataUrl({ id: image.id, url: reader.result });
        setEncoding(false);
      }
    };
    reader.onerror = () => {
      if (!cancelled) setEncoding(false);
    };
    reader.readAsDataURL(image.file);
    return () => {
      cancelled = true;
    };
  }, [image]);

  const currentDataUrl = dataUrl && image && dataUrl.id === image.id ? dataUrl.url : null;
  const base64 = currentDataUrl ? currentDataUrl.slice(currentDataUrl.indexOf(",") + 1) : "";
  const name = image ? baseName(image.name) : "image";

  const output =
    style === "plain"
      ? base64
      : style === "dataUrl"
        ? (currentDataUrl ?? "")
        : style === "css"
          ? `background-image: url("${currentDataUrl}");`
          : `<img src="${currentDataUrl}" alt="${name}" />`;

  React.useEffect(() => {
    let created: string | null = null;
    // Debounced so pasting a long string does not decode on every keystroke
    const timer = window.setTimeout(() => {
      setDecodeError(false);
      const text = raw.trim();
      if (!text) {
        setDecoded(null);
        return;
      }
      const comma = text.indexOf(",");
      const payload = text.startsWith("data:") && comma >= 0 ? text.slice(comma + 1) : text;
      const type =
        text.startsWith("data:") && comma >= 0 ? text.slice(5, text.indexOf(";")) : "image/png";
      try {
        const binary = atob(payload.replace(/\s/g, ""));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type });
        created = URL.createObjectURL(blob);
        setDecoded({ url: created, blob, type });
      } catch {
        setDecodeError(true);
        setDecoded(null);
      }
    }, 120);

    return () => {
      window.clearTimeout(timer);
      if (created) URL.revokeObjectURL(created);
    };
  }, [raw]);

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        ariaLabel={t.mode}
        value={mode}
        onChange={setMode}
        options={[
          { value: "encode", label: t.toBase64 },
          { value: "decode", label: t.toImage },
        ]}
      />

      {mode === "encode" ? (
        <>
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
              <OptionBar>
                <OptionField label={t.style}>
                  <Segmented
                    ariaLabel={t.style}
                    value={style}
                    onChange={setStyle}
                    options={[
                      { value: "plain", label: t.plain },
                      { value: "dataUrl", label: t.dataUrl },
                      { value: "css", label: t.css },
                      { value: "html", label: t.html },
                    ]}
                  />
                </OptionField>
                <CopyButton value={output} className="ml-auto" />
              </OptionBar>

              <div className="overflow-hidden rounded-lg border border-border bg-surface">
                <header className="flex h-10 items-center gap-3 border-b border-border px-3 text-[11px] text-foreground-subtle">
                  <span className="font-mono uppercase tracking-wide">{t.encoded}</span>
                  {encoding ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>{formatBytes(output.length)}</span>
                      <span>
                        {t.original} {formatBytes(image.size)} · {t.growth}{" "}
                        <span className="text-orange-fg">
                          +{Math.round((output.length / image.size - 1) * 100)}%
                        </span>
                      </span>
                    </>
                  )}
                </header>
                <OutputArea value={output} minHeight="min-h-[220px]" />
              </div>
            </>
          )}

          <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
        </>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <header className="flex h-10 items-center gap-2 border-b border-border px-3">
              <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
                Base64
              </span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="ml-auto"
                onClick={() => setRaw("")}
              >
                {shared.clear}
              </Button>
            </header>
            <InputArea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={t.inputPlaceholder}
              className="min-h-[160px]"
              spellCheck={false}
            />
          </div>

          {decodeError && <p className="text-xs text-red-fg">{t.invalid}</p>}

          {decoded && (
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <header className="flex h-10 items-center gap-2 border-b border-border px-3">
                <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
                  {t.preview}
                </span>
                <span className="text-[11px] text-foreground-subtle">
                  {decoded.type} · {formatBytes(decoded.blob.size)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="ml-auto gap-1.5"
                  onClick={() =>
                    downloadBlob(decoded.blob, `decoded.${extensionFor(decoded.type)}`)
                  }
                >
                  <Download className="h-3.5 w-3.5" />
                  {t.download}
                </Button>
              </header>
              <div className="p-3">
                <ImagePreview src={decoded.url} alt={t.preview} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

