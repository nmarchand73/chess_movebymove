import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
) as { version: string };

/** Prefer CI-injected semver; local builds use package.json + `-local`. */
const version = process.env.APP_VERSION?.trim() || `${pkg.version}-local`;
const commit = (process.env.APP_COMMIT?.trim() || "local").slice(0, 7);

// https://vite.dev/config/
export default defineConfig({
  base: "/chess_movebymove/",
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_COMMIT__: JSON.stringify(commit),
  },
});
