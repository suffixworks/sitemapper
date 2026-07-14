"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { sitemaps } from "@/lib/db/schema";
import type { SitemapDoc } from "@/lib/tree";

function homeSeed(): SitemapDoc {
  const rootId = crypto.randomUUID();
  return {
    rootId,
    nodes: {
      [rootId]: {
        id: rootId,
        title: "Home",
        slug: "/",
        parentId: null,
        children: [],
        color: null,
        collapsed: false,
      },
    },
  };
}

// Staff are team-shared: any signed-in @suffix.works user may act on any sitemap.
// (The domain gate already ran at sign-in.) This just ensures a session exists.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function createSitemap() {
  const ownerId = await requireUserId();
  const [row] = await db
    .insert(sitemaps)
    .values({ ownerId, name: "Untitled sitemap", data: homeSeed() })
    .returning({ id: sitemaps.id });
  redirect(`/editor/${row.id}`);
}

export async function duplicateSitemap(id: string) {
  const ownerId = await requireUserId();
  const [src] = await db
    .select({ name: sitemaps.name, data: sitemaps.data })
    .from(sitemaps)
    .where(eq(sitemaps.id, id));
  if (!src) throw new Error("Sitemap not found");
  await db.insert(sitemaps).values({ ownerId, name: `${src.name} copy`, data: src.data });
  revalidatePath("/");
}

export async function renameSitemap(id: string, name: string) {
  await requireUserId();
  await db
    .update(sitemaps)
    .set({ name: name.trim() || "Untitled sitemap" })
    .where(eq(sitemaps.id, id));
  revalidatePath("/");
}

export async function deleteSitemap(id: string) {
  await requireUserId();
  await db.delete(sitemaps).where(eq(sitemaps.id, id));
  revalidatePath("/");
}

// Autosave target — the browser never touches the DB; it calls this action.
export async function saveSitemap(id: string, data: SitemapDoc) {
  await requireUserId();
  await db.update(sitemaps).set({ data }).where(eq(sitemaps.id, id));
}

export async function doSignOut() {
  await signOut({ redirectTo: "/login" });
}
