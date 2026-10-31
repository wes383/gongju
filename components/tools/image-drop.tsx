"use client";

import * as React from "react";
import { ImagePlus, Loader2, Upload, X } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { decodeFile, formatBytes } from "@/lib/image";
import { cn, uid } from "@/lib/utils";

export interface LoadedImage {
  id: string;
  file: File;
  /** Object URL for previews; revoked when the image leaves the list */
  url: string;
  name: string;
  size: number;
  type: string;
  width: number;
  height: number;
}

export type ImageError = "not-image" | "too-large" | "load-failed" | "heic";

const COPY = {
  zh: {
    dropTitle: "拖入图片，或点击选择",
    dropHint: "图片只在本机处理，不会上传",
    add: "继续添加",
    remove: "移除",
    clearAll: "全部清除",
    total: (n: number, size: string) => `${n} 张 · 共 ${size}`,
    errors: {
      "not-image": "只支持图片文件",
      "too-large": "图片像素过大（超过 4000 万像素），请先缩小",
      "load-failed": "无法读取这张图片，可能已损坏",
      heic: "浏览器无法解码 HEIC / HEIF（iPhone 默认格式），请先转成 JPG 或 PNG；iPhone 可在「设置 → 相机 → 格式」里改成「兼容性最佳」",
    },
  },
  en: {
    dropTitle: "Drop images here, or click to pick",
    dropHint: "Processed on your device, never uploaded",
    add: "Add more",
    remove: "Remove",
    clearAll: "Clear all",
    total: (n: number, size: string) => `${n} image${n > 1 ? "s" : ""} · ${size}`,
    errors: {
      "not-image": "Only image files are supported",
      "too-large": "Image is too large (over 40 megapixels), please shrink it first",
      "load-failed": "Could not read this image, it may be corrupted",
      heic: "Browsers cannot decode HEIC / HEIF (the iPhone default). Convert it to JPG or PNG first — on iPhone: Settings → Camera → Formats → Most Compatible",
    },
  },
};

/** Keeps a list of decoded images and cleans up their object URLs. */
export function useImageFiles({ multiple = false, limit = 40 } = {}) {
  const [images, setImages] = React.useState<LoadedImage[]>([]);
  const [error, setError] = React.useState<ImageError | null>(null);
  const [loading, setLoading] = React.useState(false);
  const urls = React.useRef(new Set<string>());

  React.useEffect(() => {
    const live = new Set(images.map((i) => i.url));
    urls.current.forEach((url) => {
      if (!live.has(url)) {
        URL.revokeObjectURL(url);
        urls.current.delete(url);
      }
    });
  }, [images]);

  React.useEffect(() => {
    const owned = urls.current;
    return () => {
      owned.forEach((url) => URL.revokeObjectURL(url));
      owned.clear();
    };
  }, []);

  const add = React.useCallback(
    async (input: FileList | File[] | null) => {
      const files = input ? Array.from(input) : [];
      if (files.length === 0) return;
      setLoading(true);
      setError(null);
      const loaded: LoadedImage[] = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          setError("not-image");
          continue;
        }
        // Chrome / Edge / Firefox cannot decode HEIC at all, so calling it a
        // corrupted file would send people looking for the wrong problem
        if (
          file.type === "image/heic" ||
          file.type === "image/heif" ||
          /\.hei[cf]$/i.test(file.name)
        ) {
          setError("heic");
          continue;
        }
        try {
          const img = await decodeFile(file);
          const url = URL.createObjectURL(file);
          urls.current.add(url);
          loaded.push({
            id: uid("img"),
            file,
            url,
            name: file.name,
            size: file.size,
            type: file.type,
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        } catch (err) {
          setError((err as Error).message === "image-too-large" ? "too-large" : "load-failed");
        }
      }
      if (loaded.length > 0) {
        setImages((prev) => {
          if (!multiple) return loaded.slice(-1);
          const merged = [...prev, ...loaded];
          // Drop the oldest entries when the list overflows
          return merged.slice(Math.max(0, merged.length - limit));
        });
      }
      setLoading(false);
    },
    [limit, multiple]
  );

  const remove = React.useCallback((id: string) => {
    setImages((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = React.useCallback(() => setImages([]), []);

  return { images, add, remove, clear, error, loading };
}

function Checkerboard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-md", className)}
      style={{
        backgroundImage:
          "repeating-conic-gradient(var(--hover-bg-strong) 0% 25%, transparent 0% 50%)",
        backgroundSize: "14px 14px",
      }}
    >
      {children}
    </div>
  );
}

export function ImageDrop({
  images,
  onAdd,
  onRemove,
  onClear,
  error,
  loading,
  multiple = false,
  hint,
  className,
}: {
  images: LoadedImage[];
  onAdd: (files: FileList | File[] | null) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  error?: ImageError | null;
  loading?: boolean;
  multiple?: boolean;
  hint?: string;
  className?: string;
}) {
  const t = useCopy(COPY);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const open = () => inputRef.current?.click();

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    onAdd(event.dataTransfer.files);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "rounded-lg border border-dashed border-border-strong bg-surface transition-colors duration-base ease-out",
          dragging && "border-accent bg-hover-bg"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            onAdd(e.target.files);
            e.target.value = "";
          }}
        />

        {images.length === 0 ? (
          <button
            type="button"
            onClick={open}
            className="flex w-full flex-col items-center gap-2 px-6 py-12 text-center transition-colors duration-base ease-out hover:bg-hover-bg"
          >
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-foreground-subtle" />
            ) : (
              <Upload className="h-6 w-6 text-foreground-subtle" />
            )}
            <span className="text-sm font-medium text-foreground">{t.dropTitle}</span>
            <span className="text-xs text-foreground-subtle">{hint ?? t.dropHint}</span>
          </button>
        ) : (
          <div className="flex flex-col gap-3 p-3">
            <div className="flex flex-wrap gap-3">
              {images.map((image) => (
                <div key={image.id} className="group relative w-[104px]">
                  <Checkerboard className="border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={image.name}
                      className="h-[104px] w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => onRemove(image.id)}
                      aria-label={`${t.remove} ${image.name}`}
                      className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity duration-base ease-out hover:bg-black/80 group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Checkerboard>
                  <p className="mt-1 truncate text-[11px] text-foreground-muted" title={image.name}>
                    {image.name}
                  </p>
                  <p className="text-[10px] text-foreground-subtle">
                    {image.width}×{image.height} · {formatBytes(image.size)}
                  </p>
                </div>
              ))}

              {multiple && (
                <button
                  type="button"
                  onClick={open}
                  className="flex h-[104px] w-[104px] flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border-strong text-[11px] text-foreground-subtle transition-colors duration-base ease-out hover:border-accent hover:text-foreground"
                >
                  <ImagePlus className="h-4 w-4" />
                  {t.add}
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-foreground-subtle">
              <span>
                {t.total(
                  images.length,
                  formatBytes(images.reduce((sum, i) => sum + i.size, 0))
                )}
              </span>
              <button
                type="button"
                onClick={onClear}
                className="rounded px-1.5 py-0.5 transition-colors duration-base ease-out hover:bg-hover-bg hover:text-foreground"
              >
                {t.clearAll}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-fg">{t.errors[error]}</p>
      )}
    </div>
  );
}

/** Preview box with a checkerboard behind transparent images. */
export function ImagePreview({
  src,
  alt,
  className,
  height = "h-[360px]",
}: {
  src: string;
  alt: string;
  className?: string;
  /** Fixed height keeps the page from reflowing when the output ratio changes */
  height?: string;
}) {
  return (
    <Checkerboard className={cn("flex items-center justify-center", height, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
    </Checkerboard>
  );
}
