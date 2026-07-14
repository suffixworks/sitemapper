import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { comments } from "@/lib/db/schema";
import { validateShareToken } from "@/lib/share";
import { isValidBody, type CommentRow } from "@/lib/comments";
import { guestRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

function toRow(c: typeof comments.$inferSelect): CommentRow {
  return {
    id: c.id,
    nodeId: c.nodeId,
    parentId: c.parentId,
    body: c.body,
    authorName: c.authorName,
    authorEmail: c.authorEmail,
    isStaff: c.isStaff,
    resolved: c.resolved,
    createdAt: c.createdAt.toISOString(),
  };
}

// GET — list comments for a share link (permission must be 'comment').
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const share = await validateShareToken(token);
  if (!share || share.permission !== "comment") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const rows = await db
    .select()
    .from(comments)
    .where(eq(comments.sitemapId, share.sitemapId))
    .orderBy(asc(comments.createdAt));
  return NextResponse.json({ comments: rows.map(toRow) });
}

// POST — a guest posts a comment/reply (permission must be 'comment').
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const share = await validateShareToken(token);
  if (!share || share.permission !== "comment") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const allowed = await guestRateLimit(`${ip}:${token}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too many comments. Slow down." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const {
    nodeId = null,
    parentId = null,
    body: text = "",
    authorName = "",
    authorEmail = "",
  } = (body ?? {}) as Record<string, unknown>;

  if (typeof text !== "string" || !isValidBody(text)) {
    return NextResponse.json({ error: "Comment must be 1–4000 characters" }, { status: 400 });
  }
  if (typeof authorName !== "string" || !authorName.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (typeof authorEmail !== "string" || !authorEmail.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const [row] = await db
    .insert(comments)
    .values({
      sitemapId: share.sitemapId,
      nodeId: typeof nodeId === "string" ? nodeId : null,
      parentId: typeof parentId === "string" ? parentId : null,
      body: text.trim(),
      authorName: authorName.trim().slice(0, 120),
      authorEmail: authorEmail.trim().slice(0, 200),
      isStaff: false,
    })
    .returning();

  return NextResponse.json({ comment: toRow(row) }, { status: 201 });
}
