import { describe, expect, it } from "vitest";
import {
  adjustGain,
  amplitudeToDb,
  audioDuration,
  concatAudio,
  dbToGain,
  downmixToMono,
  encodeWav,
  formatDuration,
  normalizeAudio,
  peakAmplitude,
  resampleAudio,
  sliceAudio,
  waveformPeaks,
  type PcmAudio,
} from "@/lib/audio";
import { gifFrameTimes, videoFrameLabel } from "@/lib/video";

function tone(seconds: number, sampleRate = 8000, amplitude = 0.5, channels = 1): PcmAudio {
  const length = Math.round(seconds * sampleRate);
  return {
    sampleRate,
    channels: Array.from({ length: channels }, () => {
      const data = new Float32Array(length);
      for (let i = 0; i < length; i += 1) data[i] = amplitude;
      return data;
    }),
  };
}

describe("audioDuration", () => {
  it("derives duration from length and sample rate", () => {
    expect(audioDuration(tone(2, 8000))).toBeCloseTo(2, 5);
    expect(audioDuration(tone(0))).toBe(0);
  });
});

describe("downmixToMono", () => {
  it("averages channels and keeps mono as-is", () => {
    const mono = tone(0.1);
    expect(downmixToMono(mono)).toBe(mono);

    const stereo = tone(0.1, 8000, 0.4, 2);
    const mixed = downmixToMono(stereo);
    expect(mixed.channels).toHaveLength(1);
    expect(mixed.channels[0][0]).toBeCloseTo(0.4, 5);
  });
});

describe("resampleAudio", () => {
  it("returns the same object when the rate is unchanged", () => {
    const audio = tone(0.5);
    expect(resampleAudio(audio, 8000)).toBe(audio);
  });

  it("scales the frame count to the new rate", () => {
    const resampled = resampleAudio(tone(1, 8000), 16000);
    expect(resampled.sampleRate).toBe(16000);
    expect(resampled.channels[0].length).toBe(16000);
  });

  it("rejects non-positive rates", () => {
    expect(() => resampleAudio(tone(0.1), 0)).toThrow();
  });
});

describe("sliceAudio", () => {
  it("cuts the requested range and applies edge fades", () => {
    const clip = sliceAudio(tone(1, 8000, 1), 0.25, 0.75);
    expect(audioDuration(clip)).toBeCloseTo(0.5, 5);
    expect(clip.channels[0][0]).toBe(0);
    expect(clip.channels[0][Math.floor(clip.channels[0].length / 2)]).toBeCloseTo(1, 5);
  });

  it("rejects an empty range", () => {
    expect(() => sliceAudio(tone(1), 0.5, 0.5)).toThrow();
  });
});

describe("concatAudio", () => {
  it("joins clips and inserts an optional gap", () => {
    const joined = concatAudio([tone(0.5, 8000), tone(0.5, 8000)], 0.25);
    expect(audioDuration(joined)).toBeCloseTo(1.25, 5);
  });

  it("resamples later clips to the first rate", () => {
    const joined = concatAudio([tone(0.5, 8000), tone(0.5, 16000)]);
    expect(joined.sampleRate).toBe(8000);
    expect(audioDuration(joined)).toBeCloseTo(1, 5);
  });

  it("throws when nothing is provided", () => {
    expect(() => concatAudio([])).toThrow();
  });
});

describe("gain helpers", () => {
  it("converts between amplitude and decibels", () => {
    expect(amplitudeToDb(1)).toBeCloseTo(0, 5);
    expect(amplitudeToDb(0.5)).toBeCloseTo(-6.0206, 3);
    expect(amplitudeToDb(0)).toBe(-Infinity);
    expect(dbToGain(0)).toBeCloseTo(1, 5);
    expect(dbToGain(-6.0206)).toBeCloseTo(0.5, 4);
  });

  it("measures the peak across channels", () => {
    expect(peakAmplitude(tone(0.1, 8000, 0.25))).toBeCloseTo(0.25, 5);
    expect(peakAmplitude(tone(0))).toBe(0);
  });

  it("clamps after applying gain", () => {
    const boosted = adjustGain(tone(0.1, 8000, 0.9), 6);
    expect(peakAmplitude(boosted)).toBeLessThanOrEqual(1);
    expect(peakAmplitude(boosted)).toBeCloseTo(0.999, 5);
  });

  it("normalizes the peak to the target level", () => {
    const result = normalizeAudio(tone(0.1, 8000, 0.5), -1);
    expect(result.gainDb).toBeCloseTo(amplitudeToDb(1) - 1 - amplitudeToDb(0.5), 4);
    expect(peakAmplitude(result.audio)).toBeCloseTo(dbToGain(-1), 4);
  });

  it("leaves silent audio untouched", () => {
    const result = normalizeAudio(tone(0.1, 8000, 0), -1);
    expect(result.gainDb).toBe(0);
    expect(peakAmplitude(result.audio)).toBe(0);
  });
});

describe("waveformPeaks", () => {
  it("returns the requested number of buckets", () => {
    const peaks = waveformPeaks(tone(1), 10);
    expect(peaks).toHaveLength(10);
    expect(peaks[0]).toBeCloseTo(0.5, 5);
  });

  it("handles empty audio", () => {
    const peaks = waveformPeaks(tone(0), 4);
    expect(peaks).toHaveLength(4);
    expect([...peaks].every((value) => value === 0)).toBe(true);
  });
});

describe("encodeWav", () => {
  it("writes a standard 16-bit PCM header", () => {
    const buffer = encodeWav(tone(0.1, 8000, 0.5, 2));
    const view = new DataView(buffer);
    const text = (offset: number, length: number) =>
      String.fromCharCode(...new Uint8Array(buffer, offset, length));

    expect(text(0, 4)).toBe("RIFF");
    expect(text(8, 4)).toBe("WAVE");
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(8000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(800 * 2 * 2);
  });

  it("rejects empty audio", () => {
    expect(() => encodeWav(tone(0))).toThrow();
  });
});

describe("formatDuration", () => {
  it("formats minutes, seconds and optional tenths", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(75)).toBe("1:15");
    expect(formatDuration(75.4, true)).toBe("1:15.4");
    expect(formatDuration(-1)).toBe("0:00");
    expect(formatDuration(Number.NaN)).toBe("0:00");
  });
});

describe("gifFrameTimes", () => {
  it("spaces frames evenly within the range", () => {
    const times = gifFrameTimes(1, 3, 2);
    expect(times).toHaveLength(4);
    expect(times[0]).toBeCloseTo(1, 5);
    expect(times[3]).toBeCloseTo(2.5, 5);
  });

  it("caps the frame count", () => {
    expect(gifFrameTimes(0, 60, 30, 10)).toHaveLength(10);
  });

  it("returns nothing for an empty range", () => {
    expect(gifFrameTimes(2, 2, 10)).toEqual([]);
    expect(gifFrameTimes(3, 1, 10)).toEqual([]);
  });

  it("labels timestamps like the audio formatter", () => {
    expect(videoFrameLabel(0)).toBe("0:00.0");
    expect(videoFrameLabel(65.25)).toBe("1:05.2");
  });
});
