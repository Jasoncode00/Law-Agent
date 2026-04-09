import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /api/* 요청을 백엔드로 프록시
  // BACKEND_URL: Docker 환경에서는 'http://backend:8000', 로컬에서는 'http://localhost:8000'
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
