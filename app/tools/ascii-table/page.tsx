import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { AsciiTableTool } from "@/components/tools/ascii-table-tool";

const meta = getTool("ascii-table")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/ascii-table" },
};

export default function Page() {
  return (
    <ToolFrame slug="ascii-table">
      <AsciiTableTool />
    </ToolFrame>
  );
}
