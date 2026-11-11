import { ImageResponse } from "next/og";
import { SITE_ICON_DATA_URI } from "@/lib/site";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- satori JSX, not DOM; next/image cannot render here */}
      <img src={SITE_ICON_DATA_URI} width={64} height={64} alt="" />
    </div>,
    size
  );
}