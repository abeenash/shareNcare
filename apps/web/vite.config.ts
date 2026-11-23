import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "SENTRY_");

  const uploadSourceMaps = Boolean(env.SENTRY_AUTH_TOKEN);

  return {
    plugins: [
      react(),
      tailwindcss(),
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
