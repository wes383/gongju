import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { QrcodeTool } from "@/components/tools/qrcode-tool";

const meta = getTool("qrcode")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="qrcode">
      <QrcodeTool />
    </ToolFrame>
  );
}
