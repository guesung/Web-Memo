/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAKE_WEBHOOK_NOTION_API: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
