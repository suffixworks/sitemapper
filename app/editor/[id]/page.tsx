import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sitemaps } from "@/lib/db/schema";
import { emptyDoc, type SitemapDoc } from "@/lib/tree";
import { EditorShell } from "@/components/editor/EditorShell";

export const dynamic = "force-dynamic";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [row] = await db
    .select({ id: sitemaps.id, name: sitemaps.name, data: sitemaps.data })
    .from(sitemaps)
    .where(eq(sitemaps.id, id));

  if (!row) notFound();

  const doc = (row.data as SitemapDoc | null) ?? emptyDoc();

  return <EditorShell sitemapId={row.id} name={row.name} initialDoc={doc} />;
}
