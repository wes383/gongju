import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { FileEncryptTool } from "@/components/tools/file-encrypt-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("file-encrypt")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="file-encrypt">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <FileEncryptTool />
    </ToolFrame>
  );
}
