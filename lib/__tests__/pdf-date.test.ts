import { PDFDict, PDFDocument, PDFName, PDFString } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { parsePdfDate } from "@/lib/pdf-date";
import { readPdfDate } from "@/lib/pdf";

describe("parsePdfDate", () => {
  it("reads a full stamp with a positive offset", () => {
    // 13:31:59 at +08:00 is 05:31:59 UTC
    expect(parsePdfDate("D:20140703133159+08'00'")?.toISOString()).toBe("2014-07-03T05:31:59.000Z");
  });

  it("reads a negative offset", () => {
    expect(parsePdfDate("D:20200101000000-05'00'")?.toISOString()).toBe("2020-01-01T05:00:00.000Z");
  });

  it("treats Z as UTC", () => {
    expect(parsePdfDate("D:20211224235959Z")?.toISOString()).toBe("2021-12-24T23:59:59.000Z");
  });

  it("strips parentheses some producers leave in the value", () => {
    expect(parsePdfDate("(D:20140703133159+08'00')")?.toISOString()).toBe(
      "2014-07-03T05:31:59.000Z"
    );
  });

  it("accepts a missing D: prefix and partial digits", () => {
    const date = parsePdfDate("20240301");
    expect(date?.getFullYear()).toBe(2024);
    expect(date?.getMonth()).toBe(2);
    expect(date?.getDate()).toBe(1);
    expect(date?.getHours()).toBe(0);
  });

  it("fills in defaults for the time part", () => {
    const date = parsePdfDate("D:2024");
    expect(date?.getFullYear()).toBe(2024);
    expect(date?.getMonth()).toBe(0);
    expect(date?.getDate()).toBe(1);
  });

  it("rejects values that are not dates", () => {
    expect(parsePdfDate("")).toBeNull();
    expect(parsePdfDate(undefined)).toBeNull();
    expect(parsePdfDate("hello")).toBeNull();
  });

  it("rejects out of range parts instead of rolling them over", () => {
    expect(parsePdfDate("D:20241301000000Z")).toBeNull();
    expect(parsePdfDate("D:20240101250000Z")).toBeNull();
  });
});

describe("readPdfDate", () => {
  it("reads the raw info entry that makes pdf-lib's own parser throw", async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    doc.setCreationDate(new Date(Date.UTC(2020, 0, 1)));

    const info = doc.context.lookup(doc.context.trailerInfo.Info);
    if (!(info instanceof PDFDict)) throw new Error("expected an info dictionary");
    info.set(PDFName.of("CreationDate"), PDFString.of("(D:20140703133159+08'00')"));

    expect(() => doc.getCreationDate()).toThrow();
    expect(readPdfDate(doc, "CreationDate")?.toISOString()).toBe("2014-07-03T05:31:59.000Z");
  });

  it("returns null when the document has no date", async () => {
    // create() stamps both dates unless metadata is left alone
    const doc = await PDFDocument.create({ updateMetadata: false });
    doc.addPage();
    expect(readPdfDate(doc, "ModDate")).toBeNull();
  });
});
