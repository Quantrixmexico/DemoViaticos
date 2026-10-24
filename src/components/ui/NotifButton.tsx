"use client"
import { useState, useEffect } from "react"
import { triggerNotifSetup } from "@/components/ui/PushNotifications"
import { Bell, BellOff, BellRing } from "lucide-react"
import { pushDisponible } from "@/lib/firebase-public"

type Perm = "default" | "granted" | "denied" | "unsupported"

/** Estado de las notificaciones push de este dispositivo y botón para activarlas. */
export function NotifButton() {
  const [perm, setPerm] = useState<Perm>("default")

  useEffect(() => {
    // Lee el permiso del navegador al montar; cambia solo por acción del usuario
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPerm(pushDisponible() && "Notification" in window ? (Notification.permission as Perm) : "unsupported")
  }, [])

  const handleClick = () => {
    localStorage.removeItem("notif-status") // permite volver a mostrar el aviso
    triggerNotifSetup()
  }

  const estado = {
    granted:     { icon: BellRing, tone: "var(--success)", soft: "var(--success-soft)", titulo: "Activadas en este dispositivo", texto: "Te avisamos al autorizar, liberar o devolver una solicitud." },
    denied:      { icon: BellOff,  tone: "var(--danger)",  soft: "var(--danger-soft)",  titulo: "Bloqueadas por el navegador",  texto: "Habilítalas en los ajustes del sitio y vuelve a esta pantalla." },
    default:     { icon: Bell,     tone: "var(--text-2)",  soft: "var(--surface-2)",    titulo: "Sin activar",                  texto: "Recibe alertas aunque la app esté cerrada." },
    unsupported: { icon: BellOff,  tone: "var(--text-3)",  soft: "var(--surface-2)",    titulo: "No disponibles aquí",          texto: pushDisponible() ? "Este navegador no admite notificaciones push." : "Las notificaciones push no están configuradas en este sistema." },
  }[perm]
  const Icon = estado.icon

  return (
    <div className="spread" style={{ gap: 12, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <span style={{ width: 36, height: 36, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0, background: estado.soft, color: estado.tone }}>
          <Icon size={17} strokeWidth={1.75}/>
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{estado.titulo}</div>
          <div style={{ fontSize: 13, color: "var(--text-2)" }}>{estado.texto}</div>
        </div>
      </div>
      {perm === "default" && <button onClick={handleClick} className="btn primary sm"><Bell size={14} strokeWidth={2}/> Activar</button>}
      {perm === "granted" && <button onClick={handleClick} className="btn sm">Volver a vincular</button>}
    </div>
  )
}
