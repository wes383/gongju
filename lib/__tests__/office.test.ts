import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { docxToHtml, docxToMarkdown, parseDocx } from "@/lib/docx";
import { cleanRows, formatSerialDate, parseXlsx, sheetToCsv } from "@/lib/xlsx";
import { parsePptx, pptxToMarkdown, slideCharCount } from "@/lib/pptx";
import { epubToHtml, epubToMarkdown, parseEpub } from "@/lib/epub";
import { openPackage, readRelations } from "@/lib/ooxml";

/** Build a package the way Office would: a ZIP of XML parts. */
function pack(parts: Record<string, string | Uint8Array>): Uint8Array<ArrayBuffer> {
  const entries: Record<string, Uint8Array> = {};
  for (const [name, value] of Object.entries(parts)) {
    entries[name] = typeof value === "string" ? strToU8(value) : value;
  }
  return zipSync(entries) as Uint8Array<ArrayBuffer>;
}

const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);

function docxFixture(): Uint8Array<ArrayBuffer> {
  return pack({
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Quarterly report</w:t></w:r></w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Revenue</w:t></w:r>
      <w:r><w:t xml:space="preserve"> grew 12% &amp; costs fell</w:t></w:r>
    </w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>First item</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Second item</w:t></w:r></w:p>
    <w:tbl>
      <w:tr><w:tc><w:p><w:r><w:t>Region</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Sales</w:t></w:r></w:p></w:tc></w:tr>
      <w:tr><w:tc><w:p><w:r><w:t>APAC</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>42</w:t></w:r></w:p></w:tc></w:tr>
    </w:tbl>
    <w:p><w:r><w:drawing><wp:inline><wp:docPr id="1" descr="Logo"/><a:graphic><a:blip r:embed="rId5"/></a:graphic></wp:inline></w:drawing></w:r></w:p>
  </w:body>
</w:document>`,
    "word/_rels/document.xml.rels": `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
</Relationships>`,
    "word/media/image1.png": PNG,
    "word/numbering.xml": `<?xml version="1.0" encoding="UTF-8"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl></w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`,
    "docProps/core.xml": `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Q3 review</dc:title></cp:coreProperties>`,
  });
}

describe("docx", () => {
  it("walks headings, runs, lists, tables and images", () => {
    const doc = parseDocx(docxFixture());
    expect(doc.title).toBe("Q3 review");
    expect(doc.images).toBe(1);

    const markdown = docxToMarkdown(doc);
    expect(markdown).toContain("# Quarterly report");
    expect(markdown).toContain("**Revenue** grew 12% & costs fell");
    expect(markdown).toContain("1. First item");
    expect(markdown).toContain("2. Second item");
    expect(markdown).toContain("| Region | Sales |");
    expect(markdown).toContain("| APAC | 42 |");
    expect(markdown).toContain("![Logo](data:image/png;base64,");
  });

  it("renders the same structure as html", () => {
    const doc = parseDocx(docxFixture());
    const html = docxToHtml(doc);
    expect(html).toContain("<h1>Quarterly report</h1>");
    expect(html).toContain("<strong>Revenue</strong>");
    expect(html).toContain("<ol>");
    expect(html).toContain("<th>Region</th>");
    expect(html).toContain('<img src="data:image/png;base64,');
  });

  it("rejects a package without a document part", () => {
    expect(() => parseDocx(pack({ "hello.txt": "hi" }))).toThrowError(/office\.invalid/);
  });
});

function xlsxFixture(): Uint8Array<ArrayBuffer> {
  return pack({
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Orders" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    "xl/sharedStrings.xml": `<?xml version="1.0" encoding="UTF-8"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <si><t>Customer</t></si>
  <si><t>Total</t></si>
  <si><r><t>Ada</t></r><r><t> Lovelace</t></r></si>
</sst>`,
    "xl/styles.xml": `<?xml version="1.0" encoding="UTF-8"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="14"/></cellXfs>
</styleSheet>`,
    "xl/worksheets/sheet1.xml": `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
    <row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>42.5</v></c></row>
    <row r="3"><c r="A3" s="1"><v>45292</v></c><c r="C3" t="inlineStr"><is><t>note</t></is></c></row>
    <row r="9"/>
  </sheetData>
</worksheet>`,
  });
}

describe("xlsx", () => {
  it("reads shared strings, numbers, gaps and dates", () => {
    const book = parseXlsx(xlsxFixture());
    expect(book.sheets).toHaveLength(1);
    expect(book.sheets[0].name).toBe("Orders");
    expect(book.sheets[0].rows).toEqual([
      ["Customer", "Total", ""],
      ["Ada Lovelace", "42.5", ""],
      ["2024-01-01", "", "note"],
    ]);
  });

  it("formats serial dates including the time fraction", () => {
    expect(formatSerialDate(45292)).toBe("2024-01-01");
    expect(formatSerialDate(45292.5)).toBe("2024-01-01 12:00");
  });

  it("quotes csv cells that need it", () => {
    expect(sheetToCsv([["a,b", 'say "hi"', "line\nbreak"]])).toBe(
      '"a,b","say ""hi""","line\nbreak"'
    );
    // Rows are separated by CRLF, cell content is left alone
    expect(sheetToCsv([["a"], ["b"]])).toBe("a\r\nb");
  });

  it("drops empty rows and optionally dedupes", () => {
    const rows = [
      ["a", "1"],
      ["", ""],
      ["a", "1"],
      ["b", "2"],
    ];
    expect(cleanRows(rows, { dedupe: true })).toEqual([
      ["a", "1"],
      ["b", "2"],
    ]);
  });
});

function pptxFixture(): Uint8Array<ArrayBuffer> {
  const slide = (text: string) => `<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree>
    <p:sp><p:txBody>
      <a:p><a:r><a:t>${text}</a:t></a:r></a:p>
      <a:p><a:r><a:t>Second line</a:t></a:r></a:p>
    </p:txBody></p:sp>
    <p:graphicFrame><a:tbl>
      <a:tr><a:tc><a:txBody><a:p><a:r><a:t>KPI</a:t></a:r></a:p></a:txBody></a:tc>
            <a:tc><a:txBody><a:p><a:r><a:t>99%</a:t></a:r></a:p></a:txBody></a:tc></a:tr>
    </a:tbl></p:graphicFrame>
  </p:spTree></p:cSld>
</p:sld>`;

  return pack({
    "ppt/presentation.xml": `<?xml version="1.0" encoding="UTF-8"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId3"/>
    <p:sldId id="257" r:id="rId2"/>
  </p:sldIdLst>
</p:presentation>`,
    "ppt/_rels/presentation.xml.rels": `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId2" Type="slide" Target="slides/slide1.xml"/>
  <Relationship Id="rId3" Type="slide" Target="slides/slide2.xml"/>
</Relationships>`,
    "ppt/slides/slide1.xml": slide("Agenda"),
    "ppt/slides/slide2.xml": slide("Opening"),
  });
}

describe("pptx", () => {
  it("follows the slide order from sldIdLst, not the file names", () => {
    const deck = parsePptx(pptxFixture());
    expect(deck.slides.map((slide) => slide.lines[0])).toEqual(["Opening", "Agenda"]);
    expect(deck.slides[0].lines).toEqual(["Opening", "Second line", "KPI | 99%"]);
  });

  it("renders an outline with one heading per slide", () => {
    const markdown = pptxToMarkdown(parsePptx(pptxFixture()));
    expect(markdown).toContain("## 1\n\nOpening");
    expect(markdown).toContain("## 2\n\nAgenda");
    expect(slideCharCount(parsePptx(pptxFixture()))).toBeGreaterThan(0);
  });
});

function epubFixture(): Uint8Array<ArrayBuffer> {
  return pack({
    mimetype: "application/epub+zip",
    "META-INF/container.xml": `<?xml version="1.0" encoding="UTF-8"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`,
    "OEBPS/content.opf": `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Deep Work Notes</dc:title>
    <dc:creator>Ada Lovelace</dc:creator>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="c1" href="text/ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="c2" href="text/ch2.xhtml" media-type="application/xhtml+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
  </manifest>
  <spine><itemref idref="c2"/><itemref idref="c1"/></spine>
</package>`,
    "OEBPS/text/ch1.xhtml": `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Chapter One</title></head>
<body><h1>Hello</h1><p>World &amp; friends.</p><p><img src="../images/cover.png" alt="cover"/></p></body></html>`,
    "OEBPS/text/ch2.xhtml": `<html><head><title>Chapter Two</title></head><body><p>Second chapter</p></body></html>`,
    "OEBPS/images/cover.png": PNG,
  });
}

describe("epub", () => {
  it("reads metadata and follows the spine order", () => {
    const book = parseEpub(epubFixture());
    expect(book.title).toBe("Deep Work Notes");
    expect(book.author).toBe("Ada Lovelace");
    expect(book.language).toBe("en");
    expect(book.chapters.map((chapter) => chapter.title)).toEqual([
      "Chapter Two",
      "Chapter One",
    ]);
  });

  it("converts chapters to markdown and inlines images", () => {
    const book = parseEpub(epubFixture());
    const chapter = book.chapters[1];
    expect(chapter.markdown).toContain("# Hello");
    expect(chapter.markdown).toContain("World & friends.");
    expect(chapter.markdown).toContain("data:image/png;base64,");

    const markdown = epubToMarkdown(book);
    expect(markdown.startsWith("# Deep Work Notes")).toBe(true);
    expect(markdown).toContain("_Ada Lovelace_");

    const html = epubToHtml(book);
    expect(html).toContain("<h1>Deep Work Notes</h1>");
    expect(html).toContain('lang="en"');
  });

  it("rejects a zip that is not an epub", () => {
    expect(() => parseEpub(pack({ "a.txt": "nope" }))).toThrowError(/office\.invalid/);
  });
});

describe("package helpers", () => {
  it("resolves relationship targets relative to the part", () => {
    const pkg = openPackage(docxFixture());
    const rels = readRelations(pkg, "word/document.xml");
    expect(rels.get("rId5")?.target).toBe("word/media/image1.png");
    expect(pkg.bytes("WORD/media/image1.png")).not.toBeNull();
  });
});
