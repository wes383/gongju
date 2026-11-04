import { describe, expect, it } from "vitest";
import { PDFDocument, PDFName } from "pdf-lib";
import { clearPdfMetadata, detectMetadataKind } from "@/lib/metadata";
import { rectFromDrag, totalRects } from "@/lib/pdf-redact";

const asFile = (name: string, type: string): File => ({ name, type }) as File;

describe("detectMetadataKind", () => {
  it("recognises the formats the tool can rewrite", () => {
    expect(detectMetadataKind(asFile("photo.jpg", "image/jpeg"))).toBe("image");
    expect(detectMetadataKind(asFile("shot.PNG", ""))).toBe("image");
    expect(detectMetadataKind(asFile("scan.pdf", "application/pdf"))).toBe("pdf");
    expect(detectMetadataKind(asFile("report.docx", ""))).toBe("unsupported");
    expect(detectMetadataKind(asFile("clip.mp4", "video/mp4"))).toBe("unsupported");
  });
});

describe("clearPdfMetadata", () => {
  it("empties the info dictionary", async () => {
    const doc = await PDFDocument.create();
    doc.setTitle("Confidential");
    doc.setAuthor("Someone");
    doc.setSubject("Internal");
    doc.setKeywords(["secret"]);

    const removed = clearPdfMetadata(doc);

    expect(removed).toBeGreaterThanOrEqual(4);
    expect(doc.getTitle()).toBeUndefined();
    expect(doc.getAuthor()).toBeUndefined();
    expect(doc.getSubject()).toBeUndefined();
    expect(doc.getKeywords()).toBeUndefined();
  });

  it("detaches the XMP stream from the catalog", async () => {
    const doc = await PDFDocument.create();
    doc.catalog.set(PDFName.of("Metadata"), doc.context.obj({ Type: "Metadata" }));

    expect(doc.catalog.has(PDFName.of("Metadata"))).toBe(true);
    clearPdfMetadata(doc);
    expect(doc.catalog.has(PDFName.of("Metadata"))).toBe(false);
  });

  it("removes remaining entries it did not create", async () => {
    const doc = await PDFDocument.create();
    doc.setTitle("Keep me?");
    doc.setProducer("Some camera app");

    clearPdfMetadata(doc);
    expect(doc.getProducer()).toBeUndefined();
  });
});

describe("rectFromDrag", () => {
  it("normalises a drag in any direction", () => {
    const rect = rectFromDrag(0.6, 0.5, 0.2, 0.1)!;
    expect(rect.x).toBeCloseTo(0.2);
    expect(rect.y).toBeCloseTo(0.1);
    expect(rect.width).toBeCloseTo(0.4);
    expect(rect.height).toBeCloseTo(0.4);
  });

  it("clamps points outside the page", () => {
    expect(rectFromDrag(-0.2, -0.1, 1.4, 1.2)).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });

  it("ignores accidental clicks", () => {
    expect(rectFromDrag(0.5, 0.5, 0.501, 0.501)).toBeNull();
  });

  it("counts boxes across pages", () => {
    expect(totalRects([[], [{ x: 0, y: 0, width: 0.1, height: 0.1 }]])).toBe(1);
  });
});
