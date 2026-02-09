import type { NextConfig } from "next";

// Force reload env vars
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
    ],
  },
  // Allow local tunnel domain for demo access
  experimental: {
    serverActions: {
      allowedOrigins: ['fb0fea80a1f08c00-114-123-36-102.serveousercontent.com', 'localhost:3000'],
    },
  },
  // Allow development access from tunnel
  // allowedDevOrigins: ['fb0fea80a1f08c00-114-123-36-102.serveousercontent.com'], -- Removed for Vercel build

  // Vercel handles firebase-admin automatically usually, but keeping serverExternalPackages is fine if needed
  serverExternalPackages: ['firebase-admin'],
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
