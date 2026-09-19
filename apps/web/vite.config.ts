import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  server: {
    // `wrangler dev` (API) runs on 8787. Same origin in production, proxied here.
    proxy: { "/api": "http://localhost:8787" },
  },
  build: { outDir: "dist", sourcemap: false },
});
