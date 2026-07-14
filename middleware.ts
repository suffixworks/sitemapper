import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Edge-safe: uses the adapter-free config so no DB import runs in middleware.
// The `authorized` callback (auth.config.ts) redirects unauthenticated users to
// /login. Only the staff app is matched; /login, /api, and guest /s are public.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/", "/editor/:path*"],
};
