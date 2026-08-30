import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";


// GitHub Pages serves this repo under /civic-skill-exchange/, so every asset
// URL needs that prefix in a production build. Dev and tests run at the root.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/civic-skill-exchange/" : "/",
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true },
  test: {
    // jsdom, not node: the lib/ tests are pure and run either way, but the
    // component tests need a DOM. Still a Node process, so the tests that read
    // registry/ off disk are unaffected.
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
  },
}));
