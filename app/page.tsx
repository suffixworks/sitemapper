import { desc } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { sitemaps } from "@/lib/db/schema";
import { Dashboard, type SitemapListItem } from "@/components/dashboard/Dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();

  const rows = await db
    .select({
      id: sitemaps.id,
      name: sitemaps.name,
      updatedAt: sitemaps.updatedAt,
    })
    .from(sitemaps)
    .orderBy(desc(sitemaps.updatedAt));

  const items: SitemapListItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    updated_at: r.updatedAt.toISOString(),
  }));

  return <Dashboard sitemaps={items} userEmail={session?.user?.email ?? ""} />;
}
