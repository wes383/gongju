import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { BrailleTool } from "@/components/tools/braille-tool";

const meta = getTool("braille")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="braille">
      <BrailleTool />
    </ToolFrame>
  );
}
