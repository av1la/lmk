/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['tsyringe'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src')
    };
    return config;
  }
};

module.exports = nextConfig;