/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // new versions wait until the user taps "Update" (see UpdatePrompt)
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["icons/*.png"],
      manifest: {
        name: "स्वाद भोजनालय & नाश्ता हाऊस",
        short_name: "स्वाद",
        description: "Attendance, meals and payments for your mess",
        theme_color: "#B91C1C",
        background_color: "#FFF8F0",
        display: "standalone",
        start_url: "/",
        lang: "mr",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: { navigateFallbackDenylist: [/^\/api\//], importScripts: ["push-sw.js"] },
    }),
  ],
  server: {
    proxy: { "/api": { target: "http://localhost:8000", changeOrigin: true } },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
