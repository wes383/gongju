import { SITE_ICON_DATA_URI } from "@/lib/site";

export const OG_SIZE = { width: 1200, height: 630 };

/** Latin-only artwork: the default OG font has no CJK glyphs, so callers pass English copy */
export function OgArtwork({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        background: "#fcfbfa",
        padding: "72px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- satori JSX, not DOM; next/image cannot render here */}
        <img src={SITE_ICON_DATA_URI} width={44} height={44} alt="" />
        <div style={{ display: "flex", fontSize: "30px", color: "#25242a" }}>GongJu</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div
          style={{
            display: "flex",
            fontSize: "64px",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: "#25242a",
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", fontSize: "28px", lineHeight: 1.4, color: "#6d6770" }}>
          {subtitle}
        </div>
      </div>

      <div style={{ display: "flex", fontSize: "22px", color: "#9f99a3" }}>
        No upload · No account · No tracking
      </div>
    </div>
  );
}