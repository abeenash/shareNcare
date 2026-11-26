import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const NAVY = "#0b1220";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "SENTRY_");

  const uploadSourceMaps = Boolean(env.SENTRY_AUTH_TOKEN);

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "prompt",
        injectRegister: false,
        manifest: {
          id: "/",
          name: "ShareNCare",
          short_name: "ShareNCare",
          description: "Notes meant to be given.",
          start_url: "/",
          scope: "/",
          display: "standalone",
          background_color: NAVY,
          theme_color: NAVY,
          icons: [
            { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
            {
              src: "maskable-icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg}", "assets/*-latin-wght-normal-*.woff2"],
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api\//],
        },
      }),
      uploadSourceMaps &&
        sentryVitePlugin({
          org: env.SENTRY_ORG,
          project: env.SENTRY_PROJECT,
          authToken: env.SENTRY_AUTH_TOKEN,
          telemetry: false,
          sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
        }),
    ],
    build: {
      //"hidden"=> make the .map files, but don't point to them from the JavaScript.
      sourcemap: uploadSourceMaps ? "hidden" : false,
    },
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          ws: true,
        },
      },
    },
  };
});
