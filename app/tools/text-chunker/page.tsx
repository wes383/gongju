import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { TextChunkerTool } from "@/components/tools/text-chunker-tool";

const meta = getTool("text-chunker")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/text-chunker" },
};

export default function Page() {
  return (
    <ToolFrame slug="text-chunker">
      <TextChunkerTool />
    </ToolFrame>
  );
}
