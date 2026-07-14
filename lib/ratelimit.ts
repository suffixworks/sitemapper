// Guest comment rate limit. Uses Upstash when configured; otherwise allows
// (so local dev works without Upstash). Server-only.
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const limiter =
  url && token
    ? new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(5, "60 s"),
        prefix: "sitemapper:comments",
      })
    : null;

export async function guestRateLimit(key: string): Promise<boolean> {
  if (!limiter) return true;
  const { success } = await limiter.limit(key);
  return success;
}
