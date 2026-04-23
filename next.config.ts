import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/img/:path*",
        destination: "https://storage.googleapis.com/colemans-ai-database.firebasestorage.app/:path*",
      },
    ];
  },
};

export default nextConfig;
