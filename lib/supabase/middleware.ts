// Session refresh + staff gate for the Next.js middleware.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured, isSuffixEmail } from "./env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Not configured yet (no env) — let requests through so the app can boot and
  // show a setup notice instead of redirect-looping.
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: getUser() refreshes the session; do not run code between
  // createServerClient and getUser or you can log users out at random.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (!isSuffixEmail(user.email)) {
    const url = request.nextUrl.clone();
    url.pathname = "/access-denied";
    return NextResponse.redirect(url);
  }

  return response;
}
