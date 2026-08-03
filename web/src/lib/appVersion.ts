/**
 * Semantic version baked at build time.
 * On GitHub Pages: `major.minor` from package.json + `github.run_number` as patch.
 * Locally: `package.json` version with a `-local` suffix.
 */
export const APP_VERSION: string =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0-local";

/** Short commit SHA from the Pages deploy (for support / debugging). */
export const APP_COMMIT: string =
  typeof __APP_COMMIT__ !== "undefined" ? __APP_COMMIT__ : "local";
