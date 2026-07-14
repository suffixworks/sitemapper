import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// Enables the Cloudflare bindings (getCloudflareContext) during `next dev`.
// Safe no-op outside the OpenNext Cloudflare context.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
