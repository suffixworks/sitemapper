"use client";

import dynamic from "next/dynamic";
import { Eye, Network } from "lucide-react";
import type { SitemapDoc } from "@/lib/tree";
import type { SharePermission } from "@/lib/share";

const ReadOnlyCanvas = dynamic(
  () => import("./ReadOnlyCanvas").then((m) => m.ReadOnlyCanvas),
  { ssr: false, loading: () => <div className="flex-1" style={{ background: "#EDF0F5" }} /> },
);

export function GuestView({
  name,
  doc,
  permission,
}: {
  name: string;
  doc: SitemapDoc;
  permission: SharePermission;
}) {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <header className="flex h-[52px] flex-none items-center gap-2.5 border-b border-[#2A2D37] bg-[#14161C] px-3 text-[#C9CDD8] sm:px-4">
        <span className="grid h-6 w-6 flex-none place-items-center rounded-md bg-gradient-to-br from-[#4C46E5] to-[#7d78ff]">
          <Network className="h-3.5 w-3.5 text-white" />
        </span>
        <span className="min-w-0 truncate text-[14px] font-semibold text-white">{name}</span>
        <span className="ml-auto flex flex-none items-center gap-1.5 rounded-full bg-[#23262F] px-2.5 py-1 text-[11px] font-medium text-[#AAB2C0]">
          <Eye className="h-3 w-3" />
          {permission === "comment" ? "Review" : "Read-only"}
        </span>
      </header>
      <ReadOnlyCanvas doc={doc} />
      {/* Phase 5: comment layer for permission === "comment" */}
    </div>
  );
}
