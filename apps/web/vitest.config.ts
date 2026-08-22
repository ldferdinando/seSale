import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // api-client.ts resuelve las requests contra window.location.origin
    // (ver Etapa 9f — proxy same-origin al backend). Fijamos acá el mismo
    // origen que usan los mocks de MSW (http://localhost:8000) para que
    // esa resolución relativa siga apuntando donde los tests esperan.
    environmentOptions: {
      jsdom: { url: "http://localhost:8000" },
    },
    globals: true,
    testTimeout: 15000,
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.tsx", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
