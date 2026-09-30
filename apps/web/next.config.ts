import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // The browser only talks to this origin; /api is proxied to NestJS so the
  // session cookie stays first-party.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
  // Dev only: lets http://127.0.0.1:3000 load dev assets (useful for testing
  // how the site behaves when the Google key rejects an unlisted host).
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    // The repo currently lives on an NTFS volume, where the dev cache's
    // rapid atomic renames fail (EBADF). Re-enable on APFS/ext4 for faster restarts.
    turbopackFileSystemCacheForDev: process.env.NEXT_DEV_FS_CACHE === "1",
  },
};

export default nextConfig;
