/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
  readonly hot?: {
    accept: (cb: (mod: unknown) => void) => void;
    dispose: (cb: (data: unknown) => void) => void;
    decline: () => void;
    invalidate: () => void;
    data: Record<string, unknown>;
  };
}
