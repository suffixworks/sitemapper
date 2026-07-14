"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Eye, Link2, MessageSquare, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createShare, listShares, revokeShare } from "@/app/actions";
import type { ShareLink, SharePermission } from "@/lib/share";

export function ShareDialog({ sitemapId }: { sitemapId: string }) {
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) {
      setLoading(true);
      listShares(sitemapId).then((s) => {
        setShares(s);
        setLoading(false);
      });
    }
  };

  const create = (permission: SharePermission) =>
    startTransition(async () => {
      const link = await createShare(sitemapId, permission);
      setShares((prev) => [link, ...prev]);
      toast(`${permission === "comment" ? "Comment" : "View"} link created`);
    });

  const revoke = (id: string) =>
    startTransition(async () => {
      await revokeShare(id);
      setShares((prev) => prev.map((s) => (s.id === id ? { ...s, revoked: true } : s)));
      toast("Link revoked");
    });

  const copy = (link: ShareLink) => {
    navigator.clipboard.writeText(`${window.location.origin}/s/${link.token}`);
    setCopiedId(link.id);
    toast("Link copied");
    setTimeout(() => setCopiedId((c) => (c === link.id ? null : c)), 1500);
  };

  const active = shares.filter((s) => !s.revoked);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger className="flex h-8 items-center gap-1.5 rounded-[7px] px-2.5 text-[13px] font-medium text-[#C9CDD8] transition-colors hover:bg-[#23262F] hover:text-white">
        <Share2 className="h-[15px] w-[15px]" />
        <span className="hidden sm:inline">Share</span>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share this sitemap</DialogTitle>
          <DialogDescription>
            Anyone with the link can open it — no sign-in needed. Revoke anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => create("view")}
            disabled={pending}
            className="flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
          >
            <Eye className="h-4 w-4" /> View link
          </button>
          <button
            onClick={() => create("comment")}
            disabled={pending}
            className="flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
          >
            <MessageSquare className="h-4 w-4" /> Comment link
          </button>
        </div>

        <div className="mt-1 max-h-72 space-y-2 overflow-y-auto">
          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
          ) : active.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No links yet. Create one above.
            </p>
          ) : (
            active.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-lg border border-input p-2"
              >
                <span
                  className={`flex flex-none items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    s.permission === "comment"
                      ? "bg-[#EBEAFC] text-[#4C46E5]"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.permission === "comment" ? (
                    <MessageSquare className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                  {s.permission === "comment" ? "Comment" : "View"}
                </span>
                <code className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                  <Link2 className="mr-1 inline h-3 w-3" />/s/{s.token}
                </code>
                <button
                  onClick={() => copy(s)}
                  title="Copy link"
                  className="grid h-8 w-8 flex-none place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {copiedId === s.id ? (
                    <Check className="h-4 w-4 text-[#3E9B8E]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => revoke(s.id)}
                  disabled={pending}
                  title="Revoke link"
                  className="grid h-8 w-8 flex-none place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
