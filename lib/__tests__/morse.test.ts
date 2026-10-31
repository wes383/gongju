import { describe, expect, it } from "vitest";
import { decodeMorse, encodeMorse, morseChart, morseDuration } from "@/lib/morse";
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

describe("morseChart", () => {
  it("groups letters, digits and punctuation", () => {
    const chart = morseChart();
    expect(chart.letters).toHaveLength(26);
    expect(chart.digits).toHaveLength(10);
    expect(chart.letters[0]).toEqual({ char: "A", code: ".-" });
    expect(chart.punctuation.some((entry) => entry.char === "." && entry.code === ".-.-.-")).toBe(
      true
    );
  });

  it("matches what the encoder accepts", () => {
    const chart = morseChart();
    const all = [...chart.letters, ...chart.digits, ...chart.punctuation];
    // Every charted character must round-trip through the converter
    for (const entry of all) {
      expect(encodeMorse(entry.char).code).toBe(entry.code);
      expect(decodeMorse(entry.code).text).toBe(entry.char);
    }
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
    expect(rows[233].name).toBe("Latin small letter e with acute");
  });

  it("names the C1 controls and the Latin-1 symbols", () => {
    const rows = asciiEntries(true);
    expect(rows[150].name).toBe("SPA");
    expect(rows[150].control).toBe(true);
    expect(rows[160].name).toBe("No-break space");
    expect(rows[169].name).toBe("Copyright sign");
    expect(rows[215].name).toBe("Multiplication sign");
  });

  it("spells out the letters that do not decompose", () => {
    const rows = asciiEntries(true);
    expect(rows[223].name).toBe("Latin small letter sharp s");
    expect(rows[199].name).toBe("Latin capital letter C with cedilla");
    expect(rows[228].name).toBe("Latin small letter a with diaeresis");
    expect(rows[248].name).toBe("Latin small letter o with stroke");
  });

  it("names every code point in the Latin-1 block", () => {
    for (const row of asciiEntries(true).slice(128)) {
      expect(row.name).not.toBe("");
      expect(row.name).not.toBe("C1 control");
      expect(row.name).not.toBe("Latin-1 supplement");
      expect(row.zh).not.toBe("");
    }
  });

  it("formats HTML entities", () => {
    expect(htmlEntity(65)).toBe("&#65;");
  });
});
