import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PasswordGeneratorTool } from "@/components/tools/password-generator-tool";

const meta = getTool("password-generator")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/password-generator" },
};

export default function Page() {
  return (
    <ToolFrame slug="password-generator">
      <PasswordGeneratorTool />
    </ToolFrame>
  );
}
