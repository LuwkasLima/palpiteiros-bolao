/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow importing TS source directly from the workspace contracts package.
  transpilePackages: ["@bolao/contracts"],
};

export default nextConfig;
