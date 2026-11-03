/**
 * Video helpers for the GIF exporter.
 *
 * Frames are decoded by the browser's native video pipeline and encoded with
 * gifenc. Nothing is uploaded and no FFmpeg download is required.
 */

import { codedError } from "./errors";
import { formatDuration } from "./audio";

export const MAX_GIF_FRAMES = 240;

export interface GifOptions {
  start: number;
  end: number;
  width: number;
  fps: number;
  maxFrames?: number;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

export interface VideoFrame {
  time: number;
}

/** Evenly spaced timestamps that stay strictly before the end marker. */
export function gifFrameTimes(
  start: number,
  end: number,
  fps: number,
  maxFrames = MAX_GIF_FRAMES
): number[] {
  const from = Math.max(0, start);
  const to = Math.max(from, end);
  const duration = to - from;
  const frameRate = Math.max(1, Math.min(30, fps));
  if (duration <= 0) return [];

  const wanted = Math.max(1, Math.ceil(duration * frameRate));
  const total = Math.min(wanted, Math.max(1, Math.floor(maxFrames)));
  const step = duration / total;
  return Array.from({ length: total }, (_, index) => from + index * step);
}

export function videoFrameLabel(time: number): string {
  return formatDuration(time, true);
}

function waitForFrame(video: HTMLVideoElement): Promise<void> {
  const callback = (
    video as HTMLVideoElement & {
      requestVideoFrameCallback?: (callback: () => void) => number;
    }
  ).requestVideoFrameCallback;
  if (callback) {
    return new Promise((resolve) => {
      callback.call(video, () => resolve());
    });
  }
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function waitForSeek(video: HTMLVideoElement, time: number): Promise<void> {
  if (Math.abs(video.currentTime - time) < 0.001) return waitForFrame(video);
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      window.clearTimeout(timer);
    };
    const onSeeked = () => {
      cleanup();
      void waitForFrame(video).then(resolve);
    };
    const onError = () => {
      cleanup();
      reject(codedError("video.decodeFailed"));
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(codedError("video.decodeFailed"));
    }, 5000);
    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.currentTime = time;
  });
}

async function openVideo(file: File): Promise<{ video: HTMLVideoElement; url: string }> {
  if (typeof document === "undefined") throw codedError("video.unsupported");
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        video.removeEventListener("loadeddata", onLoaded);
        video.removeEventListener("error", onError);
        window.clearTimeout(timer);
      };
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(codedError("video.decodeFailed"));
      };
      const timer = window.setTimeout(() => {
        cleanup();
        reject(codedError("video.decodeFailed"));
      }, 15000);
      video.addEventListener("loadeddata", onLoaded, { once: true });
      video.addEventListener("error", onError, { once: true });
    });

    if (!video.videoWidth || !video.videoHeight) throw codedError("video.decodeFailed");
    await waitForFrame(video);
    return { video, url };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

/** Render a time range of a video into an animated GIF. */
export async function createGifFromVideo(file: File, options: GifOptions): Promise<Blob> {
  const { video, url } = await openVideo(file);

  try {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const start = Math.max(0, Math.min(options.start, duration));
    const end = Math.max(start, Math.min(options.end, duration));
    const times = gifFrameTimes(start, end, options.fps, options.maxFrames ?? MAX_GIF_FRAMES);
    if (times.length === 0) throw codedError("video.emptyRange");

    const width = Math.max(64, Math.min(960, Math.round(options.width)));
    const height = Math.max(
      1,
      Math.round((width * video.videoHeight) / video.videoWidth)
    );
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw codedError("video.canvasUnavailable");

    const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
    const gif = GIFEncoder();
    const paletteFrame = times[Math.floor(times.length / 2)];
    await waitForSeek(video, paletteFrame);
    context.drawImage(video, 0, 0, width, height);
    const paletteData = context.getImageData(0, 0, width, height).data;
    const palette = quantize(paletteData, 256, { format: "rgb565" });
    const delay = Math.max(20, Math.round(1000 / Math.max(1, options.fps)));

    for (let index = 0; index < times.length; index += 1) {
      if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      await waitForSeek(video, times[index]);
      context.drawImage(video, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height).data;
      const indexed = applyPalette(pixels, palette, "rgb565");
      gif.writeFrame(indexed, width, height, {
        palette: index === 0 ? palette : undefined,
        delay,
        repeat: 0,
      });
      options.onProgress?.(index + 1, times.length);
      // Yield between frames so Cancel stays responsive on long exports.
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }

    gif.finish();
    const bytes = new Uint8Array(gif.bytes());
    return new Blob([bytes.buffer], { type: "image/gif" });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    if (error instanceof Error && "code" in error) throw error;
    throw codedError("video.encodeFailed");
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
