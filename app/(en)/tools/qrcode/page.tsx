import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { QrcodeTool } from "@/components/tools/qrcode-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("qrcode")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="qrcode">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <QrcodeTool />
    </ToolFrame>
  );
}
