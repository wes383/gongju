"use client";

import * as React from "react";
import { Download, ImagePlus, Loader2, X } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorField } from "@/components/tools/color-field";
import { ErrorNote, InputArea, OptionBar, OptionField, Segmented, Toggle } from "@/components/tools/tool-ui";
import {
  buildVCard,
  buildWifi,
  DEFAULT_QR,
  qrSvg,
  renderQr,
  type QrLevel,
  type QrOptions,
} from "@/lib/qr";
import { downloadBlob } from "@/lib/image";

const COPY = {
  zh: {
    kind: "内容",
    text: "文本",
    url: "网址",
    wifi: "WiFi",
    vcard: "名片",
    content: "内容",
    textPlaceholder: "输入任意文本",
    urlPlaceholder: "example.com 或 https://example.com",
    ssid: "网络名称",
    password: "密码",
    encryption: "加密方式",
    hidden: "隐藏网络",
    none: "无密码",
    name: "姓名",
    org: "公司",
    phone: "电话",
    email: "邮箱",
    website: "网址",
    size: "尺寸",
    margin: "留白",
    level: "纠错",
    colors: "颜色",
    logo: "Logo",
    uploadLogo: "上传 Logo",
    removeLogo: "移除",
    logoHint: "带 Logo 时建议纠错级别设为 H，避免中间被遮住后无法识别。",
    preview: "预览",
    downloadPng: "下载 PNG",
    downloadSvg: "下载 SVG",
    empty: "输入内容后生成二维码",
    tooLong: "内容太长，当前纠错级别放不下",
    failed: "生成失败",
    note: "二维码在浏览器内生成，内容不会上传。留白单位是模块数，一般 2–4 即可。",
  },
  en: {
    kind: "Content",
    text: "Text",
    url: "URL",
    wifi: "WiFi",
    vcard: "vCard",
    content: "Content",
    textPlaceholder: "Any text",
    urlPlaceholder: "example.com or https://example.com",
    ssid: "Network name",
    password: "Password",
    encryption: "Security",
    hidden: "Hidden network",
    none: "No password",
    name: "Name",
    org: "Company",
    phone: "Phone",
    email: "Email",
    website: "Website",
    size: "Size",
    margin: "Margin",
    level: "EC level",
    colors: "Colours",
    logo: "Logo",
    uploadLogo: "Upload logo",
    removeLogo: "Remove",
    logoHint: "With a logo, use error correction level H so the covered centre can still be recovered.",
    preview: "Preview",
    downloadPng: "Download PNG",
    downloadSvg: "Download SVG",
    empty: "Type something to generate a QR code",
    tooLong: "Content is too long for this error correction level",
    failed: "Could not generate",
    note: "Everything runs in your browser. Margin is measured in modules — 2 to 4 is usually right.",
  },
};

type Kind = "text" | "url" | "wifi" | "vcard";

function normalizeUrl(value: string): string {
  const text = value.trim();
  if (!text) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return text;
  return `https://${text}`;
}

export function QrcodeTool() {
  const t = useCopy(COPY);
  const [kind, setKind] = React.useState<Kind>("url");
  const [text, setText] = React.useState("GongJu 在线工具箱");
  const [url, setUrl] = React.useState("https://www.google.com");
  const [wifi, setWifi] = React.useState({
    ssid: "",
    password: "",
    encryption: "WPA" as "WPA" | "WEP" | "nopass",
    hidden: false,
  });
  const [vcard, setVcard] = React.useState({ name: "", org: "", phone: "", email: "", url: "" });

  const [opts, setOpts] = React.useState<QrOptions>(DEFAULT_QR);
  const [logo, setLogo] = React.useState<{ url: string; img: HTMLImageElement } | null>(null);
  const [result, setResult] = React.useState<{ url: string; blob: Blob } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [working, setWorking] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const content =
    kind === "text"
      ? text
      : kind === "url"
        ? normalizeUrl(url)
        : kind === "wifi"
          ? buildWifi(wifi)
          : buildVCard(vcard);

  React.useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (!content.trim()) {
        setResult(null);
        setError(null);
        return;
      }
      setWorking(true);
      try {
        const canvas = await renderQr(content, opts, logo?.img);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (cancelled || !blob) return;
        setResult({ url: URL.createObjectURL(blob), blob });
        setError(null);
      } catch {
        if (!cancelled) {
          setResult(null);
          setError(t.tooLong);
        }
      } finally {
        if (!cancelled) setWorking(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [content, opts, logo, t.tooLong]);

  React.useEffect(() => {
    if (!result) return;
    const url = result.url;
    return () => URL.revokeObjectURL(url);
  }, [result]);

  React.useEffect(() => {
    if (!logo) return;
    const url = logo.url;
    return () => URL.revokeObjectURL(url);
  }, [logo]);

  const pickLogo = (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    img.onload = () => setLogo({ url, img });
  };

  const downloadSvg = async () => {
    const svg = await qrSvg(content, opts);
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "qrcode.svg");
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.kind}>
          <Segmented
            ariaLabel={t.kind}
            value={kind}
            onChange={setKind}
            options={[
              { value: "text", label: t.text },
              { value: "url", label: t.url },
              { value: "wifi", label: t.wifi },
              { value: "vcard", label: t.vcard },
            ]}
          />
        </OptionField>
      </OptionBar>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-10 items-center border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.content}
          </span>
        </header>
        <div className="flex flex-col gap-3 p-3">
          {kind === "text" && (
            <InputArea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.textPlaceholder}
              className="min-h-[90px]"
            />
          )}

          {kind === "url" && (
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t.urlPlaceholder}
              aria-label={t.url}
              size="sm"
            />
          )}

          {kind === "wifi" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-foreground-muted">
                {t.ssid}
                <Input
                  value={wifi.ssid}
                  onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })}
                  size="sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-foreground-muted">
                {t.password}
                <Input
                  value={wifi.password}
                  onChange={(e) => setWifi({ ...wifi, password: e.target.value })}
                  disabled={wifi.encryption === "nopass"}
                  size="sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-foreground-muted">
                {t.encryption}
                <Segmented
                  ariaLabel={t.encryption}
                  value={wifi.encryption}
                  onChange={(value) =>
                    setWifi({ ...wifi, encryption: value as "WPA" | "WEP" | "nopass" })
                  }
                  options={[
                    { value: "WPA", label: "WPA/WPA2" },
                    { value: "WEP", label: "WEP" },
                    { value: "nopass", label: t.none },
                  ]}
                />
              </label>
              <div className="flex items-end pb-1">
                <Toggle
                  checked={wifi.hidden}
                  onChange={(hidden) => setWifi({ ...wifi, hidden })}
                  label={t.hidden}
                />
              </div>
            </div>
          )}

          {kind === "vcard" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["name", t.name],
                  ["org", t.org],
                  ["phone", t.phone],
                  ["email", t.email],
                  ["url", t.website],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex flex-col gap-1 text-xs text-foreground-muted">
                  {label}
                  <Input
                    value={vcard[key]}
                    onChange={(e) => setVcard({ ...vcard, [key]: e.target.value })}
                    size="sm"
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <OptionBar>
        <OptionField label={t.size}>
          <input
            type="range"
            min={128}
            max={1024}
            step={32}
            value={opts.size}
            onChange={(e) => setOpts({ ...opts, size: Number(e.target.value) })}
            aria-label={t.size}
            className="w-28 accent-[var(--accent)]"
          />
          <span className="w-12 font-mono text-[11px] text-foreground-subtle">{opts.size}px</span>
        </OptionField>

        <OptionField label={t.margin}>
          <Input
            type="number"
            min={0}
            max={8}
            value={opts.margin}
            onChange={(e) =>
              setOpts({ ...opts, margin: Math.min(Math.max(Number(e.target.value) || 0, 0), 8) })
            }
            aria-label={t.margin}
            size="xs"
            className="w-14 text-center font-mono"
          />
        </OptionField>

        <OptionField label={t.level}>
          <Segmented
            ariaLabel={t.level}
            value={opts.level}
            onChange={(value) => setOpts({ ...opts, level: value as QrLevel })}
            options={[
              { value: "L", label: "L" },
              { value: "M", label: "M" },
              { value: "Q", label: "Q" },
              { value: "H", label: "H" },
            ]}
          />
        </OptionField>

        <OptionField label={t.colors}>
          <ColorField
            label={t.colors}
            value={opts.dark}
            onChange={(dark) => setOpts({ ...opts, dark })}
          />
          <ColorField
            label={`${t.colors} 2`}
            value={opts.light}
            onChange={(light) => setOpts({ ...opts, light })}
          />
        </OptionField>

        <OptionField label={t.logo}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              pickLogo(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="gap-1.5"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="h-3.5 w-3.5" />
            {t.uploadLogo}
          </Button>
          {logo && (
            <span className="flex items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo.url} alt="" className="h-6 w-6 rounded border border-border object-cover" />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t.removeLogo}
                onClick={() => setLogo(null)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </span>
          )}
        </OptionField>
      </OptionBar>

      {logo && opts.level !== "H" && (
        <p className="text-xs text-orange-fg">{t.logoHint}</p>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-border bg-surface p-4">
          {result ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={result.url}
              alt={t.preview}
              className="max-h-[360px] max-w-full rounded"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <p className="text-sm text-foreground-subtle">{t.empty}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.preview}
            </span>
            {working && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-foreground-subtle" />}
          </div>
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            disabled={!result}
            onClick={() => result && downloadBlob(result.blob, "qrcode.png")}
          >
            <Download className="h-4 w-4" />
            {t.downloadPng}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!content.trim()}
            onClick={downloadSvg}
          >
            <Download className="h-4 w-4" />
            {t.downloadSvg}
          </Button>
          <p className="mt-1 text-[11px] leading-relaxed text-foreground-subtle">{t.note}</p>
        </div>
      </div>
    </div>
  );
}
