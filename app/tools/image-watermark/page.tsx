import type { Metadata } from "next";
import { Noto_Serif_SC, Playfair_Display } from "next/font/google";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ImageWatermarkTool } from "@/components/tools/image-watermark-tool";

// Only the watermark tool draws with these, so they are loaded with this route
// instead of the root layout. Latin first, CJK glyphs as the fallback.
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const notoSerifSC = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-serif-sc",
  display: "swap",
  // CJK files are megabytes: never block the first paint on them
  preload: false,
});

const meta = getTool("image-watermark")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <div className={`${playfair.variable} ${notoSerifSC.variable}`}>
      <ToolFrame slug="image-watermark">
        <ImageWatermarkTool />
      </ToolFrame>
    </div>
  );
}
