import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { HexTool } from "@/components/tools/hex-tool";

const meta = getTool("hex")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/hex" },
};

export default function Page() {
  return (
    <ToolFrame slug="hex">
      <HexTool />
    </ToolFrame>
  );
}
