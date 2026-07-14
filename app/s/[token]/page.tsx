import { Link2Off } from "lucide-react";
import { validateShareToken } from "@/lib/share";
import { GuestView } from "@/components/guest/GuestView";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function GuestSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const share = await validateShareToken(token);

  if (!share) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#EDF0F5] p-6">
        <div className="w-full max-w-[360px] rounded-2xl border border-[#E1E6EF] bg-white px-8 py-9 text-center shadow-[0_8px_30px_rgba(20,30,60,.12)]">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[14px] bg-[#F2F3F8]">
            <Link2Off className="h-7 w-7 text-[#7A8496]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1B2130]">Link unavailable</h1>
          <p className="mx-auto mt-2 max-w-[280px] text-[13.5px] leading-relaxed text-[#7A8496]">
            This share link has been revoked or has expired. Ask whoever shared it for a
            new one.
          </p>
        </div>
      </main>
    );
  }

  return <GuestView name={share.name} doc={share.data} permission={share.permission} />;
}
