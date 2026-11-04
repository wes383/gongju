import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { RandomStringTool } from "@/components/tools/random-string-tool";

const meta = getTool("random-string")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/random-string" },
};

export default function Page() {
  return (
    <ToolFrame slug="random-string">
      <RandomStringTool />
    </ToolFrame>
  );
}
