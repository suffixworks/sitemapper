"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  Copy,
  LogOut,
  MoreVertical,
  Network,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createSitemap,
  deleteSitemap,
  doSignOut,
  duplicateSitemap,
  renameSitemap,
} from "@/app/actions";

export interface SitemapListItem {
  id: string;
  name: string;
  updated_at: string;
  ownerName: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function Dashboard({
  sitemaps,
  userEmail,
}: {
  sitemaps: SitemapListItem[];
  userEmail: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="min-h-[100dvh] bg-[#EDF0F5]">
      <header className="flex h-[56px] items-center gap-3 border-b border-[#E1E6EF] bg-white px-4 sm:px-6">
        <div className="flex items-center gap-2.5 font-bold tracking-tight text-[#1B2130]">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-[#4C46E5] to-[#7d78ff]">
            <Network className="h-4 w-4 text-white" />
          </span>
          Sitemapper
        </div>
        <div className="flex-1" />
        <span className="hidden text-[13px] text-[#7A8496] sm:inline">{userEmail}</span>
        <button
          onClick={() => startTransition(() => doSignOut())}
          title="Sign out"
          className="grid h-9 w-9 place-items-center rounded-lg text-[#7A8496] transition-colors hover:bg-[#F2F3F8] hover:text-[#1B2130]"
        >
          <LogOut className="h-[17px] w-[17px]" />
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-[19px] font-bold tracking-tight text-[#1B2130]">Sitemaps</h1>
          <form action={createSitemap}>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 items-center gap-2 rounded-[9px] bg-[#4C46E5] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#5b55f0] disabled:opacity-60"
            >
              <Plus className="h-[18px] w-[18px]" strokeWidth={2.2} /> New sitemap
            </button>
          </form>
        </div>

        {sitemaps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D2D8E3] bg-white/60 px-6 py-16 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-[13px] bg-[#EBEAFC]">
              <Network className="h-6 w-6 text-[#4C46E5]" />
            </div>
            <p className="text-[15px] font-semibold text-[#1B2130]">No sitemaps yet</p>
            <p className="mx-auto mt-1 max-w-xs text-[13px] text-[#7A8496]">
              Create your first sitemap to start mapping out a site structure.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sitemaps.map((s) => (
              <div
                key={s.id}
                className="group relative rounded-xl border border-[#E1E6EF] bg-white p-4 shadow-[0_1px_2px_rgba(20,30,60,.05)] transition-shadow hover:shadow-[0_6px_18px_rgba(20,30,60,.08)]"
              >
                <Link href={`/editor/${s.id}`} className="block pr-7">
                  <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-lg bg-[#EBEAFC]">
                    <Network className="h-[18px] w-[18px] text-[#4C46E5]" />
                  </div>
                  <div className="truncate text-[15px] font-semibold text-[#1B2130]">
                    {s.name}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[#AAB2C0]">
                    <span
                      className="grid h-[18px] w-[18px] flex-none place-items-center rounded-full bg-[#EBEAFC] text-[9px] font-semibold uppercase text-[#4C46E5]"
                      title={s.ownerName}
                    >
                      {s.ownerName.charAt(0)}
                    </span>
                    <span className="truncate">
                      {s.ownerName} · {formatDate(s.updated_at)}
                    </span>
                  </div>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label="Sitemap actions"
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg text-[#AAB2C0] transition-colors hover:bg-[#F2F3F8] hover:text-[#1B2130]"
                  >
                    <MoreVertical className="h-[18px] w-[18px]" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        const name = prompt("Rename sitemap", s.name);
                        if (name != null) startTransition(() => renameSitemap(s.id, name));
                      }}
                    >
                      <Pencil className="h-4 w-4" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        startTransition(async () => {
                          await duplicateSitemap(s.id);
                          toast("Sitemap duplicated");
                        })
                      }
                    >
                      <Copy className="h-4 w-4" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        if (confirm(`Delete "${s.name}"? This can't be undone.`)) {
                          startTransition(async () => {
                            await deleteSitemap(s.id);
                            toast("Sitemap deleted");
                          });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
