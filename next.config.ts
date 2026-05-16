import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow next/image to optimise images served from Supabase Storage.
    // Add another entry here if you start hosting images on a new domain.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ojxmpejjvwfaxtlmcnuq.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
    // Modern formats: next/image will serve WebP/AVIF when the browser
    // supports them. Older formats fall back automatically.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
