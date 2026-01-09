/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_SUPABASE_SERVICE_ROLE_KEY?: string
  readonly VITE_EMAIL_SERVER_URL?: string
  readonly VITE_PHP_EMAIL_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
