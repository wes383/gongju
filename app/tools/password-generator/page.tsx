import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PasswordGeneratorTool } from "@/components/tools/password-generator-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("password-generator")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="password-generator">
      <JsonLd data={toolJsonLd(meta)} />
      <PasswordGeneratorTool />
    </ToolFrame>
  );
}
