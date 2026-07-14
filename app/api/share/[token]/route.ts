import { NextResponse } from "next/server";
import { validateShareToken } from "@/lib/share";

export const runtime = "nodejs";

// GET the sitemap doc for a valid share token (validated server-side via Drizzle).
// Guests never query the DB directly.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const share = await validateShareToken(token);
  if (!share) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    name: share.name,
    permission: share.permission,
    data: share.data,
  });
}
