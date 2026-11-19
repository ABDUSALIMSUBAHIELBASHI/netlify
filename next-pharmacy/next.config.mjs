/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.PHARMACY_NEXT_DIST_DIR || ".next",
  allowedDevOrigins: ["192.168.1.167", "127.0.0.1", "localhost"],
};

export default nextConfig;
