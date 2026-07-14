import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { sitemaps, users } from "@/lib/db/schema";
import { Dashboard, type SitemapListItem } from "@/components/dashboard/Dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();

  const rows = await db
    .select({
      id: sitemaps.id,
      name: sitemaps.name,
      updatedAt: sitemaps.updatedAt,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(sitemaps)
    .leftJoin(users, eq(sitemaps.ownerId, users.id))
    .orderBy(desc(sitemaps.updatedAt));

  const items: SitemapListItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    updated_at: r.updatedAt.toISOString(),
    ownerName: r.ownerName ?? r.ownerEmail?.split("@")[0] ?? "Unknown",
  }));

  return <Dashboard sitemaps={items} userEmail={session?.user?.email ?? ""} />;
}
