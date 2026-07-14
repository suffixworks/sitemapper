import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSuffixEmail } from "@/lib/supabase/env";

// OAuth callback — exchanges the code for a session. Belt-and-suspenders domain
// check (the Before-User-Created hook already blocks non-@suffix.works signups).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!isSuffixEmail(user?.email)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/access-denied`);
      }
      return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/"}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
