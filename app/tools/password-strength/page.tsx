import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PasswordStrengthTool } from "@/components/tools/password-strength-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("password-strength")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="password-strength">
      <JsonLd data={toolJsonLd(meta)} />
      <PasswordStrengthTool />
    </ToolFrame>
  );
}
