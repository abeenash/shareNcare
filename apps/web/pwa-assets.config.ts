import { defineConfig } from "@vite-pwa/assets-generator/config";

const NAVY = "#0b1220";

export default defineConfig({
  preset: {
    transparent: { sizes: [192, 512], favicons: [] },
    maskable: { sizes: [512], padding: 0.1, resizeOptions: { background: NAVY } },
    apple: { sizes: [180], padding: 0.1, resizeOptions: { background: NAVY } },
  },
  images: ["public/app-icon.svg"],
});
