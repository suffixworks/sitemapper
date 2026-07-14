// Server-only: validate a share token (exists / not revoked / not expired) and
// resolve it to the share row + sitemap via Drizzle. Guests never touch the DB
// directly — every guest action goes through a server route that calls this.
// TODO(Phase 4): implement validateShareToken().
export {};
