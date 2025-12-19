import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/**",
      },
    ],
    unoptimized: true, // Отключает оптимизацию Next.js для TMDB изображений
  },
};

export default nextConfig;