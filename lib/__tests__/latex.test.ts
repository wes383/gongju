import { describe, expect, it } from "vitest";
import { mathmlFrom, renderDocument, renderLatex, splitMath } from "@/lib/latex";
import { isCodedError } from "@/lib/errors";

describe("splitMath", () => {
  it("keeps prose without delimiters as one text segment", () => {
    expect(splitMath("plain text")).toEqual([{ kind: "text", value: "plain text" }]);
  });

  it("finds inline dollar formulas", () => {
    expect(splitMath("area $\\pi r^2$ here")).toEqual([
      { kind: "text", value: "area " },
      { kind: "inline", value: "\\pi r^2" },
      { kind: "text", value: " here" },
    ]);
  });

  it("treats double dollars as display math", () => {
    expect(splitMath("$$x = 1$$")).toEqual([{ kind: "display", value: "x = 1" }]);
  });

  it("understands the bracket delimiters", () => {
    expect(splitMath("\\(a+b\\)")).toEqual([{ kind: "inline", value: "a+b" }]);
    expect(splitMath("\\[a+b\\]")).toEqual([{ kind: "display", value: "a+b" }]);
  });

  it("unescapes a literal dollar sign", () => {
    expect(splitMath("costs \\$5")).toEqual([{ kind: "text", value: "costs $5" }]);
  });

  it("leaves an unterminated formula as text instead of throwing", () => {
    expect(splitMath("half $x + 1")).toEqual([{ kind: "text", value: "half $x + 1" }]);
  });

  it("handles several formulas in a row", () => {
    const segments = splitMath("$a$$b$");
    expect(segments.map((segment) => segment.kind)).toEqual(["inline", "inline"]);
    expect(segments.map((segment) => segment.value)).toEqual(["a", "b"]);
  });
});

describe("renderLatex", () => {
  it("produces KaTeX markup", async () => {
    const html = await renderLatex("\\frac{1}{2}");
    expect(html).toContain('class="katex"');
    expect(html).toContain("<math");
  });

  it("adds the display wrapper only for block formulas", async () => {
    expect(await renderLatex("x^2", { display: true })).toContain("katex-display");
    expect(await renderLatex("x^2")).not.toContain("katex-display");
  });

  it("accepts an empty string", async () => {
    await expect(renderLatex("")).resolves.toContain("katex");
  });

  it("turns a syntax error into a coded error", async () => {
    await expect(renderLatex("\\frac{1")).rejects.toThrow();
    try {
      await renderLatex("\\frac{1");
      expect.unreachable();
    } catch (error) {
      expect(isCodedError(error) && error.code).toBe("latex.parse");
    }
  });

  it("reports the offending command in the message", async () => {
    try {
      await renderLatex("\\nosuchcommand");
      expect.unreachable();
    } catch (error) {
      expect(isCodedError(error) && error.params[0]).toContain("nosuchcommand");
    }
  });
});

describe("renderDocument", () => {
  it("escapes prose and renders the formulas around it", async () => {
    const html = await renderDocument("<b>alpha</b> is $\\alpha$");
    expect(html).toContain("&lt;b&gt;");
    expect(html).not.toContain("<b>alpha</b>");
    expect(html).toContain('class="katex"');
  });

  it("keeps display formulas on their own", async () => {
    expect(await renderDocument("$$x$$")).toContain("katex-display");
  });
});

describe("mathmlFrom", () => {
  it("extracts the math subtree KaTeX embeds", async () => {
    const mathml = mathmlFrom(await renderLatex("a^2 + b^2"));
    expect(mathml.startsWith("<math")).toBe(true);
    expect(mathml.endsWith("</math>")).toBe(true);
  });

  it("returns an empty string when there is no markup", () => {
    expect(mathmlFrom("")).toBe("");
  });
});
