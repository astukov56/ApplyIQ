import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/profile',
        destination: '/resume',
        permanent: true, // 308 – tells browsers & crawlers to update their links
      },
    ];
  },
};

export default nextConfig;
