// Drizzle client over Neon's serverless HTTP driver. Server-only.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// A syntactically valid placeholder keeps `import`ing this module from throwing
// when DATABASE_URL is unset (build / no env). Real queries need the real URL.
const connectionString =
  process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/db";

export const db = drizzle(neon(connectionString), { schema });
