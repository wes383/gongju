"use client";

import * as React from "react";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ClearButton,
  InputArea,
  OptionBar,
  OptionField,
  SampleButton,
  Segmented,
} from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import {
  OG_DESCRIPTION_LIMIT,
  OG_HEIGHT,
  OG_THEMES,
  OG_TITLE_LIMIT,
  OG_WIDTH,
  cardText,
  descriptionFontSize,
  displayHost,
  ogTheme,
  titleFontSize,
  wrapLines,
  type OgTheme,
} from "@/lib/og-card";
import { downloadBlob } from "@/lib/files";

const COPY = {
  zh: {
    theme: "配色",
    title: "标题",
    description: "描述",
    site: "站点名",
    host: "域名",
    preview: "预览",
    download: "下载 PNG",
    sample: "示例",
    clear: "清空",
    size: "1200 × 630，微信、X、Slack、Discord 通用尺寸",
    hint: "标题会被自动折行，最多三行；超出的部分在卡片截断，不会被压缩成小字。",
    note: "卡片在浏览器里用 Canvas 绘制并直接下载，图片不会上传到任何服务器。生成的是 1200×630 的 PNG，可以直接设成 og:image / twitter:image。微信与部分客户端还会读取 og:title 与 og:description，记得和卡片上的文字保持一致。",
    sampleTitle: "把 159 个工具放进一个页面，全部在浏览器里跑",
    sampleDescription: "编码、转换、加密、PDF 与 Office 解析，数据不出本机。",
  },
  en: {
    theme: "Palette",
    title: "Title",
    description: "Description",
    site: "Site name",
    host: "Domain",
    preview: "Preview",
    download: "Download PNG",
    sample: "Sample",
    clear: "Clear",
    size: "1200 × 630, the size WeChat, X, Slack and Discord crop from",
    hint: "Long titles wrap onto a second and third line; anything past that is cut rather than shrunk.",
    note: "The card is drawn on a canvas in your browser and downloaded straight from there, so the image never reaches a server. Output is a 1200×630 PNG you can point og:image and twitter:image at. Most clients also read og:title and og:description, so keep them in sync with the card.",
    sampleTitle: "159 tools on one page, all running in the browser",
    sampleDescription: "Encoding, conversion, encryption, PDF and Office parsing without uploading a byte.",
  },
};

/** Read the next/font family list off the document so canvas text matches the page */
function fontFamily(element: HTMLElement): string {
  const style = getComputedStyle(element);
  const display = style.getPropertyValue("--font-plus-jakarta-sans").trim();
  const cjk = style.getPropertyValue("--font-noto-sans-sc").trim();
  return [display, cjk, "system-ui", "sans-serif"].filter(Boolean).join(", ");
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

interface CardInput {
  title: string;
  description: string;
  site: string;
  host: string;
  theme: OgTheme;
  font: string;
}

function drawCard(canvas: HTMLCanvasElement, input: CardInput) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const pad = 80;
  const width = OG_WIDTH;
  const height = OG_HEIGHT;
  const theme = input.theme;

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, theme.from);
  gradient.addColorStop(1, theme.to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Two soft discs keep the flat gradient from looking like a plain fill
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  ctx.arc(width - 90, 40, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.08;
  ctx.beginPath();
  ctx.arc(40, height - 40, 200, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const site = cardText(input.site, 40);
  const title = cardText(input.title, OG_TITLE_LIMIT);
  const description = cardText(input.description, OG_DESCRIPTION_LIMIT);
  const host = displayHost(input.host);

  // Site mark: an accent square plus the name
  if (site) {
    ctx.fillStyle = theme.accent;
    roundRect(ctx, pad, pad + 4, 34, 34, 9);
    ctx.fill();
    ctx.fillStyle = theme.title;
    ctx.font = `600 28px ${input.font}`;
    ctx.textBaseline = "middle";
    ctx.fillText(site, pad + 50, pad + 22);
  }

  const titleSize = titleFontSize(title);
  const titleLineHeight = Math.round(titleSize * 1.2);
  // The font must be set before measuring: wrapLines asks the canvas for the
  // width of each candidate line, and a stale font makes long CJK titles look
  // like they fit on one line, so they run off the card once drawn at full size.
  ctx.font = `700 ${titleSize}px ${input.font}`;
  const titleLines = wrapLines(title, width - pad * 2, 3, (value) =>
    ctx.measureText(value).width
  );

  const descSize = descriptionFontSize(description);
  const descLineHeight = Math.round(descSize * 1.45);
  ctx.font = `400 ${descSize}px ${input.font}`;
  const descLines = description
    ? wrapLines(description, width - pad * 2, 2, (value) => ctx.measureText(value).width)
    : [];

  const titleBlock = titleLines.length * titleLineHeight;
  const descBlock = descLines.length > 0 ? 34 + descLines.length * descLineHeight : 0;
  const footerSpace = host ? 110 : 0;
  const totalBlock = titleBlock + descBlock;
  const startY = Math.max(pad + 130, (height - footerSpace - totalBlock) / 2 + titleSize * 0.8);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = theme.title;
  ctx.font = `700 ${titleSize}px ${input.font}`;
  titleLines.forEach((line, index) => {
    ctx.fillText(line, pad, startY + index * titleLineHeight);
  });

  if (descLines.length > 0) {
    ctx.fillStyle = theme.body;
    ctx.font = `400 ${descSize}px ${input.font}`;
    const descTop = startY + titleBlock + 20;
    descLines.forEach((line, index) => {
      ctx.fillText(line, pad, descTop + index * descLineHeight);
    });
  }

  if (host) {
    const ruleY = height - pad - 46;
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = theme.body;
    ctx.fillRect(pad, ruleY, width - pad * 2, 1);
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.body;
    ctx.font = `500 26px ${input.font}`;
    ctx.fillText(host, pad, height - pad);
    ctx.fillStyle = theme.accent;
    roundRect(ctx, width - pad - 6, height - pad - 22, 6, 26, 3);
    ctx.fill();
  }
}

export function OgImageTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [title, setTitle] = React.useState(t.sampleTitle);
  const [description, setDescription] = React.useState(t.sampleDescription);
  const [site, setSite] = React.useState("GongJu");
  const [host, setHost] = React.useState("gongju.wesluma.com");
  const [themeId, setThemeId] = React.useState<OgTheme["id"]>("light");

  const theme = ogTheme(themeId);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const paint = () => {
      if (cancelled) return;
      drawCard(canvas, { title, description, site, host, theme, font: fontFamily(document.body) });
    };
    // Wait for the webfonts so the preview and the export use the same metrics
    void document.fonts?.ready.then(paint);
    paint();
    return () => {
      cancelled = true;
    };
  }, [title, description, site, host, theme]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `og-${locale}.png`);
    }, "image/png");
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.theme}>
          <Segmented
            ariaLabel={t.theme}
            value={themeId}
            onChange={setThemeId}
            options={OG_THEMES.map((item) => ({ value: item.id, label: item.label[locale] }))}
          />
        </OptionField>
        <span className="ml-auto text-[11px] text-foreground-subtle">{t.size}</span>
      </OptionBar>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between text-[11px] text-foreground-muted">
              {t.title}
              <span className="font-mono text-foreground-faint">
                {title.length}/{OG_TITLE_LIMIT}
              </span>
            </span>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              aria-label={t.title}
              spellCheck={false}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between text-[11px] text-foreground-muted">
              {t.description}
              <span className="font-mono text-foreground-faint">
                {description.length}/{OG_DESCRIPTION_LIMIT}
              </span>
            </span>
            <InputArea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              aria-label={t.description}
              className="min-h-[92px] text-[13px]"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] text-foreground-muted">{t.site}</span>
              <Input value={site} onChange={(event) => setSite(event.target.value)} size="xs" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] text-foreground-muted">{t.host}</span>
              <Input value={host} onChange={(event) => setHost(event.target.value)} size="xs" />
            </label>
          </div>

          <div className="flex items-center gap-1">
            <SampleButton
              onClick={() => {
                setTitle(t.sampleTitle);
                setDescription(t.sampleDescription);
              }}
              label={t.sample}
            />
            <ClearButton
              onClick={() => {
                setTitle("");
                setDescription("");
              }}
              label={t.clear}
            />
          </div>
          <p className="text-[11px] leading-relaxed text-foreground-subtle">{t.hint}</p>
        </section>

        <section className="flex min-w-0 flex-col gap-3">
          <div className="overflow-hidden rounded-lg border border-border bg-surface p-3">
            <canvas
              ref={canvasRef}
              width={OG_WIDTH}
              height={OG_HEIGHT}
              className="block w-full rounded-md"
              aria-label={t.preview}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" className="gap-1.5" onClick={download}>
              <Download className="h-4 w-4" />
              {t.download}
            </Button>
            <span className="font-mono text-[11px] text-foreground-faint">
              {OG_WIDTH} × {OG_HEIGHT}
            </span>
          </div>
        </section>
      </div>

      <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-foreground-subtle">
        <Share2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t.note}
      </p>
    </div>
  );
}
