import type { Metadata } from "next";
import { Noto_Serif_SC, Playfair_Display } from "next/font/google";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { TextToImageTool } from "@/components/tools/text-to-image-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

// Only the serif option draws with these, so they are loaded with this route
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

const meta = getTool("text-to-image")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <div className={`${playfair.variable} ${notoSerifSC.variable}`}>
      <ToolFrame slug="text-to-image">
        <JsonLd data={toolJsonLd(meta)} />
        <TextToImageTool />
      </ToolFrame>
    </div>
  );
}
