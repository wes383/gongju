import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PasswordStrengthTool } from "@/components/tools/password-strength-tool";

const meta = getTool("password-strength")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="password-strength">
      <PasswordStrengthTool />
    </ToolFrame>
  );
}
