"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SitemapDoc } from "@/lib/tree";

function homeSeed(): SitemapDoc {
  const rootId = globalThis.crypto.randomUUID();
  return {
    rootId,
    nodes: {
      [rootId]: {
        id: rootId,
        title: "Home",
        slug: "/",
        parentId: null,
        children: [],
        color: null,
        collapsed: false,
      },
    },
  };
}

export async function createSitemap() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("sitemaps")
    .insert({ owner_id: user.id, name: "Untitled sitemap", data: homeSeed() })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create sitemap");
  redirect(`/editor/${data.id}`);
}

export async function duplicateSitemap(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: src, error: readErr } = await supabase
    .from("sitemaps")
    .select("name, data")
    .eq("id", id)
    .single();
  if (readErr || !src) throw new Error(readErr?.message ?? "Sitemap not found");

  const { error } = await supabase
    .from("sitemaps")
    .insert({ owner_id: user.id, name: `${src.name} copy`, data: src.data });
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function renameSitemap(id: string, name: string) {
  const supabase = await createClient();
  const trimmed = name.trim() || "Untitled sitemap";
  const { error } = await supabase.from("sitemaps").update({ name: trimmed }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function deleteSitemap(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("sitemaps").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
