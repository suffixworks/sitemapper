// SERVER-ONLY service-role client for guest routes (share-token flow, Phase 4/5).
// Uses SUPABASE_SERVICE_ROLE_KEY and bypasses RLS. NEVER import from client code.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createSupabaseClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
