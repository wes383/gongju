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
    result: "识别结果",
    empty: "还没有识别到内容",
    failed: "这张图片里没有找到可识别的二维码",
    cameraDenied: "无法访问摄像头：",
    note: "图片识别完全在本地完成；摄像头画面只在浏览器内处理，不会上传。",
    aim: "把二维码放进取景框",
    slow: "还没识别到，试试让二维码占满取景框、保持清晰并避开反光",
  },
  en: {
    upload: "Upload a QR image",
    camera: "Start camera",
    stop: "Stop camera",
    result: "Result",
    empty: "Nothing decoded yet",
    failed: "No QR code found in this image",
    cameraDenied: "Cannot access the camera: ",
    note: "Image decoding happens entirely on your device; camera frames never leave the browser.",
    aim: "Place the QR code inside the frame",
    slow: "Nothing yet — fill the frame with the code, keep it sharp and avoid glare",
  },
};

export function QrcodeReaderTool() {
  const t = useCopy(COPY);
  const { images, add, remove, clear, error, loading } = useImageFiles();
  const image = images[0];

  const [decoded, setDecoded] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [scanning, setScanning] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [slowHint, setSlowHint] = React.useState(false);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const hintTimer = React.useRef<number | null>(null);

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
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    hintTimer.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  React.useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = async () => {
    setCameraError(null);
    setSlowHint(false);
    try {
      let stream: MediaStream;
      try {
        // "ideal" keeps this a soft constraint; some desktop drivers still
        // reject the environment hint, so fall back to any camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      // Show the element first: some browsers will not paint frames from a
      // display:none video, which leaves the canvas pass reading blanks
      setScanning(true);
      await video.play();
      hintTimer.current = window.setTimeout(() => setSlowHint(true), 6000);

      let last = 0;
      const tick = async (time: number) => {
        if (!streamRef.current) return;
        rafRef.current = requestAnimationFrame(tick);
        if (time - last < 150) return;
        last = time;

        const width = video.videoWidth;
        const height = video.videoHeight;
        if (!width || !height) return;

        // Decode at (near) native resolution — downscaling too far loses the
        // fine module edges that jsQR depends on
        const scale = Math.min(1, 1280 / Math.max(width, height));
        const dw = Math.round(width * scale);
        const dh = Math.round(height * scale);

        let found = await decodeQrFromImage(video, dw, dh);
        if (!found) {
          // Second pass: the middle 60%, which zooms in on small codes
          const cw = width * 0.6;
          const ch = height * 0.6;
          found = await decodeQrFromImage(video, dw, dh, {
            sx: (width - cw) / 2,
            sy: (height - ch) / 2,
            sw: cw,
            sh: ch,
          });
        }

        if (found) {
          setDecoded(found.data);
          setFailed(false);
          stopCamera();
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : String(err));
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
        <span className="text-[11px] text-foreground-subtle">{scanning ? t.aim : t.note}</span>
        {scanning && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-foreground-subtle" />}
      </div>

      {cameraError && <ErrorNote>{`${t.cameraDenied}${cameraError}`}</ErrorNote>}
      {scanning && slowHint && <p className="text-xs text-orange-fg">{t.slow}</p>}

      <div className={scanning ? "rounded-lg border border-border bg-black p-2" : "hidden"}>
        <div className="relative mx-auto w-fit">
          <video ref={videoRef} className="max-h-[340px] rounded" playsInline muted />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-[60%] w-[60%] max-w-[240px] rounded-md border-2 border-white/70">
              <span className="absolute -left-1 -top-1 h-4 w-4 border-l-2 border-t-2 border-white" />
              <span className="absolute -right-1 -top-1 h-4 w-4 border-r-2 border-t-2 border-white" />
              <span className="absolute -bottom-1 -left-1 h-4 w-4 border-b-2 border-l-2 border-white" />
              <span className="absolute -bottom-1 -right-1 h-4 w-4 border-b-2 border-r-2 border-white" />
            </div>
          </div>
        </div>
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
