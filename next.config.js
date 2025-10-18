/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  eslint: {
    // Only run ESLint on these directories during production builds
    dirs: ['app', 'components', 'lib'],
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  
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
