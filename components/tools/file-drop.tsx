"use client";

import * as React from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopy } from "@/components/locale-provider";
import { readTextFile } from "@/lib/files";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    upload: "上传",
    drop: "松手载入文件",
    hint: "支持 .srt / .vtt / .ass / .ssa / .sbv / .lrc / .txt，也可以直接拖进来",
  },
  en: {
    upload: "Upload",
    drop: "Drop to load the file",
    hint: "Accepts .srt / .vtt / .ass / .ssa / .sbv / .lrc / .txt — or drag one in",
  },
};

/** Extensions shared by every subtitle tool */
export const SUBTITLE_ACCEPT = ".srt,.vtt,.ass,.ssa,.sbv,.lrc,.txt,text/plain";

/** Pane-header button that reads a text file straight into the editor */
export function UploadFileButton({
  onText,
  accept = SUBTITLE_ACCEPT,
  label,
}: {
  onText: (text: string, name: string) => void;
  accept?: string;
  label?: string;
}) {
  const t = useCopy(COPY);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [loading, setLoading] = React.useState(false);

  const load = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      onText(await readTextFile(file), file.name);
    } catch {
      // An unreadable file simply leaves the editor untouched
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          void load(event.target.files);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        title={t.hint}
        className="gap-1.5 text-foreground-muted"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        <span>{label ?? t.upload}</span>
      </Button>
    </>
  );
}

/**
 * Drag-and-drop target that wraps an editor pane. Dropping a file fills that
 * pane only, so a two-track tool (bilingual merge) can tell which side it hit.
 */
export function FileDrop({
  onText,
  children,
  className,
}: {
  onText: (text: string, name: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const t = useCopy(COPY);
  const [dragging, setDragging] = React.useState(false);
  // dragenter/dragleave fire for every nested element, so count the depth
  const depth = React.useRef(0);

  const load = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      onText(await readTextFile(file), file.name);
    } catch {
      // ignore unreadable files
    }
  };

  return (
    <div
      className={cn("relative", className)}
      onDragEnter={(event) => {
        event.preventDefault();
        depth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        depth.current = 0;
        setDragging(false);
        void load(event.dataTransfer.files);
      }}
    >
      {children}
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-accent bg-surface/90">
          <Upload className="h-5 w-5 text-foreground-muted" />
          <span className="text-xs font-medium text-foreground">{t.drop}</span>
        </div>
      )}
    </div>
  );
}
