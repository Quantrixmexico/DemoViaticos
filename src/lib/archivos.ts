import type { SupabaseClient } from "@supabase/supabase-js"

/** Bucket privado donde viven PDF, XML e imágenes de los comprobantes. */
export const BUCKET_COMPROBANTES = "comprobantes"

const URL_STORAGE = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/comprobantes\/([^?#]+)/

/**
 * Convierte lo guardado en comprobantes_cfdi.archivo_url a la ruta dentro del bucket.
 * Acepta la ruta directa (filas nuevas) o la URL pública antigua (filas previas al
 * bucket privado). Devuelve null si no apunta a nuestro bucket.
 */
export function rutaArchivo(ref: string | null | undefined): string | null {
  if (!ref) return null
  const m = ref.match(URL_STORAGE)
  if (m) { try { return decodeURIComponent(m[1]) } catch { return m[1] } }
  if (/^https?:\/\//i.test(ref)) return null
  return ref.replace(/^\/+/, "")
}

/** URL firmada y temporal para abrir o descargar un archivo del bucket. */
export async function urlFirmada(sb: SupabaseClient, ref: string | null | undefined, segundos = 600): Promise<string | null> {
  const ruta = rutaArchivo(ref)
  if (!ruta) return null
  const { data } = await sb.storage.from(BUCKET_COMPROBANTES).createSignedUrl(ruta, segundos)
  return data?.signedUrl ?? null
}

/** URLs firmadas para varios archivos a la vez. Clave: la referencia original. */
export async function urlsFirmadas(sb: SupabaseClient, refs: (string | null | undefined)[], segundos = 3600): Promise<Map<string, string>> {
  const pares = refs.flatMap(r => { const ruta = rutaArchivo(r); return r && ruta ? [[r, ruta] as const] : [] })
  const out = new Map<string, string>()
  if (!pares.length) return out
  const { data } = await sb.storage.from(BUCKET_COMPROBANTES).createSignedUrls(pares.map(p => p[1]), segundos)
  data?.forEach((d, i) => { if (d.signedUrl) out.set(pares[i][0], d.signedUrl) })
  return out
}
