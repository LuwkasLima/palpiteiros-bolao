/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow importing TS source directly from the workspace contracts package.
  transpilePackages: ["@bolao/contracts"],

  // In production the API is a separate Vercel deployment. We proxy /api/* to it so the
  // browser only ever talks to the web origin — keeping the session cookie first-party
  // (SameSite=Lax). The /api prefix is stripped so FastAPI's unprefixed routes match.
  // Only active when API_ORIGIN is set; local dev calls the API directly instead.
  async rewrites() {
    const apiOrigin = process.env.API_ORIGIN;
    if (!apiOrigin) return [];
    return [{ source: "/api/:path*", destination: `${apiOrigin}/:path*` }];
  },
};

export default nextConfig;
