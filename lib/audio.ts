/**
 * Audio helpers shared by the audio and video tools.
 *
 * Decoding uses the browser's Web Audio implementation; editing operations
 * work on plain Float32 sample arrays so they stay testable in Node. Export is
 * PCM WAV, which every browser can write without a codec dependency.
 */

import { codedError } from "./errors";

export interface PcmAudio {
  sampleRate: number;
  channels: Float32Array[];
}

export interface GainResult {
  audio: PcmAudio;
  gainDb: number;
  peakDb: number;
}

let sharedContext: AudioContext | null = null;

/** Lazily create one AudioContext for every decoder in the session. */
export function getAudioContext(): AudioContext {
  if (typeof window === "undefined") throw codedError("audio.unsupported");
  if (sharedContext) return sharedContext;

  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) throw codedError("audio.unsupported");

  sharedContext = new Ctor();
  return sharedContext;
}

/**
 * Decode the first audio track of an audio or video file.
 *
 * decodeAudioData resamples to the context rate, so sources at different rates
 * can be merged without a second resampling pass.
 */
export async function decodeAudioFile(file: File | Blob): Promise<PcmAudio> {
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength === 0) throw codedError("audio.empty");

  try {
    const buffer = await getAudioContext().decodeAudioData(bytes);
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) =>
      buffer.getChannelData(index).slice()
    );
    if (channels.length === 0 || channels[0].length === 0) {
      throw codedError("audio.empty");
    }
    return { sampleRate: buffer.sampleRate, channels };
  } catch (error) {
    if (error instanceof Error && "code" in error) throw error;
    throw codedError("audio.decodeFailed");
  }
}

export function audioDuration(audio: PcmAudio): number {
  return audio.channels[0]?.length / audio.sampleRate || 0;
}

export function downmixToMono(audio: PcmAudio): PcmAudio {
  if (audio.channels.length === 1) return audio;
  const length = audio.channels[0].length;
  const mono = new Float32Array(length);
  for (const channel of audio.channels) {
    for (let i = 0; i < length; i += 1) mono[i] += channel[i];
  }
  const scale = 1 / audio.channels.length;
  for (let i = 0; i < length; i += 1) mono[i] *= scale;
  return { sampleRate: audio.sampleRate, channels: [mono] };
}

export function resampleAudio(audio: PcmAudio, sampleRate: number): PcmAudio {
  if (sampleRate === audio.sampleRate) return audio;
  if (sampleRate <= 0) throw codedError("audio.empty");

  const ratio = sampleRate / audio.sampleRate;
  const length = Math.max(1, Math.round(audio.channels[0].length * ratio));
  const channels = audio.channels.map((source) => {
    const target = new Float32Array(length);
    for (let i = 0; i < length; i += 1) {
      const position = i / ratio;
      const low = Math.floor(position);
      const high = Math.min(low + 1, source.length - 1);
      const fraction = position - low;
      target[i] = source[low] * (1 - fraction) + source[high] * fraction;
    }
    return target;
  });

  return { sampleRate, channels };
}

/** Trim to a time range and apply short fades so cut edges do not click. */
export function sliceAudio(
  audio: PcmAudio,
  startSeconds: number,
  endSeconds: number,
  fadeSeconds = 0.015
): PcmAudio {
  const duration = audioDuration(audio);
  const start = Math.max(0, Math.min(startSeconds, duration));
  const end = Math.max(start, Math.min(endSeconds, duration));
  const startSample = Math.round(start * audio.sampleRate);
  const endSample = Math.min(audio.channels[0].length, Math.round(end * audio.sampleRate));

  if (endSample <= startSample) throw codedError("audio.empty");

  const fade = Math.min(
    Math.max(0, Math.round(fadeSeconds * audio.sampleRate)),
    Math.floor((endSample - startSample) / 2)
  );

  const channels = audio.channels.map((source) => {
    const target = source.slice(startSample, endSample);
    for (let i = 0; i < fade; i += 1) {
      const gain = i / fade;
      target[i] *= gain;
      target[target.length - 1 - i] *= gain;
    }
    return target;
  });

  return { sampleRate: audio.sampleRate, channels };
}

/** Join clips in order, optionally inserting silence between them. */
export function concatAudio(parts: PcmAudio[], gapSeconds = 0): PcmAudio {
  const clips = parts.filter((part) => part.channels.length > 0 && part.channels[0].length > 0);
  if (clips.length === 0) throw codedError("audio.empty");

  const sampleRate = clips[0].sampleRate;
  const resampled = clips.map((clip) => resampleAudio(clip, sampleRate));
  const channelCount = Math.min(
    8,
    Math.max(...resampled.map((clip) => clip.channels.length))
  );
  const gapSamples = Math.max(0, Math.round(gapSeconds * sampleRate));
  const length = resampled.reduce((sum, clip) => sum + clip.channels[0].length, 0);
  const total = length + gapSamples * Math.max(0, resampled.length - 1);

  const channels = Array.from(
    { length: channelCount },
    () => new Float32Array(total)
  );

  let offset = 0;
  resampled.forEach((clip, clipIndex) => {
    const clipLength = clip.channels[0].length;
    for (let channel = 0; channel < channelCount; channel += 1) {
      const source = clip.channels[Math.min(channel, clip.channels.length - 1)];
      channels[channel].set(source, offset);
    }
    offset += clipLength;
    if (clipIndex < resampled.length - 1) offset += gapSamples;
  });

  return { sampleRate, channels };
}

export function peakAmplitude(audio: PcmAudio): number {
  let peak = 0;
  for (const channel of audio.channels) {
    for (let i = 0; i < channel.length; i += 1) {
      const value = Math.abs(channel[i]);
      if (value > peak) peak = value;
    }
  }
  return peak;
}

export function amplitudeToDb(amplitude: number): number {
  return amplitude > 0 ? 20 * Math.log10(amplitude) : -Infinity;
}

/** Root-mean-square level across every channel (linear, 0..1). */
export function rmsAmplitude(audio: PcmAudio): number {
  let total = 0;
  let count = 0;
  for (const channel of audio.channels) {
    for (let i = 0; i < channel.length; i += 1) total += channel[i] * channel[i];
    count += channel.length;
  }
  return count > 0 ? Math.sqrt(total / count) : 0;
}

export function dbToGain(db: number): number {
  return 10 ** (db / 20);
}

function clampAudio(audio: PcmAudio, ceiling = 1): PcmAudio {
  return {
    sampleRate: audio.sampleRate,
    channels: audio.channels.map((channel) => {
      const target = new Float32Array(channel.length);
      for (let i = 0; i < channel.length; i += 1) {
        target[i] = Math.max(-ceiling, Math.min(ceiling, channel[i]));
      }
      return target;
    }),
  };
}

export function adjustGain(audio: PcmAudio, gainDb: number, ceiling = 0.999): PcmAudio {
  const gain = dbToGain(gainDb);
  const gained: PcmAudio = {
    sampleRate: audio.sampleRate,
    channels: audio.channels.map((channel) => {
      const target = new Float32Array(channel.length);
      for (let i = 0; i < channel.length; i += 1) target[i] = channel[i] * gain;
      return target;
    }),
  };
  return clampAudio(gained, ceiling);
}

/** Raise or lower the loudest peak to `targetDb` (default -1 dBFS). */
export function normalizeAudio(audio: PcmAudio, targetDb = -1): GainResult {
  const peak = peakAmplitude(audio);
  const peakDb = amplitudeToDb(peak);
  if (peak === 0) return { audio, gainDb: 0, peakDb };

  const gainDb = targetDb - peakDb;
  return { audio: adjustGain(audio, gainDb), gainDb, peakDb };
}

/** Per-bucket peak values for drawing a waveform. */
export function waveformPeaks(audio: PcmAudio, buckets: number): Float32Array {
  const length = audio.channels[0]?.length ?? 0;
  const count = Math.max(1, Math.floor(buckets));
  const peaks = new Float32Array(count);
  if (length === 0) return peaks;

  for (let bucket = 0; bucket < count; bucket += 1) {
    const from = Math.floor((bucket / count) * length);
    const to = Math.max(from + 1, Math.floor(((bucket + 1) / count) * length));
    let peak = 0;
    for (const channel of audio.channels) {
      for (let i = from; i < to && i < channel.length; i += 1) {
        const value = Math.abs(channel[i]);
        if (value > peak) peak = value;
      }
    }
    peaks[bucket] = Math.min(1, peak);
  }
  return peaks;
}

/** Encode interleaved 16-bit PCM with a standard 44-byte WAV header. */
export function encodeWav(audio: PcmAudio): ArrayBuffer {
  const channels = Math.max(1, Math.min(8, audio.channels.length));
  const frames = audio.channels[0]?.length ?? 0;
  if (frames === 0) throw codedError("audio.empty");

  const blockAlign = channels * 2;
  const dataSize = frames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, audio.sampleRate, true);
  view.setUint32(28, audio.sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = audio.channels[Math.min(channel, audio.channels.length - 1)][frame] ?? 0;
      const clamped = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
      offset += 2;
    }
  }

  return buffer;
}

export function wavBlob(audio: PcmAudio): Blob {
  return new Blob([encodeWav(audio)], { type: "audio/wav" });
}

export function formatDuration(seconds: number, withTenths = false): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  const base = `${minutes}:${String(rest).padStart(2, "0")}`;
  if (!withTenths) return base;
  return `${base}.${Math.floor((seconds - whole) * 10)}`;
}
