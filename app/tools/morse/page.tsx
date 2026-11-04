import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { MorseTool } from "@/components/tools/morse-tool";

const meta = getTool("morse")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/morse" },
};

export default function Page() {
  return (
    <ToolFrame slug="morse">
      <MorseTool />
    </ToolFrame>
  );
}
