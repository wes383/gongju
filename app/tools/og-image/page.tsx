import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { OgImageTool } from "@/components/tools/og-image-tool";

const meta = getTool("og-image")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/og-image" },
};

export default function Page() {
  return (
    <ToolFrame slug="og-image">
      <OgImageTool />
    </ToolFrame>
  );
}
