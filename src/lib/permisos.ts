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

/** True si el rol puede crear usuarios con el rol indicado */
export function puedeAsignarRol(rolActual?: string | null, rolNuevo?: string | null): boolean {
  if (esDemo(rolActual) && rolNuevo === "admin") return false
  return true
}

/** Mensaje estándar para mostrar en toast cuando se bloquea */
export const MSG_DEMO_BLOQUEADO = "⚠ Modo demo: esta acción no está permitida para usuarios invitados"

