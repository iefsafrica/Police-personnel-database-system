/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  webpack(config) {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { message: /There are multiple modules with names that only differ in casing/ },
    ];
    return config;
  },
};

module.exports = nextConfig;
