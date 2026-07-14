// Public Supabase config, baked at build time. When absent (env not set yet),
// the app degrades gracefully instead of crashing — middleware skips gating and
// the dashboard shows a "configure Supabase" notice.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const SUFFIX_DOMAIN = "suffix.works";

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

export function isSuffixEmail(email: string | null | undefined): boolean {
  return (email ?? "").toLowerCase().endsWith("@" + SUFFIX_DOMAIN);
}
