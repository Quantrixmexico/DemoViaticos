// ════════════════════════════════════════════════════════════════════
//  API route para operaciones administrativas de usuarios
//  Se ejecuta como Cloudflare Pages Function.
//  Usa SUPABASE_SERVICE_ROLE_KEY (server-only) para operaciones admin.
// ════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "edge"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function iniciales(nombre: string): string {
  return (nombre || "")
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3)
}

async function requireAdmin() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: "No autenticado", status: 401 as const }
  const { data: profile } = await sb.from("usuarios").select("rol").eq("id", user.id).single()
  if (profile?.rol !== "admin") return { error: "No autorizado", status: 403 as const }
  return { ok: true }
}

async function createUserAction(body: any) {
  const { nombre, correo, password, rol, centro_id, gerente_id, division } = body
  if (!correo || !password || !nombre || !rol) {
    return { error: "Faltan campos: nombre, correo, password, rol", status: 400 as const }
  }

  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY!,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: correo,
      password,
      email_confirm: true,
      user_metadata: { nombre },
    }),
  })

  const authData: any = await authRes.json()
  if (!authRes.ok) {
    return {
      error: authData.msg || authData.error_description || authData.error || JSON.stringify(authData),
      status: authRes.status as any,
    }
  }

  const userId = authData.id

  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY!,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      id: userId,
      nombre,
      iniciales: iniciales(nombre),
      correo,
      rol,
      centro_id: centro_id || null,
      gerente_id: gerente_id || null,
      division: division || null,
      activo: true,
    }),
  })

  if (!profileRes.ok) {
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: { apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY}` },
    })
    const err: any = await profileRes.json()
    return { error: err.message || JSON.stringify(err), status: 400 as const }
  }

  return { success: true, userId }
}

async function resetPasswordAction(body: any) {
  const { userId, newPassword } = body
  if (!userId || !newPassword) return { error: "Falta userId o newPassword", status: 400 as const }
  if (newPassword.length < 6) return { error: "Mínimo 6 caracteres", status: 400 as const }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      apikey: SERVICE_KEY!,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password: newPassword }),
  })

  if (!res.ok) {
    const err: any = await res.json()
    return { error: err.msg || JSON.stringify(err), status: res.status as any }
  }
  return { success: true }
}

async function deleteUserAction(body: any) {
  const { userId } = body
  if (!userId) return { error: "Falta userId", status: 400 as const }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY}` },
  })

  if (!res.ok) {
    const err: any = await res.json()
    return { error: err.msg || JSON.stringify(err), status: res.status as any }
  }
  return { success: true }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params

  if (!SERVICE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY no configurada en el servidor" },
      { status: 500 }
    )
  }

  const authCheck = await requireAdmin()
  if ("error" in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
  }

  const body = await req.json().catch(() => ({}))

  let result: any
  switch (action) {
    case "createUser":    result = await createUserAction(body); break
    case "resetPassword": result = await resetPasswordAction(body); break
    case "deleteUser":    result = await deleteUserAction(body); break
    default: return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }

  const status = "error" in result ? (result.status || 500) : 200
  return NextResponse.json(result, { status })
}
