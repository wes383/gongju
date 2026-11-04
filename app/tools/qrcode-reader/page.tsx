import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { QrcodeReaderTool } from "@/components/tools/qrcode-reader-tool";

const meta = getTool("qrcode-reader")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/qrcode-reader" },
};

export default function Page() {
  return (
    <ToolFrame slug="qrcode-reader">
      <QrcodeReaderTool />
    </ToolFrame>
  );
}
