import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { serverEnv } from "@/lib/env-server"

/**
 * Guarda el token FCM del dispositivo para el usuario autenticado (nunca para otro).
 * Un dispositivo pertenece a una sola cuenta: si el mismo token estaba registrado
 * con otro usuario (otra sesión en el mismo teléfono), se le quita a ese usuario
 * para que no reciba avisos ajenos.
 */
export async function POST(request: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const token = typeof body?.token === "string" ? body.token.trim() : ""
  if (!token || token.length > 4096) return NextResponse.json({ error: "No token" }, { status: 400 })

  await quitarTokenDeOtros(token, user.id)

  const { error } = await sb.from("push_subscriptions").upsert(
    { usuario_id: user.id, subscription: token, updated_at: new Date().toISOString() },
    { onConflict: "usuario_id" }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

/** RLS solo deja tocar la fila propia, así que esto usa la clave service_role. */
async function quitarTokenDeOtros(token: string, usuarioId: string) {
  const supabaseUrl = serverEnv("NEXT_PUBLIC_SUPABASE_URL")
  const serviceKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceKey) return
  const q = `${supabaseUrl}/rest/v1/push_subscriptions?subscription=eq.${encodeURIComponent(token)}&usuario_id=neq.${usuarioId}`
  await fetch(q, {
    method: "DELETE",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  }).catch(() => {})
}
