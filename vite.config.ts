import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

const rawPort = process.env.PORT ? Number(process.env.PORT) : 4173;
const port = Number.isNaN(rawPort) || rawPort <= 0 ? 4173 : rawPort;

export default defineConfig({
  root: path.resolve(import.meta.dirname, "client"),
  envDir: path.resolve(import.meta.dirname),
  base: "/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Student Hostel Leave Management',
        short_name: 'Hostel Leave',
        description: 'Student Hostel Leave Management System — apply for leave, gate passes, and warden approvals.',
        theme_color: '#1E3A5F',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client/src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    fs: { strict: false },
  },
  preview: {
    port,
    host: "0.0.0.0",
  },
});
