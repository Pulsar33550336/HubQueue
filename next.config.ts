import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Allow images from any source since we are proxying from WebDAV
    unoptimized: true,
  },
};

export default nextConfig;
