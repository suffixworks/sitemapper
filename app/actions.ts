"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { comments, sitemaps, sitemapShares } from "@/lib/db/schema";
import { isValidBody, type CommentRow } from "@/lib/comments";
import type { ShareLink, SharePermission } from "@/lib/share";
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

// ---------------------------------------------------------------------------
// Share links (staff)
// ---------------------------------------------------------------------------
export async function listShares(sitemapId: string): Promise<ShareLink[]> {
  await requireUserId();
  const rows = await db
    .select({
      id: sitemapShares.id,
      token: sitemapShares.token,
      permission: sitemapShares.permission,
      revoked: sitemapShares.revoked,
      createdAt: sitemapShares.createdAt,
    })
    .from(sitemapShares)
    .where(eq(sitemapShares.sitemapId, sitemapId))
    .orderBy(desc(sitemapShares.createdAt));
  return rows.map((r) => ({
    id: r.id,
    token: r.token,
    permission: r.permission as SharePermission,
    revoked: r.revoked,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createShare(
  sitemapId: string,
  permission: SharePermission,
): Promise<ShareLink> {
  const userId = await requireUserId();
  const [row] = await db
    .insert(sitemapShares)
    .values({ sitemapId, permission, createdBy: userId })
    .returning({
      id: sitemapShares.id,
      token: sitemapShares.token,
      permission: sitemapShares.permission,
      revoked: sitemapShares.revoked,
      createdAt: sitemapShares.createdAt,
    });
  return {
    id: row.id,
    token: row.token,
    permission: row.permission as SharePermission,
    revoked: row.revoked,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function revokeShare(shareId: string) {
  await requireUserId();
  await db.update(sitemapShares).set({ revoked: true }).where(eq(sitemapShares.id, shareId));
}

// ---------------------------------------------------------------------------
// Comments (staff — guests use /api/share/[token]/comments)
// ---------------------------------------------------------------------------
function toCommentRow(c: typeof comments.$inferSelect): CommentRow {
  return {
    id: c.id,
    nodeId: c.nodeId,
    parentId: c.parentId,
    body: c.body,
    authorName: c.authorName,
    authorEmail: c.authorEmail,
    isStaff: c.isStaff,
    resolved: c.resolved,
    createdAt: c.createdAt.toISOString(),
  };
}

export async function listComments(sitemapId: string): Promise<CommentRow[]> {
  await requireUserId();
  const rows = await db
    .select()
    .from(comments)
    .where(eq(comments.sitemapId, sitemapId))
    .orderBy(asc(comments.createdAt));
  return rows.map(toCommentRow);
}

export async function addStaffComment(
  sitemapId: string,
  input: { nodeId: string | null; parentId: string | null; body: string },
): Promise<CommentRow> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!isValidBody(input.body)) throw new Error("Comment must be 1–4000 characters");

  const [row] = await db
    .insert(comments)
    .values({
      sitemapId,
      nodeId: input.nodeId,
      parentId: input.parentId,
      body: input.body.trim(),
      authorId: session.user.id,
      authorName: session.user.name ?? session.user.email ?? "Staff",
      authorEmail: session.user.email ?? null,
      isStaff: true,
    })
    .returning();
  return toCommentRow(row);
}

export async function resolveComment(id: string, resolved: boolean) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await db
    .update(comments)
    .set({
      resolved,
      resolvedBy: resolved ? session.user.id : null,
      resolvedAt: resolved ? new Date() : null,
    })
    .where(eq(comments.id, id));
}
