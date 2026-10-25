"use client"
import { useState, useEffect } from "react"
import { triggerNotifSetup } from "@/components/ui/PushNotifications"
import { Bell, BellOff, BellRing, Send } from "lucide-react"
import { pushDisponible } from "@/lib/firebase-public"
import { useUsuario } from "@/lib/UsuarioContext"
import { Toast } from "@/components/ui/Toast"

type Perm = "default" | "granted" | "denied" | "unsupported"

/** Estado de las notificaciones push de este dispositivo y botón para activarlas. */
export function NotifButton() {
  const [perm, setPerm] = useState<Perm>("default")
  const [aviso, setAviso] = useState<string | null>(null)
  const [probando, setProbando] = useState(false)
  const usuario = useUsuario()

  useEffect(() => {
    // Lee el permiso del navegador al montar; cambia solo por acción del usuario
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPerm(pushDisponible() && "Notification" in window ? (Notification.permission as Perm) : "unsupported")
  }, [])

  const handleClick = () => {
    localStorage.removeItem("notif-status") // permite volver a mostrar el aviso
    triggerNotifSetup()
  }

  // Envía una push al propio usuario y muestra la respuesta del servidor:
  // sirve para diagnosticar sin abrir la consola del navegador.
  const enviarPrueba = async () => {
    if (!usuario.id || probando) return
    setProbando(true)
    try {
      const res = await fetch("/api/push/notify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [usuario.id], title: "Notificación de prueba", body: "Si ves esto, las push funcionan en este dispositivo.", path: "/perfil" }),
      })
      const data = await res.json().catch(() => ({})) as { ok?: boolean; enviados?: number; error?: string; motivos?: string[] }
      if (res.ok && data.ok) {
        setAviso(data.enviados ? `✓ Enviada a ${data.enviados} dispositivo${data.enviados === 1 ? "" : "s"}. Debería aparecer en unos segundos.` : "⚠ El servidor no encontró ningún dispositivo registrado para tu usuario. Pulsa Volver a vincular.")
      } else if (res.status === 503) {
        setAviso(`⚠ El servidor no tiene configurado el envío: ${(data.motivos || []).join(" · ") || "sin detalle"}`)
      } else {
        setAviso(`⚠ Error ${res.status}: ${data.error || "sin detalle"}`)
      }
    } catch (e) {
      setAviso(`⚠ No se pudo contactar al servidor: ${(e as Error).message}`)
    } finally {
      setProbando(false)
      setTimeout(() => setAviso(null), 15000)
    }
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
      {perm === "granted" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={enviarPrueba} className="btn primary sm" disabled={probando}><Send size={14} strokeWidth={2}/> {probando ? "Enviando…" : "Enviar prueba"}</button>
          <button onClick={handleClick} className="btn sm">Volver a vincular</button>
        </div>
      )}
      {aviso && <Toast message={aviso}/>}
    </div>
  )
}
