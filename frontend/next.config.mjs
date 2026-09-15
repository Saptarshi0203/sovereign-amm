/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode for highlighting potential issues
  reactStrictMode: true,

  // SWC-based minification (faster than Terser)
  swcMinify: true,

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // Remove console.log statements in production builds
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Environment variables exposed to the browser
  // Define them in .env.local; they are validated at build time here
  env: {
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

export default nextConfig;
