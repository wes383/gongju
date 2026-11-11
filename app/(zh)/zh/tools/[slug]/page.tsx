import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ToolLoader } from "@/components/tools/tool-loader";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { allTools, getTool } from "@/lib/tools";

// Unknown slugs must 404, so this catch-all cannot promise an instant shell
export const instant = false;

export function generateStaticParams() {
  return allTools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  return tool ? toolMetadata(tool, "zh") : {};
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  return (
    <ToolFrame slug={slug}>
      <JsonLd data={toolJsonLd(tool, "zh")} />
      <ToolLoader slug={slug} />
    </ToolFrame>
  );
}