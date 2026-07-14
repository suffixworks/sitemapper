-- =====================================================================
-- Sitemapper — schema + access control
-- Roles:  STAFF  = @suffix.works Supabase user (create/edit everything)
--         CLIENT = no account; opens a share link; can comment only
-- Run in Supabase SQL Editor. Then do the 2 DASHBOARD STEPS at the bottom.
-- =====================================================================
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- helper: is the current caller a @suffix.works user?
-- (email is a top-level claim in the Supabase access-token JWT)
-- ---------------------------------------------------------------------
create or replace function public.is_suffix()
returns boolean language sql stable as $$
  select lower(split_part(coalesce(auth.jwt() ->> 'email',''),'@',2)) = 'suffix.works'
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- =====================================================================
-- 1. sitemaps  (one JSONB doc per sitemap)
-- =====================================================================
create table if not exists public.sitemaps (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null default 'Untitled sitemap',
  data       jsonb not null default '{"rootId":null,"nodes":{}}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sitemaps_owner_idx on public.sitemaps(owner_id);
drop trigger if exists trg_sitemaps_updated_at on public.sitemaps;
create trigger trg_sitemaps_updated_at before update on public.sitemaps
  for each row execute procedure public.set_updated_at();

alter table public.sitemaps enable row level security;
-- STAFF team-shared: any @suffix.works user can do everything.
create policy "staff read"   on public.sitemaps for select to authenticated using ( public.is_suffix() );
create policy "staff insert" on public.sitemaps for insert to authenticated with check ( public.is_suffix() and owner_id = auth.uid() );
create policy "staff update" on public.sitemaps for update to authenticated using ( public.is_suffix() ) with check ( public.is_suffix() );
create policy "staff delete" on public.sitemaps for delete to authenticated using ( public.is_suffix() );
-- NOTE: guests never read sitemaps via RLS — they go through a server
-- route that validates the share token with the service-role key.

-- =====================================================================
-- 2. sitemap_shares  (tokened links staff hand to clients)
-- =====================================================================
create table if not exists public.sitemap_shares (
  id          uuid primary key default gen_random_uuid(),
  sitemap_id  uuid not null references public.sitemaps(id) on delete cascade,
  token       text not null unique default encode(gen_random_bytes(16),'hex'),
  permission  text not null default 'comment' check (permission in ('view','comment')),
  created_by  uuid references auth.users(id),
  expires_at  timestamptz,           -- null = never
  revoked     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists shares_token_idx on public.sitemap_shares(token);
create index if not exists shares_sitemap_idx on public.sitemap_shares(sitemap_id);

alter table public.sitemap_shares enable row level security;
-- Only staff manage links. Guests never touch this table directly.
create policy "staff manage shares" on public.sitemap_shares
  for all to authenticated using ( public.is_suffix() ) with check ( public.is_suffix() );

-- =====================================================================
-- 3. comments  (on a node OR the whole sitemap; supports replies+resolve)
-- =====================================================================
create table if not exists public.comments (
  id           uuid primary key default gen_random_uuid(),
  sitemap_id   uuid not null references public.sitemaps(id) on delete cascade,
  node_id      text,                 -- null = comment on the whole sitemap
  parent_id    uuid references public.comments(id) on delete cascade, -- reply thread
  body         text not null check (char_length(body) between 1 and 4000),
  author_id    uuid references auth.users(id),  -- set when a staff member comments
  author_name  text not null,
  author_email text,
  is_staff     boolean not null default false,
  resolved     boolean not null default false,
  resolved_by  uuid references auth.users(id),
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists comments_sitemap_idx on public.comments(sitemap_id);
create index if not exists comments_node_idx on public.comments(sitemap_id, node_id);

alter table public.comments enable row level security;
-- Staff: full access via RLS. Guests: write/read via the server route only.
create policy "staff read comments"   on public.comments for select to authenticated using ( public.is_suffix() );
create policy "staff write comments"  on public.comments for insert to authenticated with check ( public.is_suffix() );
create policy "staff update comments" on public.comments for update to authenticated using ( public.is_suffix() ) with check ( public.is_suffix() );
create policy "staff delete comments" on public.comments for delete to authenticated using ( public.is_suffix() );

-- =====================================================================
-- 4. Signup gate — Before User Created hook (blocks non-@suffix.works)
-- =====================================================================
create or replace function public.restrict_signup_to_suffix(event jsonb)
returns jsonb language plpgsql as $$
declare email text := event -> 'user' ->> 'email';
begin
  if email is null or lower(split_part(email,'@',2)) <> 'suffix.works' then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', 'ใช้ได้เฉพาะอีเมล @suffix.works เท่านั้น'));
  end if;
  return '{}'::jsonb;  -- allow
end $$;
grant execute on function public.restrict_signup_to_suffix to supabase_auth_admin;
revoke execute on function public.restrict_signup_to_suffix from authenticated, anon, public;

-- =====================================================================
-- DASHBOARD STEPS (cannot be done in SQL):
-- 1) Authentication > Providers > Google: enable, paste OAuth client id/secret.
-- 2) Authentication > Hooks > "Before User Created": enable, type = Postgres,
--    function = public.restrict_signup_to_suffix
--
-- SERVER-ONLY: guest comment routes use SUPABASE_SERVICE_ROLE_KEY. Keep it in
-- server env only — NEVER expose it to the browser.
-- =====================================================================
