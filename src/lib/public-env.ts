/**
 * Variables públicas (NEXT_PUBLIC_*) disponibles en el navegador.
 *
 * Next las incrusta al compilar solo si existen en el entorno del build. En
 * Cloudflare Workers Builds no siempre es así, por eso el servidor también las
 * expone en tiempo de ejecución en /env.js (window.__ENV), que el navegador
 * carga antes de hidratar. Orden de lectura: window.__ENV → valor incrustado.
 */
export const PUBLIC_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_VAPID_KEY",
] as const

export type PublicEnvKey = (typeof PUBLIC_ENV_KEYS)[number]

declare global {
  interface Window { __ENV?: Partial<Record<PublicEnvKey, string>> }
}

// Acceso con el nombre literal para que Next pueda incrustarlo cuando el build lo tenga.
const INCRUSTADO: Record<PublicEnvKey, string | undefined> = {
  NEXT_PUBLIC_SUPABASE_URL:                 process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_FIREBASE_API_KEY:             process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:         process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID:          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID:              process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_VAPID_KEY:           process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
}

/** Valor de una variable pública, en navegador o en servidor. */
export function publicEnv(key: PublicEnvKey): string {
  if (typeof window !== "undefined") {
    const v = window.__ENV?.[key]
    if (v) return v
  }
  return INCRUSTADO[key] || ""
}
