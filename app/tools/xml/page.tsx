import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { XmlTool } from "@/components/tools/xml-tool";

const meta = getTool("xml")!;

export const metadata: Metadata = {
  title: meta.name,
  description: meta.description,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame tool={meta}>
      <XmlTool />
    </ToolFrame>
  );
}
