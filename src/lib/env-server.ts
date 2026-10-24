import { getCloudflareContext } from "@opennextjs/cloudflare"

/**
 * Lee una variable de entorno del servidor. En Cloudflare Workers los
 * secretos viven en el contexto de la petición, no en process.env, así que
 * se consulta primero ahí. Solo para código de servidor.
 */
export function serverEnv(name: string): string | undefined {
  try {
    const v = (getCloudflareContext().env as Record<string, unknown>)?.[name]
    if (typeof v === "string" && v) return v
  } catch {}
  return process.env[name] || undefined
}
