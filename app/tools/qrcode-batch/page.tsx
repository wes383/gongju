import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { QrcodeBatchTool } from "@/components/tools/qrcode-batch-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("qrcode-batch")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="qrcode-batch">
      <JsonLd data={toolJsonLd(meta)} />
      <QrcodeBatchTool />
    </ToolFrame>
  );
}
