import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { HttpHeaderTool } from "@/components/tools/http-header-tool";

const meta = getTool("http-header")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/http-header" },
};

export default function Page() {
  return (
    <ToolFrame slug="http-header">
      <HttpHeaderTool />
    </ToolFrame>
  );
}
