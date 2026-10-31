import { describe, expect, it } from "vitest";
import { decodeMorse, encodeMorse, morseDuration } from "@/lib/morse";
import { asciiEntries, htmlEntity } from "@/lib/ascii";

describe("encodeMorse", () => {
  it("encodes letters and separates words with a slash", () => {
    expect(encodeMorse("SOS").code).toBe("... --- ...");
    expect(encodeMorse("HI ALL").code).toBe(".... .. / .- .-.. .-..");
  });

  it("upper-cases the input", () => {
    expect(encodeMorse("sos").code).toBe("... --- ...");
  });

  it("handles digits and punctuation", () => {
    expect(encodeMorse("2?").code).toBe("..--- ..--..");
  });

  it("reports characters it cannot encode", () => {
    const result = encodeMorse("hi ✈");
    expect(result.unsupported).toEqual(["✈"]);
    expect(result.code).toBe(".... ..");
  });

  it("keeps line breaks between paragraphs", () => {
    expect(encodeMorse("AB\nCD").code).toBe(".- -...\n-.-. -..");
  });
});

describe("decodeMorse", () => {
  it("decodes back to text", () => {
    expect(decodeMorse("... --- ...").text).toBe("SOS");
    expect(decodeMorse(".... .. / .- .-.. .-..").text).toBe("HI ALL");
  });

  it("round-trips a sentence", () => {
    const source = "HELLO WORLD 42";
    expect(decodeMorse(encodeMorse(source).code).text).toBe(source);
  });

  it("reports unrecognised code", () => {
    expect(decodeMorse("... ..--.-...").unsupported).toEqual(["..--.-..."]);
  });

  it("splits words on a bare slash without surrounding spaces", () => {
    expect(decodeMorse("..../.-").text).toBe("H A");
  });
});

describe("morseDuration", () => {
  it("grows with the amount of signal", () => {
    expect(morseDuration(".", 12)).toBeCloseTo(0.1, 5);
    expect(morseDuration("... --- ...", 12)).toBeGreaterThan(1.5);
  });
});

describe("asciiEntries", () => {
  it("covers 0–127 by default", () => {
    const rows = asciiEntries();
    expect(rows).toHaveLength(128);
    expect(rows[65].char).toBe("A");
    expect(rows[97].char).toBe("a");
  });

  it("marks control characters and gives them no glyph", () => {
    const rows = asciiEntries();
    expect(rows[0].control).toBe(true);
    expect(rows[0].char).toBe("");
    expect(rows[10].name).toBe("LF");
    expect(rows[127].name).toBe("DEL");
  });

  it("extends to Latin-1 on request", () => {
    const rows = asciiEntries(true);
    expect(rows).toHaveLength(256);
    expect(rows[233].char).toBe("é");
    expect(rows[150].name).toBe("C1 control");
  });

  it("formats HTML entities", () => {
    expect(htmlEntity(65)).toBe("&#65;");
  });
});
