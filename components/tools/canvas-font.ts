/**
 * Canvas text has no idea about the page's CSS font stack: `ctx.font` only
 * accepts a family list, so the next/font names have to be read off the
 * document. Both canvas tools share this to keep their output on-brand.
 */
export function canvasFontFamily(element: HTMLElement): string {
  const style = getComputedStyle(element);
  const display = style.getPropertyValue("--font-plus-jakarta-sans").trim();
  const cjk = style.getPropertyValue("--font-noto-sans-sc").trim();
  return [display, cjk, "system-ui", "sans-serif"].filter(Boolean).join(", ");
}
