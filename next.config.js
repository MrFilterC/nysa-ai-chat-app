/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['rbxevkgabanoluykkbls.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

module.exports = nextConfig; 