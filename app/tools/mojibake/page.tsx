import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { MojibakeTool } from "@/components/tools/mojibake-tool";

const meta = getTool("mojibake")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/mojibake" },
};

export default function Page() {
  return (
    <ToolFrame slug="mojibake">
      <MojibakeTool />
    </ToolFrame>
  );
}
