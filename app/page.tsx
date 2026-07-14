import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { Dashboard, type SitemapListItem } from "@/components/dashboard/Dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#EDF0F5] p-6">
        <div className="max-w-md rounded-2xl border border-[#E1E6EF] bg-white px-8 py-9 text-center shadow-sm">
          <h1 className="text-lg font-bold text-[#1B2130]">Supabase not configured</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[#7A8496]">
            Set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (plus the
            server keys) in <code className="font-mono">.dev.vars</code>, then restart the
            dev server.
          </p>
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("sitemaps")
    .select("id, name, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <Dashboard sitemaps={(data as SitemapListItem[]) ?? []} userEmail={user?.email ?? ""} />
  );
}
