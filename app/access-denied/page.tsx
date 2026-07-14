import Link from "next/link";
import { ShieldX } from "lucide-react";
import { SUFFIX_DOMAIN } from "@/lib/supabase/env";

export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#EDF0F5] p-6">
      <div className="w-full max-w-[360px] rounded-2xl border border-[#E1E6EF] bg-white px-8 py-9 text-center shadow-[0_8px_30px_rgba(20,30,60,.12)]">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[14px] bg-[#FDECEA]">
          <ShieldX className="h-7 w-7 text-[#D9534F]" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[#1B2130]">Access denied</h1>
        <p className="mx-auto mt-2 max-w-[280px] text-[13.5px] leading-relaxed text-[#7A8496]">
          Sitemapper is only available to <span className="font-medium text-[#1B2130]">@{SUFFIX_DOMAIN}</span>{" "}
          accounts. Sign in with your work Google account.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-[#4C46E5] text-[14px] font-semibold text-white transition-colors hover:bg-[#5b55f0]"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
