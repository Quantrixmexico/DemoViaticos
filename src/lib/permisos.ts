// ════════════════════════════════════════════════════════════════════
//  Helpers de permisos — rol "demo" (invitado)
// ════════════════════════════════════════════════════════════════════

export const ROL_DEMO = "demo"

/** True si el rol es de solo lectura para acciones destructivas */
export function esDemo(rol?: string | null): boolean {
  return rol === ROL_DEMO
}

/** True si el rol puede borrar/desactivar registros */
export function puedeBorrar(rol?: string | null): boolean {
  return !esDemo(rol)
}

/** True si el rol puede cambiar contraseñas de otros usuarios */
export function puedeResetearPassword(rol?: string | null): boolean {
  return rol === "admin"
}

/** True si el rol puede crear usuarios con el rol indicado (el servidor aplica la misma regla) */
export function puedeAsignarRol(rolActual?: string | null, rolNuevo?: string | null): boolean {
  if (esDemo(rolActual)) return rolNuevo === "usuario"
  return true
}

/** Roles que el usuario actual puede asignar al dar de alta o editar */
export function rolesAsignables(rolActual?: string | null, todos: readonly string[] = ROLES): string[] {
  return todos.filter(r => puedeAsignarRol(rolActual, r))
}

export const ROLES = ["usuario", "gerente", "tesoreria", "contador", "admin", "demo"] as const

/** Mensaje estándar para mostrar en toast cuando se bloquea */
export const MSG_DEMO_BLOQUEADO = "Modo demo: esta acción no está permitida para usuarios invitados"

