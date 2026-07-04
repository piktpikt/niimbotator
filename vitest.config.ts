import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Vitest runs the pure logic / engine / store proofs in a DOM-free Node env.
// Rendering (Fabric/canvas) and UI are proven in the browser via the preview server,
// not here (node-canvas is intentionally uninstalled — see package.json overrides).
export default defineConfig({
  resolve: {
    alias: { $: resolve(__dirname, "./src") },
  },
  define: {
    __APP_VERSION__: JSON.stringify("test"),
    __APP_COMMIT__: JSON.stringify("test"),
    __BUILD_DATE__: JSON.stringify("test"),
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
