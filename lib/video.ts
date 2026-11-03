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

function abortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
}

/**
 * Resolve once the element has decoded the frame at `time`.
 *
 * `seeked` already fires after the new frame is available, so drawing right
 * away is safe. `requestVideoFrameCallback` is not used here: it never fires
 * while a video is paused, which would stall the export.
 */
function waitForSeek(
  video: HTMLVideoElement,
  time: number,
  signal?: AbortSignal
): Promise<void> {
  if (signal?.aborted) return Promise.reject(abortError());
  if (Math.abs(video.currentTime - time) < 0.001) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      signal?.removeEventListener("abort", onAbort);
      window.clearTimeout(timer);
    };
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(codedError("video.decodeFailed"));
    };
    const onAbort = () => {
      cleanup();
      reject(abortError());
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(codedError("video.decodeFailed"));
    }, 5000);

    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    signal?.addEventListener("abort", onAbort, { once: true });
    video.currentTime = time;
  });
}

/**
 * Load a file into a video element that stays attached to the page while it
 * works. A detached element is decoded lazily and seeks several times slower
 * in Chrome, so the element is kept in the DOM (tiny and transparent).
 */
async function openVideo(
  file: File,
  signal?: AbortSignal
): Promise<{ video: HTMLVideoElement; url: string; detach: () => void }> {
  if (typeof document === "undefined") throw codedError("video.unsupported");
  if (signal?.aborted) throw abortError();

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  video.setAttribute("aria-hidden", "true");
  video.style.cssText =
    "position:fixed;left:0;top:0;width:2px;height:2px;opacity:0.01;pointer-events:none";
  document.body.appendChild(video);

  const detach = () => video.remove();

  try {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        video.removeEventListener("loadeddata", onLoaded);
        video.removeEventListener("error", onError);
        signal?.removeEventListener("abort", onAbort);
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
      const onAbort = () => {
        cleanup();
        reject(abortError());
      };
      const timer = window.setTimeout(() => {
        cleanup();
        reject(codedError("video.decodeFailed"));
      }, 15000);

      video.addEventListener("loadeddata", onLoaded, { once: true });
      video.addEventListener("error", onError, { once: true });
      signal?.addEventListener("abort", onAbort, { once: true });
    });

    if (!video.videoWidth || !video.videoHeight) throw codedError("video.decodeFailed");
    return { video, url, detach };
  } catch (error) {
    detach();
    URL.revokeObjectURL(url);
    throw error;
  }
}

/** Render a time range of a video into an animated GIF. */
export async function createGifFromVideo(file: File, options: GifOptions): Promise<Blob> {
  const { video, url, detach } = await openVideo(file, options.signal);

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
    // A GPU-backed canvas scales the video frame much faster than the
    // software canvas that `willReadFrequently` forces.
    const context = canvas.getContext("2d");
    if (!context) throw codedError("video.canvasUnavailable");

    const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
    const gif = GIFEncoder();
    const paletteFrame = times[Math.floor(times.length / 2)];
    await waitForSeek(video, paletteFrame, options.signal);
    context.drawImage(video, 0, 0, width, height);
    const paletteData = context.getImageData(0, 0, width, height).data;
    const palette = quantize(paletteData, 256, { format: "rgb565" });
    const delay = Math.max(20, Math.round(1000 / Math.max(1, options.fps)));

    for (let index = 0; index < times.length; index += 1) {
      if (options.signal?.aborted) throw abortError();
      await waitForSeek(video, times[index], options.signal);
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
    detach();
  }
}
