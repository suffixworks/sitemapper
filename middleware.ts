import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Gate the staff app only. Exclude:
    //   _next static/image, favicon, files with extensions,
    //   /login, /access-denied, /auth (OAuth callback),
    //   /api and /s (guest share endpoints — no staff auth).
    "/((?!_next/static|_next/image|favicon\\.ico|login|access-denied|auth|api|s/|.*\\.[\\w]+$).*)",
  ],
};
