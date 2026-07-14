// Server-only: validate a share token (exists / not revoked / not expired) and
// resolve it to the sitemap via Drizzle. Guests never touch the DB directly —
// every guest read/write goes through a server route/page that calls this.
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sitemaps, sitemapShares } from "@/lib/db/schema";
import type { SitemapDoc } from "@/lib/tree";

export type SharePermission = "view" | "comment";

export interface ShareLink {
  id: string;
  token: string;
  permission: SharePermission;
  revoked: boolean;
  createdAt: string;
}

export interface ValidatedShare {
  sitemapId: string;
  name: string;
  data: SitemapDoc;
  permission: SharePermission;
}

export async function validateShareToken(
  token: string,
): Promise<ValidatedShare | null> {
  if (!token) return null;

  const [row] = await db
    .select({
      permission: sitemapShares.permission,
      revoked: sitemapShares.revoked,
      expiresAt: sitemapShares.expiresAt,
      sitemapId: sitemaps.id,
      name: sitemaps.name,
      data: sitemaps.data,
    })
    .from(sitemapShares)
    .innerJoin(sitemaps, eq(sitemapShares.sitemapId, sitemaps.id))
    .where(eq(sitemapShares.token, token));

  if (!row || row.revoked) return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;

  return {
    sitemapId: row.sitemapId,
    name: row.name,
    data: row.data as SitemapDoc,
    permission: row.permission as SharePermission,
  };
}
