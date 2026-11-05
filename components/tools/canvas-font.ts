/**
 * Canvas text has no idea about the page's CSS font stack: `ctx.font` only
 * accepts a family list, so the next/font names have to be read off the
 * document. Both canvas tools share this to keep their output on-brand.
 *
 * The latin face is a parameter because the two tools want different ones: the
 * OG card uses the display face, while text-to-image sets body copy in Inter and
 * lets CJK fall through to Noto Sans SC.
 */
export function canvasFontFamily(
  element: HTMLElement,
  latinVar = "--font-plus-jakarta-sans"
): string {
  const style = getComputedStyle(element);
  const latin = style.getPropertyValue(latinVar).trim();
  const cjk = style.getPropertyValue("--font-noto-sans-sc").trim();
  return [latin, cjk, "system-ui", "sans-serif"].filter(Boolean).join(", ");
}

/**
 * The serif pair the watermark tool already draws with: Playfair for Latin,
 * Noto Serif SC for CJK. Same variables, so both tools stay in one type system.
 */
export function canvasSerifFamily(element: HTMLElement): string {
  const style = getComputedStyle(element);
  const latin = style.getPropertyValue("--font-playfair").trim();
  const cjk = style.getPropertyValue("--font-noto-serif-sc").trim();
  const stack = [latin, cjk].filter(Boolean).join(", ");
  const fallback = '"Songti SC", SimSun, "Noto Serif SC", serif';
  return stack ? `${stack}, ${fallback}` : fallback;
}
