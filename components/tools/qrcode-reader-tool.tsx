"use client";

import * as React from "react";
import { Camera, CameraOff, Loader2 } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { ImageDrop, useImageFiles } from "@/components/tools/image-drop";
import { CopyButton, ErrorNote } from "@/components/tools/tool-ui";
import { decodeQrFromImage } from "@/lib/qr";

const COPY = {
  zh: {
    upload: "上传二维码图片",
    camera: "开启摄像头",
    stop: "关闭摄像头",
    scanning: "识别中…",
    result: "识别结果",
    empty: "还没有识别到内容",
    failed: "这张图片里没有找到可识别的二维码",
    cameraDenied: "无法访问摄像头，请检查浏览器权限（摄像头需要 https 或 localhost）",
    note: "图片识别完全在本地完成；摄像头画面只在浏览器内处理，不会上传。",
    hint: "对准二维码，识别到内容会自动停止扫描",
  },
  en: {
    upload: "Upload a QR image",
    camera: "Start camera",
    stop: "Stop camera",
    scanning: "Scanning…",
    result: "Result",
    empty: "Nothing decoded yet",
    failed: "No QR code found in this image",
    cameraDenied: "Cannot access the camera — check permissions (it needs https or localhost)",
    note: "Image decoding happens entirely on your device; camera frames never leave the browser.",
    hint: "Point the camera at a QR code — scanning stops once it decodes",
  },
};

export function QrcodeReaderTool() {
  const t = useCopy(COPY);
  const { images, add, remove, clear, error, loading } = useImageFiles();
  const image = images[0];

  const [decoded, setDecoded] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [scanning, setScanning] = React.useState(false);
  const [cameraError, setCameraError] = React.useState(false);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const rafRef = React.useRef<number | null>(null);

  const reset = () => {
    setDecoded(null);
    setFailed(false);
  };

  React.useEffect(() => {
    if (!image) return;
    let cancelled = false;
    const img = new Image();
    img.src = image.url;
    img.onload = async () => {
      const found = await decodeQrFromImage(img, img.naturalWidth, img.naturalHeight);
      if (cancelled) return;
      setDecoded(found?.data ?? null);
      setFailed(!found);
    };
    return () => {
      cancelled = true;
    };
  }, [image]);

  const stopCamera = React.useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  React.useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = async () => {
    setCameraError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setScanning(true);

      let last = 0;
      const tick = async (time: number) => {
        if (!streamRef.current) return;
        rafRef.current = requestAnimationFrame(tick);
        // Decoding every frame is wasteful; 5 fps is plenty for a static code
        if (time - last < 200) return;
        last = time;
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (!width || !height) return;
        const scale = Math.min(1, 720 / Math.max(width, height));
        const found = await decodeQrFromImage(
          video,
          Math.round(width * scale),
          Math.round(height * scale)
        );
        if (found) {
          setDecoded(found.data);
          setFailed(false);
          stopCamera();
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setCameraError(true);
      stopCamera();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <ImageDrop
        images={images}
        onAdd={add}
        onRemove={(id) => {
          remove(id);
          reset();
        }}
        onClear={() => {
          clear();
          reset();
        }}
        error={error}
        loading={loading}
        hint={t.upload}
      />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
        <Button
          type="button"
          variant={scanning ? "outline" : "default"}
          size="xs"
          className="gap-1.5"
          onClick={scanning ? stopCamera : startCamera}
        >
          {scanning ? <CameraOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
          {scanning ? t.stop : t.camera}
        </Button>
        <span className="text-[11px] text-foreground-subtle">
          {scanning ? t.hint : t.note}
        </span>
        {scanning && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-foreground-subtle" />}
      </div>

      {cameraError && <ErrorNote>{t.cameraDenied}</ErrorNote>}

      <div className={scanning ? "overflow-hidden rounded-lg border border-border bg-black" : "hidden"}>
        <video ref={videoRef} className="mx-auto max-h-[320px] w-full object-contain" playsInline muted />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-10 items-center gap-2 border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.result}
          </span>
          {decoded && <CopyButton value={decoded} size="xs" className="ml-auto" />}
        </header>
        <div className="p-3">
          {decoded ? (
            <p className="break-all font-mono text-sm text-foreground">{decoded}</p>
          ) : (
            <p className="py-6 text-center text-sm text-foreground-subtle">
              {failed ? t.failed : t.empty}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
