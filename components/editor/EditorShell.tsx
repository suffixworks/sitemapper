"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useStore } from "zustand";
import { ArrowLeft, Check, Loader2, Redo2, TriangleAlert, Undo2 } from "lucide-react";
import { saveSitemap } from "@/app/actions";
import type { SitemapDoc } from "@/lib/tree";
import { useSitemapStore } from "@/store/useSitemapStore";

const SitemapEditor = dynamic(
  () => import("./SitemapEditor").then((m) => m.SitemapEditor),
  {
    ssr: false,
    loading: () => <div className="flex-1" style={{ background: "#EDF0F5" }} />,
  },
);

type SaveStatus = "idle" | "saving" | "saved" | "error";

function useAutosave(sitemapId: string, initialDoc: SitemapDoc): SaveStatus {
  const doc = useSitemapStore((s) => s.doc);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [ready, setReady] = useState(false);
  const lastSaved = useRef<SitemapDoc>(initialDoc);

  // Load the saved doc into the store once, and reset undo history to it.
  useEffect(() => {
    useSitemapStore.getState().load(initialDoc);
    useSitemapStore.temporal.getState().clear();
    lastSaved.current = initialDoc;
    setReady(true);
  }, [initialDoc]);

  // Debounced autosave on every tree change after load.
  useEffect(() => {
    if (!ready || doc === lastSaved.current) return;
    setStatus("saving");
    const snapshot = doc;
    const t = setTimeout(async () => {
      try {
        await saveSitemap(sitemapId, snapshot);
        lastSaved.current = snapshot;
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, 800);
    return () => clearTimeout(t);
  }, [doc, ready, sitemapId]);

  return status;
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-[12px] text-[#AAB2C0]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="flex items-center gap-1.5 text-[12px] text-[#8ea0b8]">
        <Check className="h-3.5 w-3.5" /> Saved
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1.5 text-[12px] text-[#ff8a86]">
        <TriangleAlert className="h-3.5 w-3.5" /> Save failed
      </span>
    );
  }
  return null;
}

function TopBar({ name, status }: { name: string; status: SaveStatus }) {
  const canUndo = useStore(useSitemapStore.temporal, (s) => s.pastStates.length > 0);
  const canRedo = useStore(useSitemapStore.temporal, (s) => s.futureStates.length > 0);

  return (
    <div className="flex h-[52px] flex-none items-center gap-1.5 border-b border-[#2A2D37] bg-[#14161C] px-3 text-[#C9CDD8] sm:px-4">
      <Link
        href="/"
        title="Back to dashboard"
        className="grid h-8 w-8 flex-none place-items-center rounded-[7px] transition-colors hover:bg-[#23262F] hover:text-white"
      >
        <ArrowLeft className="h-[17px] w-[17px]" />
      </Link>
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-[14px] font-semibold text-white">{name}</span>
        <SaveIndicator status={status} />
      </div>

      <div className="flex-1" />

      <BarButton
        label="Undo (Ctrl+Z)"
        disabled={!canUndo}
        onClick={() => useSitemapStore.temporal.getState().undo()}
      >
        <Undo2 className="h-[15px] w-[15px]" />
      </BarButton>
      <BarButton
        label="Redo (Ctrl+Shift+Z)"
        disabled={!canRedo}
        onClick={() => useSitemapStore.temporal.getState().redo()}
      >
        <Redo2 className="h-[15px] w-[15px]" />
      </BarButton>
    </div>
  );
}

function BarButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-[7px] transition-colors hover:bg-[#23262F] hover:text-white disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

export function EditorShell({
  sitemapId,
  name,
  initialDoc,
}: {
  sitemapId: string;
  name: string;
  initialDoc: SitemapDoc;
}) {
  const status = useAutosave(sitemapId, initialDoc);
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <TopBar name={name} status={status} />
      <SitemapEditor />
    </div>
  );
}
