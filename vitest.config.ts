import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.{test,spec}.ts", "src/**/*.{test,spec}.ts"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
  esbuild: {
    target: "node20",
  },
});
