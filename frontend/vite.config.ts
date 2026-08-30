import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    tailwindcss(),
    viteReact(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "../public",
    emptyOutDir: true,
  },
  server: {
    port: 8080,
  },
});

