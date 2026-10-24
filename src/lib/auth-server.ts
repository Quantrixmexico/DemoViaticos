import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

/** Roles que pueden entrar a cada área. Debe coincidir con NAV_BY_ROL en AppShell. */
export const AREA_ROLES = {
  admin:     ["admin", "demo"],
  gerente:   ["gerente", "admin", "demo"],
  tesoreria: ["tesoreria", "admin", "demo"],
  contador:  ["contador", "admin", "demo"],
  todas:     ["tesoreria", "contador", "admin", "demo"],
} as const

/**
 * Comprueba en el servidor que el usuario tiene uno de los roles indicados.
 * Si no hay sesión redirige a /login; si no tiene permiso, a /dashboard.
 */
export async function requireRol(roles: readonly string[]): Promise<string> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect("/login")
  const { data } = await sb.from("usuarios").select("rol").eq("id", user.id).single()
  const rol = data?.rol ?? ""
  if (!roles.includes(rol)) redirect("/dashboard")
  return rol
}
