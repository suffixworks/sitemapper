"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Network } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, SUFFIX_DOMAIN } from "@/lib/supabase/env";

function LoginCard() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const authError = params.get("error");
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();

  const signIn = async () => {
    setLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { hd: SUFFIX_DOMAIN, prompt: "select_account" },
      },
    });
    if (error) setLoading(false);
  };

  return (
    <div className="w-full max-w-[360px] rounded-2xl border border-[#E1E6EF] bg-white px-8 py-9 text-center shadow-[0_8px_30px_rgba(20,30,60,.12)]">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[14px] bg-gradient-to-br from-[#4C46E5] to-[#7d78ff]">
        <Network className="h-7 w-7 text-white" />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-[#1B2130]">Sitemapper</h1>
      <p className="mx-auto mt-2 max-w-[280px] text-[13.5px] leading-relaxed text-[#7A8496]">
        Sign in with your <span className="font-medium text-[#1B2130]">@{SUFFIX_DOMAIN}</span>{" "}
        Google account to build and review sitemaps.
      </p>

      {authError && (
        <p className="mt-4 rounded-lg bg-[#FDECEA] px-3 py-2 text-[12.5px] text-[#B23B37]">
          Sign-in failed. Please try again.
        </p>
      )}

      <button
        onClick={signIn}
        disabled={loading || !configured}
        className="mt-6 flex h-11 w-full items-center justify-center gap-2.5 rounded-[10px] border border-[#E1E6EF] bg-white text-[14px] font-semibold text-[#1B2130] transition-colors hover:bg-[#F7F8FB] disabled:cursor-default disabled:opacity-50"
      >
        <GoogleMark />
        {loading ? "Redirecting…" : "Continue with Google"}
      </button>

      {!configured && (
        <p className="mt-4 text-[12px] leading-relaxed text-[#AAB2C0]">
          Supabase isn&apos;t configured yet. Set the env vars in{" "}
          <code className="font-mono">.dev.vars</code> to enable sign-in.
        </p>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h6.19a5.29 5.29 0 0 1-2.29 3.47v2.88h3.7c2.17-2 3.46-4.95 3.46-8.36Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.1 0 5.7-1.03 7.6-2.79l-3.7-2.88c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.03-6.45-4.75H1.72v2.98A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.55 14.68a7.2 7.2 0 0 1 0-4.36V7.34H1.72a12 12 0 0 0 0 10.32l3.83-2.98Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.69 0 3.2.58 4.4 1.72l3.28-3.28A11.96 11.96 0 0 0 12 0 12 12 0 0 0 1.72 7.34l3.83 2.98C6.46 6.78 9 4.75 12 4.75Z"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#EDF0F5] p-6">
      <Suspense>
        <LoginCard />
      </Suspense>
    </main>
  );
}
