declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;

interface ImportMetaEnv {
  readonly VITE_TTS_URL?: string;
  readonly VITE_TTS_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
