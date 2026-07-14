import { NextResponse, type NextRequest } from "next/server";

// OAuth callback — exchanges the code for a session, then redirects home.
// TODO(Phase 3): exchangeCodeForSession with the server Supabase client.
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(origin);
}
