/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STREAM_MODE: 'mock' | 'live'
  readonly VITE_STREAM_SYMBOLS: string
  readonly VITE_COINCAP_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
