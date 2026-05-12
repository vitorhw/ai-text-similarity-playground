/** @type {import('next').NextConfig} */
const nextConfig = {
  // No ESLint config ships with this template; skip linting during `next build`.
  eslint: { ignoreDuringBuilds: true },
  images: { unoptimized: true },
}

export default nextConfig
