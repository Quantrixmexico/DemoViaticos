import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/** Guarda el token FCM del dispositivo para el usuario autenticado (nunca para otro). */
export async function POST(request: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const token = typeof body?.token === "string" ? body.token.trim() : ""
  if (!token || token.length > 4096) return NextResponse.json({ error: "No token" }, { status: 400 })

  const { error } = await sb.from("push_subscriptions").upsert(
    { usuario_id: user.id, subscription: token, updated_at: new Date().toISOString() },
    { onConflict: "usuario_id" }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
