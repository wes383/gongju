import { ImageResponse } from "next/og";
import { SITE_ICON_DATA_URI } from "@/lib/site";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- satori JSX, not DOM; next/image cannot render here */}
      <img src={SITE_ICON_DATA_URI} width={180} height={180} alt="" />
    </div>,
    size
  );
}