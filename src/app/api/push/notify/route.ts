import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { serverEnv } from "@/lib/env-server"
import { cuentaServicio, enviarFcm } from "@/lib/fcm-server"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Envía una notificación push a uno o varios usuarios con Firebase Cloud
 * Messaging. Requiere sesión. Los tokens de los destinatarios se leen con la
 * clave service_role porque RLS solo deja ver el propio.
 */
export async function POST(request: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const cuenta = cuentaServicio()
  const supabaseUrl = serverEnv("NEXT_PUBLIC_SUPABASE_URL")
  const serviceKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY")
  const motivos: string[] = []
  if (!cuenta.sa) motivos.push(cuenta.motivo)
  if (!supabaseUrl) motivos.push("NEXT_PUBLIC_SUPABASE_URL no está definido")
  if (!serviceKey) motivos.push("SUPABASE_SERVICE_ROLE_KEY no está definido en Variables and Secrets")
  if (!cuenta.sa || !supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Push no configurado", motivos }, { status: 503 })
  }
  const sa = cuenta.sa

  const body = await request.json().catch(() => null)
  const userIds: unknown = body?.userIds
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : ""
  const text = typeof body?.body === "string" ? body.body.trim().slice(0, 400) : ""
  const path = typeof body?.path === "string" && body.path.startsWith("/") && !body.path.startsWith("//")
    ? body.path : "/dashboard"

  if (!Array.isArray(userIds) || !userIds.length || userIds.length > 50 || !userIds.every(id => typeof id === "string" && UUID.test(id)) || !title) {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 })
  }

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  const q = `${supabaseUrl}/rest/v1/push_subscriptions?select=usuario_id,subscription&usuario_id=in.(${userIds.join(",")})`
  const subs = await fetch(q, { headers }).then(r => r.ok ? r.json() : []).catch(() => []) as { usuario_id: string; subscription: string }[]
  if (!subs.length) return NextResponse.json({ ok: true, enviados: 0 })

  const mensaje = { title, body: text, url: request.nextUrl.origin + path }
  let enviados = 0
  const invalidos: string[] = []
  await Promise.all(subs.map(async s => {
    try {
      const r = await enviarFcm(sa, s.subscription, mensaje)
      if (r === "ok") enviados++
      else if (r === "token_invalido") invalidos.push(s.usuario_id)
    } catch {}
  }))

  // Suscripciones que FCM ya no reconoce (app desinstalada, permiso revocado)
  if (invalidos.length) {
    await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?usuario_id=in.(${invalidos.join(",")})`, { method: "DELETE", headers }).catch(() => {})
  }

  return NextResponse.json({ ok: true, enviados })
}
