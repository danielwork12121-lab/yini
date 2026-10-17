import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Cache Components is on by default in Next 16. Every page here is per-user and
  // auth-gated, so there is nothing to prefetch or cache, and leaving it on just
  // forces Suspense boundaries and bans route-segment config for no benefit.
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    rules: {
      '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' },
    },
  },
};

export default nextConfig;
