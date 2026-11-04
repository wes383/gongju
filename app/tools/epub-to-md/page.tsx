import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { EpubToMdTool } from "@/components/tools/epub-to-md-tool";

const meta = getTool("epub-to-md")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/epub-to-md" },
};

export default function Page() {
  return (
    <ToolFrame slug="epub-to-md">
      <EpubToMdTool />
    </ToolFrame>
  );
}
