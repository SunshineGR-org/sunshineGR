/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['avatars.githubusercontent.com', 'avatar.vercel.sh', 'lh3.googleusercontent.com']
  },
  experimental: {
    serverComponentsExternalPackages: ['@tremor/react'],
    serverActions: true
  },
  exclude: ['/magicsearch/']
};

module.exports = nextConfig;
