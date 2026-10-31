"use client";

import * as React from "react";
import { Download, FileArchive, Loader2 } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorField } from "@/components/tools/color-field";
import { InputArea, OptionBar, OptionField, Segmented } from "@/components/tools/tool-ui";
import { DEFAULT_QR, renderQr, type QrLevel, type QrOptions } from "@/lib/qr";
import { downloadBlob, downloadZip } from "@/lib/image";

const COPY = {
  zh: {
    input: "每行一条内容",
    placeholder: "https://example.com/1\nhttps://example.com/2",
    size: "尺寸",
    margin: "留白",
    level: "纠错",
    colors: "颜色",
    run: "批量生成",
    running: "生成中…",
    result: "结果",
    empty: "生成后在这里预览与下载",
    download: "下载",
    zip: "打包下载",
    count: (n: number) => `共 ${n} 条`,
    tooMany: "最多一次生成 100 个",
    failed: "部分内容过长，已跳过",
    note: "一行一个二维码，空行会被忽略；内容不会上传，全部在本地生成。",
  },
  en: {
    input: "One item per line",
    placeholder: "https://example.com/1\nhttps://example.com/2",
    size: "Size",
    margin: "Margin",
    level: "EC level",
    colors: "Colours",
    run: "Generate all",
    running: "Generating…",
    result: "Results",
    empty: "Generated codes show up here",
    download: "Download",
    zip: "Download zip",
    count: (n: number) => `${n} item${n === 1 ? "" : "s"}`,
    tooMany: "Up to 100 codes at a time",
    failed: "Some entries were too long and got skipped",
    note: "One QR per line, blank lines are ignored. Everything is generated locally.",
  },
};

interface Item {
  id: string;
  text: string;
  url: string;
  blob: Blob;
}

export function QrcodeBatchTool() {
  const t = useCopy(COPY);
  const [text, setText] = React.useState(
    "https://example.com/1\nhttps://example.com/2\nhttps://example.com/3"
  );
  const [opts, setOpts] = React.useState<QrOptions>({ ...DEFAULT_QR, size: 256 });
  const [items, setItems] = React.useState<Item[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [skipped, setSkipped] = React.useState(false);
  const urls = React.useRef<string[]>([]);

  React.useEffect(() => {
    const owned = urls.current;
    return () => {
      owned.forEach((url) => URL.revokeObjectURL(url));
      owned.length = 0;
    };
  }, []);

  const run = async () => {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 100);
    if (lines.length === 0) return;

    setBusy(true);
    setSkipped(false);
    const next: Item[] = [];
    let hadFailure = false;

    for (const line of lines) {
      try {
        const canvas = await renderQr(line, opts);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
        if (!blob) continue;
        const url = URL.createObjectURL(blob);
        urls.current.push(url);
        next.push({ id: `${line}-${next.length}`, text: line, url, blob });
      } catch {
        hadFailure = true;
      }
    }

    urls.current.splice(0, urls.current.length - next.length).forEach((url) => URL.revokeObjectURL(url));
    setItems(next);
    setSkipped(hadFailure);
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-10 items-center gap-2 border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.input}
          </span>
          <span className="ml-auto text-[11px] text-foreground-subtle">
            {t.count(text.split("\n").filter((line) => line.trim()).length)}
          </span>
        </header>
        <InputArea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.placeholder}
          className="min-h-[140px]"
          spellCheck={false}
        />
      </div>

      <OptionBar>
        <OptionField label={t.size}>
          <input
            type="range"
            min={128}
            max={512}
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

        <Button
          type="button"
          size="xs"
          className="ml-auto gap-1.5"
          onClick={run}
          disabled={busy || !text.trim()}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {busy ? t.running : t.run}
        </Button>
      </OptionBar>

      {skipped && <p className="text-xs text-orange-fg">{t.failed}</p>}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-10 items-center gap-2 border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.result}
          </span>
          {items.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="ml-auto gap-1.5"
              onClick={() =>
                downloadZip(
                  items.map((item, index) => ({
                    name: `qrcode-${index + 1}.png`,
                    blob: item.blob,
                  })),
                  "qrcodes.zip"
                )
              }
            >
              <FileArchive className="h-3.5 w-3.5" />
              {t.zip}
            </Button>
          )}
        </header>

        {items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-foreground-subtle">{t.empty}</p>
        ) : (
          <ul>
            {items.map((item, index) => (
              <li
                key={item.id}
                className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded border border-border"
                  style={{ imageRendering: "pixelated" }}
                />
                <span className="w-6 shrink-0 font-mono text-[11px] text-foreground-subtle">
                  {index + 1}
                </span>
                <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
                  {item.text}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="shrink-0 gap-1.5"
                  onClick={() => downloadBlob(item.blob, `qrcode-${index + 1}.png`)}
                >
                  <Download className="h-3.5 w-3.5" />
                  {t.download}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
