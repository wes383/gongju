import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { UnicodeTool } from "@/components/tools/unicode-tool";

const meta = getTool("unicode")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/unicode" },
};

export default function Page() {
  return (
    <ToolFrame slug="unicode">
      <UnicodeTool />
    </ToolFrame>
  );
}
