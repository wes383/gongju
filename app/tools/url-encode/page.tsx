import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { UrlEncodeTool } from "@/components/tools/url-encode-tool";

const meta = getTool("url-encode")!;

export const metadata: Metadata = {
  title: meta.name,
  description: meta.description,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame tool={meta}>
      <UrlEncodeTool />
    </ToolFrame>
  );
}
