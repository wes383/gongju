import { describe, expect, it } from "vitest";
import { estimateTextWidth, placeLabels, type LabelRequest } from "@/lib/labels";

const BOUNDS = { left: 24, right: 616 };

function request(id: string, x: number, anchor: LabelRequest["anchor"], width: number): LabelRequest {
  return { id, x, anchor, width };
}

function overlaps(a: number, aw: number, b: number, bw: number, gap: number): boolean {
  return a + aw + gap > b && b + bw + gap > a;
}

describe("placeLabels", () => {
  it("leaves labels that already have room exactly where they are", () => {
    const placed = placeLabels(
      [
        request("near", 60, "start", 30),
        request("focus", 300, "middle", 20),
        request("far", 540, "end", 30),
      ],
      BOUNDS
    );
    expect(placed).toEqual([
      { id: "near", left: 60, row: 0 },
      { id: "focus", left: 290, row: 0 },
      { id: "far", left: 510, row: 0 },
    ]);
  });

  it("separates labels that would otherwise overlap", () => {
    const widths: Record<string, number> = { near: 33, focus: 17, far: 33 };
    const placed = placeLabels(
      [
        request("near", 464, "start", widths.near),
        request("focus", 499, "middle", widths.focus),
        request("far", 540, "end", widths.far),
      ],
      BOUNDS
    );
    for (let i = 1; i < placed.length; i += 1) {
      const left = placed[i - 1];
      const right = placed[i];
      expect(overlaps(left.left, widths[left.id], right.left, widths[right.id], 6)).toBe(false);
    }
  });

  it("keeps the cluster centred on its marks instead of piling up to one side", () => {
    const placed = placeLabels(
      [
        request("near", 464, "start", 33),
        request("focus", 499, "middle", 17),
        request("far", 540, "end", 33),
      ],
      BOUNDS
    );
    const before = (464 + 540) / 2;
    const after = (placed[0].left + placed[2].left + 33) / 2;
    expect(Math.abs(after - before)).toBeLessThan(4);
  });

  it("stays inside the bounds when a label sits on the edge", () => {
    const placed = placeLabels(
      [
        request("near", 10, "middle", 40),
        request("far", 630, "middle", 40),
      ],
      BOUNDS
    );
    expect(placed[0].left).toBe(24);
    expect(placed[1].left).toBe(616 - 40);
  });

  it("stacks labels on separate rows when they cannot fit side by side", () => {
    const placed = placeLabels(
      [
        request("near", 40, "start", 300),
        request("far", 60, "start", 300),
      ],
      BOUNDS
    );
    expect(placed.map((label) => label.row)).toEqual([0, 1]);
    expect(placed[0].left).toBe(40);
    expect(placed[1].left).toBe(60);
  });

  it("keeps the caller's order in the result", () => {
    const placed = placeLabels(
      [
        request("far", 540, "end", 30),
        request("near", 60, "start", 30),
      ],
      BOUNDS
    );
    expect(placed.map((label) => label.id)).toEqual(["far", "near"]);
  });

  it("groups a label that hugs its neighbour but leaves a distant one alone", () => {
    const placed = placeLabels(
      [
        request("near", 100, "start", 30),
        request("focus", 120, "middle", 20),
        request("far", 500, "end", 30),
      ],
      BOUNDS
    );
    expect(placed[0].row).toBe(0);
    expect(placed[1].row).toBe(0);
    expect(placed[2].left).toBe(470);
    expect(overlaps(placed[0].left, 30, placed[1].left, 20, 6)).toBe(false);
  });
});

describe("estimateTextWidth", () => {
  it("grows with the text and the font size", () => {
    expect(estimateTextWidth("2.78 m", 10)).toBeGreaterThan(estimateTextWidth("2.7 m", 10));
    expect(estimateTextWidth("3 m", 20)).toBeCloseTo(estimateTextWidth("3 m", 10) * 2, 10);
  });

  it("stays in the range a short number occupies", () => {
    expect(estimateTextWidth("2.78 m", 10)).toBeGreaterThan(24);
    expect(estimateTextWidth("2.78 m", 10)).toBeLessThan(48);
  });
});
