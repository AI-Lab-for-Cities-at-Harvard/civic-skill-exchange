import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";


// GitHub Pages serves this repo under /civic-skill-exchange/, so every asset
// URL needs that prefix in a production build. Dev and tests run at the root.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/civic-skill-exchange/" : "/",
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
}));
