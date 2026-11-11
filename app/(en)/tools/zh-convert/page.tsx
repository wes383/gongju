import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ZhConvertTool } from "@/components/tools/zh-convert-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("zh-convert")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="zh-convert">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <ZhConvertTool />
    </ToolFrame>
  );
}
