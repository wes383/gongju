import { ImageResponse } from "next/og";

/** Latin-only artwork: the default OG font has no CJK glyphs */
export const alt = "GongJu — a browser-only toolbox for developers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
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
          <div
            style={{
              display: "flex",
              width: "44px",
              height: "44px",
              borderRadius: "14px",
              background: "#25242a",
            }}
          />
          <div style={{ display: "flex", fontSize: "30px", color: "#25242a" }}>GongJu</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              display: "flex",
              fontSize: "76px",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "#25242a",
            }}
          >
            Tools that run in your browser
          </div>
          <div style={{ display: "flex", fontSize: "30px", color: "#6d6770" }}>
            Encode, format, convert, encrypt — nothing ever leaves your device
          </div>
        </div>

        <div style={{ display: "flex", fontSize: "22px", color: "#9f99a3" }}>
          No upload · No account · No tracking
        </div>
      </div>
    ),
    size
  );
}
