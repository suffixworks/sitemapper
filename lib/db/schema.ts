// Drizzle schema — canonical mirror of lib/db/schema.sql.
// Auth.js (NextAuth v5) owns user/account/session/verificationToken via its
// Drizzle adapter. App tables: sitemaps / sitemap_shares / comments.
// No RLS — access is enforced in the Next.js server layer.

import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import type { SitemapDoc } from "@/lib/tree";

// ---------------------------------------------------------------------------
// Auth.js adapter tables
// ---------------------------------------------------------------------------
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// ---------------------------------------------------------------------------
// App tables (mirror schema.sql)
// ---------------------------------------------------------------------------
export const sitemaps = pgTable(
  "sitemaps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(), // Auth.js user id (creator)
    name: text("name").notNull().default("Untitled sitemap"),
    data: jsonb("data")
      .$type<SitemapDoc>()
      .notNull()
      .default({ rootId: null, nodes: {} }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("sitemaps_owner_idx").on(t.ownerId)],
);

export const sitemapShares = pgTable(
  "sitemap_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sitemapId: uuid("sitemap_id")
      .notNull()
      .references(() => sitemaps.id, { onDelete: "cascade" }),
    token: text("token")
      .notNull()
      .unique()
      .$defaultFn(() => crypto.randomUUID().replace(/-/g, "")),
    permission: text("permission", { enum: ["view", "comment"] })
      .notNull()
      .default("comment"),
    createdBy: text("created_by"), // Auth.js user id
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revoked: boolean("revoked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("shares_token_idx").on(t.token),
    index("shares_sitemap_idx").on(t.sitemapId),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sitemapId: uuid("sitemap_id")
      .notNull()
      .references(() => sitemaps.id, { onDelete: "cascade" }),
    nodeId: text("node_id"), // null = comment on the whole sitemap
    parentId: uuid("parent_id").references((): AnyPgColumn => comments.id, {
      onDelete: "cascade",
    }),
    body: text("body").notNull(),
    authorId: text("author_id"), // Auth.js user id (staff comment)
    authorName: text("author_name").notNull(),
    authorEmail: text("author_email"),
    isStaff: boolean("is_staff").notNull().default(false),
    resolved: boolean("resolved").notNull().default(false),
    resolvedBy: text("resolved_by"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("comments_sitemap_idx").on(t.sitemapId),
    index("comments_node_idx").on(t.sitemapId, t.nodeId),
  ],
);

// Note: `char_length(body) between 1 and 4000` from schema.sql is enforced in
// the app layer (server routes/actions), not as a DB check constraint here.
