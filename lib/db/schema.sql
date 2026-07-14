-- =====================================================================
-- Sitemapper — database schema (Neon Postgres)
-- Auth.js owns the users/accounts/sessions tables (via its Drizzle adapter).
-- Access control is enforced in the Next.js SERVER layer, not in the DB:
--   • staff = valid Auth.js session (sign-in already gated to @suffix.works)
--   • guest = valid, non-revoked, non-expired share token ('comment' to write)
-- No RLS. The browser never connects to Neon directly.
-- Mirror this in Drizzle (db/schema.ts) and run with drizzle-kit.
-- =====================================================================
create extension if not exists "pgcrypto";

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- 1. sitemaps (one JSONB doc per sitemap)
create table if not exists sitemaps (
  id         uuid primary key default gen_random_uuid(),
  owner_id   text not null,               -- Auth.js user id (creator)
  name       text not null default 'Untitled sitemap',
  data       jsonb not null default '{"rootId":null,"nodes":{}}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sitemaps_owner_idx on sitemaps(owner_id);
drop trigger if exists trg_sitemaps_updated_at on sitemaps;
create trigger trg_sitemaps_updated_at before update on sitemaps
  for each row execute procedure set_updated_at();

-- 2. sitemap_shares (tokened links staff hand to clients)
create table if not exists sitemap_shares (
  id         uuid primary key default gen_random_uuid(),
  sitemap_id uuid not null references sitemaps(id) on delete cascade,
  token      text not null unique default encode(gen_random_bytes(16),'hex'),
  permission text not null default 'comment' check (permission in ('view','comment')),
  created_by text,                          -- Auth.js user id
  expires_at timestamptz,                   -- null = never
  revoked    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists shares_token_idx on sitemap_shares(token);
create index if not exists shares_sitemap_idx on sitemap_shares(sitemap_id);

-- 3. comments (node-level or whole-sitemap; replies + resolve)
create table if not exists comments (
  id           uuid primary key default gen_random_uuid(),
  sitemap_id   uuid not null references sitemaps(id) on delete cascade,
  node_id      text,                        -- null = comment on the whole sitemap
  parent_id    uuid references comments(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 4000),
  author_id    text,                        -- Auth.js user id (staff comment)
  author_name  text not null,
  author_email text,
  is_staff     boolean not null default false,
  resolved     boolean not null default false,
  resolved_by  text,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists comments_sitemap_idx on comments(sitemap_id);
create index if not exists comments_node_idx on comments(sitemap_id, node_id);
