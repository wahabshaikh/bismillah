interface ImportMetaEnv {
  /** Origin of the API Worker. Defaults to the local `wrangler dev` URL. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
