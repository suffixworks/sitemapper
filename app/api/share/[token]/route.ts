import { NextResponse } from "next/server";

// GET the sitemap doc for a valid share token (validated with the service-role key).
// Guests never touch Supabase directly. TODO(Phase 4).
export async function GET() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
