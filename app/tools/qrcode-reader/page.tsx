import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { QrcodeReaderTool } from "@/components/tools/qrcode-reader-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("qrcode-reader")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="qrcode-reader">
      <JsonLd data={toolJsonLd(meta)} />
      <QrcodeReaderTool />
    </ToolFrame>
  );
}
