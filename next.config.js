/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  
  webpack: (config) => {
    config.externals.push({
      'bufferutil': 'bufferutil',
      'utf-8-validate': 'utf-8-validate',
    })
    return config
  },
  
  experimental: {
    serverComponentsExternalPackages: ['prisma', '@prisma/client'],
  },
}

module.exports = nextConfig
