import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: root },
      // "server-only" throws outside a React server build; in tests it is a no-op.
      { find: "server-only", replacement: `${root}tests/stubs/empty.js` },
    ],
  },
  test: { include: ["tests/**/*.test.js"] },
});
