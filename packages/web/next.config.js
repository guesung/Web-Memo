/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
