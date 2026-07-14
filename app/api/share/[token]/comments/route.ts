import { NextResponse } from "next/server";

// Guest comments for a share link (service-role + Upstash rate limit).
// GET list / POST new comment; permission must be 'comment'. TODO(Phase 5).
export async function GET() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
