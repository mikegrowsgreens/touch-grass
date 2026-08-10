import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Mirror tsconfig's "@/*" alias so tests can load app/ modules (API routes).
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
});
