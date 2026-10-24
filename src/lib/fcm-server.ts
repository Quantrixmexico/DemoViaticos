import { serverEnv } from "@/lib/env-server"

/**
 * Envío de notificaciones push con la API HTTP v1 de Firebase Cloud Messaging.
 * Solo servidor. Necesita el secreto FIREBASE_SERVICE_ACCOUNT con el JSON de
 * una cuenta de servicio del proyecto (Firebase → Configuración → Cuentas de servicio).
 */

interface ServiceAccount { client_email: string; private_key: string; project_id: string }

let tokenCache: { value: string; exp: number } | null = null

function b64url(data: ArrayBuffer | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data)
  let bin = ""; bytes.forEach(b => { bin += String.fromCharCode(b) })
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out.buffer
}

/**
 * Lee FIREBASE_SERVICE_ACCOUNT. Acepta el JSON tal cual (en una o varias
 * líneas), envuelto en comillas, o codificado en base64. Devuelve la cuenta o
 * un motivo legible de por qué no sirve, sin revelar el contenido.
 */
export function cuentaServicio(): { sa: ServiceAccount } | { sa: null; motivo: string } {
  let raw = serverEnv("FIREBASE_SERVICE_ACCOUNT")?.trim() ?? ""
  if (!raw) return { sa: null, motivo: "FIREBASE_SERVICE_ACCOUNT no está definido en Variables and Secrets" }
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"') && !raw.startsWith('{"'))) raw = raw.slice(1, -1).trim()
  if (!raw.startsWith("{")) {
    try { raw = atob(raw.replace(/\s+/g, "")).trim() } catch { return { sa: null, motivo: `FIREBASE_SERVICE_ACCOUNT no es JSON ni base64 (empieza por "${raw.slice(0, 12)}")` } }
  }
  let sa: Partial<ServiceAccount> & { type?: string }
  try { sa = JSON.parse(raw) } catch {
    // Pegado con saltos de línea reales dentro de private_key: los escapamos y reintentamos.
    try { sa = JSON.parse(raw.replace(/"private_key"\s*:\s*"([\s\S]*?)"\s*(,|\})/, (_m, k: string, fin: string) => `"private_key":"${k.replace(/\r?\n/g, "\\n")}"${fin}`)) }
    catch { return { sa: null, motivo: `FIREBASE_SERVICE_ACCOUNT no es JSON válido (${raw.length} caracteres; empieza por "${raw.slice(0, 12)}"). Suele pasar al pegarlo en varias líneas: pégalo en una sola línea.` } }
  }
  const faltan = (["client_email", "private_key", "project_id"] as const).filter(k => !sa[k])
  if (faltan.length) return { sa: null, motivo: `FIREBASE_SERVICE_ACCOUNT no tiene ${faltan.join(", ")}. ¿Es el JSON de "Cuentas de servicio → Generar nueva clave privada"?` }
  if (!sa.private_key!.includes("BEGIN PRIVATE KEY")) return { sa: null, motivo: "private_key de FIREBASE_SERVICE_ACCOUNT no tiene el formato PEM esperado" }
  return { sa: sa as ServiceAccount }
}

/** Access token de Google (1 h) firmando un JWT RS256 con la cuenta de servicio. */
async function accessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (tokenCache && tokenCache.exp - 60 > now) return tokenCache.value

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const claims = b64url(JSON.stringify({
    iss: sa.client_email, sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    iat: now, exp: now + 3600,
  }))
  const key = await crypto.subtle.importKey("pkcs8", pemToPkcs8(sa.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"])
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`))
  const jwt = `${header}.${claims}.${b64url(sig)}`

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  })
  if (!res.ok) throw new Error(`Google OAuth ${res.status}`)
  const data = await res.json() as { access_token: string; expires_in: number }
  tokenCache = { value: data.access_token, exp: now + (data.expires_in || 3600) }
  return data.access_token
}

export interface PushMensaje { title: string; body: string; url: string }
export type ResultadoEnvio = "ok" | "token_invalido" | "error"

/** Envía un mensaje a un token FCM. "token_invalido" indica que hay que borrar la suscripción. */
export async function enviarFcm(sa: ServiceAccount, token: string, m: PushMensaje): Promise<ResultadoEnvio> {
  const auth = await accessToken(sa)
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        token,
        // La app en primer plano lee t/b/url de payload.data.
        data: { t: m.title, b: m.body, url: m.url },
        // Bloque de notificación explícito: Safari en iPhone solo muestra
        // avisos con este bloque; en Chrome/Android el SDK lo pinta solo.
        notification: { title: m.title, body: m.body },
        webpush: {
          headers: { Urgency: "high" },
          notification: { icon: "/icon-192.png", badge: "/icon-192.png" },
          fcm_options: { link: m.url },
        },
      },
    }),
  })
  if (res.ok) return "ok"
  const err = await res.json().catch(() => ({})) as { error?: { status?: string; details?: { errorCode?: string }[] } }
  const code = err.error?.details?.find(d => d.errorCode)?.errorCode || err.error?.status
  if (res.status === 404 || code === "UNREGISTERED" || code === "INVALID_ARGUMENT" || code === "NOT_FOUND") return "token_invalido"
  return "error"
}
