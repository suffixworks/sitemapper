"use client";

import dynamic from "next/dynamic";
import { Network } from "lucide-react";
import { useSitemapStore } from "@/store/useSitemapStore";

const SitemapEditor = dynamic(
  () => import("./SitemapEditor").then((m) => m.SitemapEditor),
  {
    ssr: false,
    loading: () => <div className="flex-1" style={{ background: "#EDF0F5" }} />,
  },
);

function TopBar() {
  const reset = useSitemapStore((s) => s.reset);
  return (
    <div className="flex h-[52px] flex-none items-center gap-3.5 border-b border-[#2A2D37] bg-[#14161C] px-4 text-[#C9CDD8]">
      <div className="flex items-center gap-2.5 font-bold tracking-tight text-white">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-[#4C46E5] to-[#7d78ff]">
          <Network className="h-3.5 w-3.5 text-white" />
        </span>
        Sitemapper
        <small className="ml-0.5 hidden text-[11px] font-medium text-[#AAB2C0] sm:inline">
          visual sitemap builder
        </small>
      </div>
      <div className="flex-1" />
      <button
        onClick={() => {
          if (confirm("Start over? The current structure will be cleared.")) reset();
        }}
        className="h-8 rounded-[7px] px-2.5 text-[13px] font-medium transition-colors hover:bg-[#23262F] hover:text-white"
      >
        New
      </button>
    </div>
  );
}

export function EditorShell() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <TopBar />
      <SitemapEditor />
    </div>
  );
}
