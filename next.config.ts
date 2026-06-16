import type { NextConfig } from "next";

// [SETUP PWA] Menggunakan @ducanh2912/next-pwa
// Plugin ini bekerja lebih stabil dengan Next.js 15 dibandingkan 16
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  sw: "service-worker.js",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  
  // Konfigurasi Caching untuk Stabilitas
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: false,
  navigateFallback: null,
  
  // Exclude file build internal Next.js agar SW tidak bengkak
  buildExcludes: [
    /middleware-manifest\.json$/,
    /_middleware-manifest\.js$/,
    /_build-manifest\.js$/,
    /app-build-manifest\.json$/,
    /react-loadable-manifest\.json$/,
    /server\/.*/,
    /chunks\/.*/,
    /static\/.*/,
    /.*\.js\.map$/,
    /.*_rsc.*/, 
  ],

  workboxOptions: {
    disableDevLogs: true,
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    runtimeCaching: [
      // 1. Network Only untuk Internal Next.js & API
      {
        urlPattern: ({ url }: { url: URL }) => {
          return (
            url.pathname.startsWith('/_next/static/') ||
            url.pathname.startsWith('/_next/image') ||
            url.pathname.startsWith('/_next/data/') ||
            url.pathname.startsWith('/api/') ||
            url.search.includes('_rsc')
          );
        },
        handler: 'NetworkOnly',
        options: {
          cacheName: 'next-internal-no-cache',
          plugins: [{ handlerDidError: async () => Response.error() }],
        },
      },
      // 2. Firebase & Google Auth (Wajib Network Only)
      {
        urlPattern: /^https:\/\/(firebasestorage\.googleapis\.com|lh3\.googleusercontent\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com)\/.*/i,
        handler: "NetworkOnly",
        options: {
          cacheName: "firebase-network-only",
          plugins: [{ handlerDidError: async () => Response.error() }],
        },
      },
      // 3. Aset Statis (Cache First)
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico|css|js|woff2?)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-assets",
          expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  // Standalone mode diperlukan untuk deployment Firebase Functions/Hosting
  output: "standalone",
  
  // Optimasi Memori: Matikan Source Map di Produksi
  productionBrowserSourceMaps: false,
  
  // Matikan kompresi build (Firebase Hosting sudah melakukan gzip otomatis)
  compress: false,

  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },

  reactStrictMode: true,
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**', 
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**', 
      }
    ],
  },

  experimental: {
    scrollRestoration: true,
    // Tetap batasi CPU ke 1 agar proses build tidak memakan memori berlebih
    // Ini sangat membantu di environment dengan resource terbatas (seperti GitHub Actions / Cloud Build)
    cpus: 1,
    optimizePackageImports: ["lucide-react", "date-fns", "lodash"],
  }
};

export default withPWA(nextConfig);