import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { emptyDoc, type SitemapDoc } from "@/lib/tree";
import { EditorShell } from "@/components/editor/EditorShell";

export const dynamic = "force-dynamic";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: sitemap, error } = await supabase
    .from("sitemaps")
    .select("id, name, data")
    .eq("id", id)
    .single();

  if (error || !sitemap) notFound();

  const doc = (sitemap.data as SitemapDoc | null) ?? emptyDoc();

  return <EditorShell sitemapId={sitemap.id} name={sitemap.name} initialDoc={doc} />;
}
