"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Eye, MessageSquare, Network } from "lucide-react";
import {
  CommentsPanel,
  type CommentsTransport,
} from "@/components/comments/CommentsPanel";
import type { CommentRow } from "@/lib/comments";
import type { SharePermission } from "@/lib/share";
import type { SitemapDoc } from "@/lib/tree";

const ReadOnlyCanvas = dynamic(
  () => import("./ReadOnlyCanvas").then((m) => m.ReadOnlyCanvas),
  { ssr: false, loading: () => <div className="flex-1" style={{ background: "#EDF0F5" }} /> },
);

export function GuestView({
  token,
  name,
  doc,
  permission,
}: {
  token: string;
  name: string;
  doc: SitemapDoc;
  permission: SharePermission;
}) {
  const canComment = permission === "comment";
  const [commentsOpen, setCommentsOpen] = useState(false);

  const transport: CommentsTransport = useMemo(
    () => ({
      role: "guest",
      list: async () => {
        const res = await fetch(`/api/share/${token}/comments`);
        if (!res.ok) return [];
        const data = (await res.json()) as { comments?: CommentRow[] };
        return data.comments ?? [];
      },
      add: async (input) => {
        const res = await fetch(`/api/share/${token}/comments`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error ?? "Failed to post comment");
        }
        const data = (await res.json()) as { comment: CommentRow };
        return data.comment;
      },
    }),
    [token],
  );

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <header className="flex h-[52px] flex-none items-center gap-2.5 border-b border-[#2A2D37] bg-[#14161C] px-3 text-[#C9CDD8] sm:px-4">
        <span className="grid h-6 w-6 flex-none place-items-center rounded-md bg-gradient-to-br from-[#4C46E5] to-[#7d78ff]">
          <Network className="h-3.5 w-3.5 text-white" />
        </span>
        <span className="min-w-0 truncate text-[14px] font-semibold text-white">{name}</span>
        <div className="ml-auto flex flex-none items-center gap-2">
          {canComment && (
            <button
              onClick={() => setCommentsOpen((o) => !o)}
              className={`flex h-8 items-center gap-1.5 rounded-[7px] px-2.5 text-[13px] font-medium transition-colors hover:bg-[#23262F] hover:text-white ${
                commentsOpen ? "bg-[#23262F] text-white" : "text-[#C9CDD8]"
              }`}
            >
              <MessageSquare className="h-[15px] w-[15px]" />
              <span className="hidden sm:inline">Comments</span>
            </button>
          )}
          <span className="flex items-center gap-1.5 rounded-full bg-[#23262F] px-2.5 py-1 text-[11px] font-medium text-[#AAB2C0]">
            <Eye className="h-3 w-3" />
            {canComment ? "Review" : "Read-only"}
          </span>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <ReadOnlyCanvas doc={doc} />
        {canComment && (
          <CommentsPanel
            open={commentsOpen}
            onClose={() => setCommentsOpen(false)}
            doc={doc}
            transport={transport}
          />
        )}
      </div>
    </div>
  );
}
