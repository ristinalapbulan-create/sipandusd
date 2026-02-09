import type { NextConfig } from "next";

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
  allowedDevOrigins: ['fb0fea80a1f08c00-114-123-36-102.serveousercontent.com'],
};

export default nextConfig;
