"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, MessageSquare, Send, X } from "lucide-react";
import { toast } from "sonner";
import { buildThreads, type CommentInput, type CommentRow } from "@/lib/comments";
import type { SitemapDoc } from "@/lib/tree";

export interface CommentsTransport {
  role: "staff" | "guest";
  list: () => Promise<CommentRow[]>;
  add: (input: CommentInput) => Promise<CommentRow>;
  resolve?: (id: string, resolved: boolean) => Promise<void>;
}

type Filter = "open" | "resolved" | "all";

function fmt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function targetLabel(doc: SitemapDoc, nodeId: string | null): string {
  if (!nodeId) return "Whole sitemap";
  return doc.nodes[nodeId]?.title ?? "Deleted page";
}

export function CommentsPanel({
  open,
  onClose,
  doc,
  transport,
}: {
  open: boolean;
  onClose: () => void;
  doc: SitemapDoc;
  transport: CommentsTransport;
}) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>("open");

  // New-comment composer state
  const [targetNode, setTargetNode] = useState<string>("");
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const isGuest = transport.role === "guest";

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    transport.list().then((c) => {
      setComments(c);
      setLoading(false);
    });
    if (isGuest && typeof window !== "undefined") {
      setName(localStorage.getItem("sm_guest_name") ?? "");
      setEmail(localStorage.getItem("sm_guest_email") ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const threads = useMemo(() => {
    const all = buildThreads(comments);
    if (filter === "open") return all.filter((t) => !t.root.resolved);
    if (filter === "resolved") return all.filter((t) => t.root.resolved);
    return all;
  }, [comments, filter]);

  const openCount = useMemo(
    () => buildThreads(comments).filter((t) => !t.root.resolved).length,
    [comments],
  );

  function guestOk(): boolean {
    if (!isGuest) return true;
    if (!name.trim()) {
      toast("Enter your name");
      return false;
    }
    if (!email.includes("@")) {
      toast("Enter a valid email");
      return false;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("sm_guest_name", name.trim());
      localStorage.setItem("sm_guest_email", email.trim());
    }
    return true;
  }

  async function submit(input: CommentInput, reset: () => void) {
    if (!input.body.trim()) return;
    if (!guestOk()) return;
    setBusy(true);
    try {
      const created = await transport.add({
        ...input,
        authorName: isGuest ? name.trim() : undefined,
        authorEmail: isGuest ? email.trim() : undefined,
      });
      setComments((prev) => [...prev, created]);
      reset();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to post comment");
    } finally {
      setBusy(false);
    }
  }

  async function toggleResolve(c: CommentRow) {
    if (!transport.resolve) return;
    const next = !c.resolved;
    setComments((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, resolved: next } : x)),
    );
    await transport.resolve(c.id, next);
  }

  if (!open) return null;

  const pageNodes = Object.values(doc.nodes);

  return (
    <div className="absolute inset-0 z-30 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[380px]">
      <div
        className="absolute inset-0 bg-black/20 sm:hidden"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 flex h-[85%] flex-col rounded-t-2xl border border-[#E1E6EF] bg-white shadow-[0_-8px_30px_rgba(20,30,60,.16)] sm:inset-y-0 sm:right-0 sm:h-full sm:w-[380px] sm:rounded-none sm:border-y-0 sm:border-r-0">
        {/* header */}
        <div className="flex flex-none items-center gap-2 border-b border-[#E1E6EF] px-4 py-3">
          <MessageSquare className="h-[18px] w-[18px] text-[#4C46E5]" />
          <span className="font-semibold text-[#1B2130]">Comments</span>
          <span className="rounded-full bg-[#EBEAFC] px-2 py-0.5 text-[11px] font-medium text-[#4C46E5]">
            {openCount} open
          </span>
          <button
            onClick={onClose}
            className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-[#7A8496] hover:bg-[#F2F3F8] hover:text-[#1B2130]"
            aria-label="Close comments"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* filter */}
        <div className="flex flex-none gap-1 border-b border-[#E1E6EF] px-3 py-2">
          {(["open", "resolved", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-2.5 py-1 text-[13px] font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-[#EBEAFC] text-[#4C46E5]"
                  : "text-[#7A8496] hover:bg-[#F2F3F8]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* threads */}
        <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
          {loading ? (
            <p className="py-6 text-center text-sm text-[#AAB2C0]">Loading…</p>
          ) : threads.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#AAB2C0]">No comments yet.</p>
          ) : (
            threads.map(({ root, replies }) => (
              <div
                key={root.id}
                className="rounded-xl border border-[#E1E6EF] bg-white p-3"
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="rounded bg-[#F2F3F8] px-1.5 py-0.5 text-[11px] font-medium text-[#7A8496]">
                    {targetLabel(doc, root.nodeId)}
                  </span>
                  {root.resolved && (
                    <span className="flex items-center gap-1 rounded bg-[#E7F4F1] px-1.5 py-0.5 text-[11px] font-medium text-[#3E9B8E]">
                      <Check className="h-3 w-3" /> Resolved
                    </span>
                  )}
                  {transport.resolve && (
                    <button
                      onClick={() => toggleResolve(root)}
                      className="ml-auto text-[11px] font-medium text-[#7A8496] hover:text-[#4C46E5]"
                    >
                      {root.resolved ? "Reopen" : "Resolve"}
                    </button>
                  )}
                </div>
                <CommentBody c={root} />
                {replies.map((r) => (
                  <div key={r.id} className="mt-2 border-l-2 border-[#EBEAFC] pl-2.5">
                    <CommentBody c={r} />
                  </div>
                ))}

                {/* reply box */}
                {replyTo === root.id ? (
                  <div className="mt-2 flex gap-1.5">
                    <input
                      autoFocus
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Reply…"
                      className="min-w-0 flex-1 rounded-md border border-[#E1E6EF] px-2 py-1.5 text-[13px] outline-none focus:border-[#4C46E5]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          submit(
                            { nodeId: root.nodeId, parentId: root.id, body: replyBody },
                            () => {
                              setReplyBody("");
                              setReplyTo(null);
                            },
                          );
                        }
                      }}
                    />
                    <button
                      disabled={busy}
                      onClick={() =>
                        submit(
                          { nodeId: root.nodeId, parentId: root.id, body: replyBody },
                          () => {
                            setReplyBody("");
                            setReplyTo(null);
                          },
                        )
                      }
                      className="grid h-8 w-8 flex-none place-items-center rounded-md bg-[#4C46E5] text-white hover:bg-[#5b55f0] disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setReplyTo(root.id);
                      setReplyBody("");
                    }}
                    className="mt-2 text-[12px] font-medium text-[#7A8496] hover:text-[#4C46E5]"
                  >
                    Reply
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* composer */}
        <div className="flex-none space-y-2 border-t border-[#E1E6EF] bg-[#FAFBFD] p-3">
          {isGuest && (
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="min-w-0 flex-1 rounded-md border border-[#E1E6EF] px-2 py-1.5 text-[13px] outline-none focus:border-[#4C46E5]"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="min-w-0 flex-1 rounded-md border border-[#E1E6EF] px-2 py-1.5 text-[13px] outline-none focus:border-[#4C46E5]"
              />
            </div>
          )}
          <select
            value={targetNode}
            onChange={(e) => setTargetNode(e.target.value)}
            className="w-full rounded-md border border-[#E1E6EF] bg-white px-2 py-1.5 text-[13px] outline-none focus:border-[#4C46E5]"
          >
            <option value="">Comment on: Whole sitemap</option>
            {pageNodes.map((n) => (
              <option key={n.id} value={n.id}>
                Comment on: {n.title}
              </option>
            ))}
          </select>
          <div className="flex gap-1.5">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a comment…"
              rows={2}
              className="min-w-0 flex-1 resize-none rounded-md border border-[#E1E6EF] px-2 py-1.5 text-[13px] outline-none focus:border-[#4C46E5]"
            />
            <button
              disabled={busy || !body.trim()}
              onClick={() =>
                submit({ nodeId: targetNode || null, parentId: null, body }, () =>
                  setBody(""),
                )
              }
              className="grid w-10 flex-none place-items-center rounded-md bg-[#4C46E5] text-white hover:bg-[#5b55f0] disabled:opacity-50"
              aria-label="Post comment"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentBody({ c }: { c: CommentRow }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[12px]">
        <span className="font-semibold text-[#1B2130]">{c.authorName}</span>
        {c.isStaff && (
          <span className="rounded bg-[#EBEAFC] px-1 text-[10px] font-medium text-[#4C46E5]">
            staff
          </span>
        )}
        <span className="text-[#AAB2C0]">{fmt(c.createdAt)}</span>
      </div>
      <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-snug text-[#1B2130]">
        {c.body}
      </p>
    </div>
  );
}
