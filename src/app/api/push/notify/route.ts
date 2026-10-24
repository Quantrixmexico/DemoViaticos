import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { serverEnv } from "@/lib/env-server"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Reenvía una notificación push al Worker de FCM. El secreto del Worker vive
 * solo aquí (PUSH_WORKER_SECRET), nunca en el navegador. Requiere sesión.
 */
export async function POST(request: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workerUrl = serverEnv("PUSH_WORKER_URL")
  const secret = serverEnv("PUSH_WORKER_SECRET")
  if (!workerUrl || !secret) {
    return NextResponse.json({ error: "Push no configurado" }, { status: 503 })
  }

  const body = await request.json().catch(() => null)
  const userIds: unknown = body?.userIds
  const title = typeof body?.title === "string" ? body.title.slice(0, 120) : ""
  const text = typeof body?.body === "string" ? body.body.slice(0, 400) : ""
  const path = typeof body?.path === "string" && body.path.startsWith("/") && !body.path.startsWith("//")
    ? body.path : "/dashboard"

  if (!Array.isArray(userIds) || !userIds.length || userIds.length > 50 || !userIds.every(id => typeof id === "string" && UUID.test(id)) || !title) {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 })
  }

  try {
    const r = await fetch(`${workerUrl.replace(/\/$/, "")}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ userIds, title, body: text, url: request.nextUrl.origin + path }),
    })
    return NextResponse.json({ ok: r.ok }, { status: r.ok ? 200 : 502 })
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 })
  }
}
