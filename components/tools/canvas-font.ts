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
 * A serif counterpart that ships with the OS rather than a webfont: loading a
 * CJK serif would cost megabytes, and the system faces (Songti on macOS, SimSun
 * on Windows, Noto Serif CJK elsewhere) already cover it. A `--font-noto-serif-sc`
 * variable is honoured first so a future webfont slots in without a code change.
 */
export function canvasSerifFamily(element: HTMLElement): string {
  const style = getComputedStyle(element);
  const cjk = style.getPropertyValue("--font-noto-serif-sc").trim();
  return [
    "Georgia",
    '"Times New Roman"',
    cjk,
    '"Songti SC"',
    "STSong",
    "SimSun",
    '"Noto Serif CJK SC"',
    "serif",
  ]
    .filter(Boolean)
    .join(", ");
}
