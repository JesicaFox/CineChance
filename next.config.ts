// next.config.ts
import type { NextConfig } from "next";
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 85],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "assets.fanart.tv",
        pathname: "/**",
      },
    ],
  },

  experimental: {
    serverActions: {
      // Разрешаем Server Actions с preview-доменов GitHub Codespaces
      allowedOrigins: [
        'localhost:3000',
        '*.app.github.dev',
        '*.github.dev',
      ],
    },
  },
};

export default withBundleAnalyzer(nextConfig);