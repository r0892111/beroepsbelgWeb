const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: false, // Enable Next.js image optimization for better performance
    formats: ['image/avif', 'image/webp'], // Use modern formats
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'rwrfobawfbfsggczofao.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'vgbujcuwptvheqijyjbe.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
  },
  // Enable compression
  compress: true,
  // Optimize production builds
  swcMinify: true,
};

module.exports = withNextIntl(nextConfig);
