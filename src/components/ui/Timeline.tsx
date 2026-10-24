import type { LucideIcon } from "lucide-react"
import {
  Send, CheckCircle2, ShieldCheck, Banknote, Paperclip, Trophy, XCircle, RotateCcw,
  Landmark, MessageSquare, Clock, Pencil,
} from "lucide-react"
import { fmtFecha } from "@/lib/format"
import { stripEmoji } from "@/lib/text"

interface Evento {
  id: string | number
  accion: string
  ts: string | Date
  actor?: string | null
  detalle?: string | null
}

type Tone = "accent" | "success" | "danger" | "warn" | "blue" | "violet" | "neutral"

const TONE_COLOR: Record<Tone, string> = {
  accent: "var(--accent)", success: "var(--success)", danger: "var(--danger)", warn: "var(--warn)",
  blue: "var(--st-blue)", violet: "var(--st-violet)", neutral: "var(--text-3)",
}

/** Cómo se muestra cada acción de la bitácora: etiqueta legible, icono y tono. */
const ACCIONES: Record<string, { label: string; icon: LucideIcon; tone: Tone }> = {
  solicitado:  { label: "Solicitud enviada",          icon: Send,          tone: "accent" },
  creado:      { label: "Solicitud creada",           icon: Send,          tone: "accent" },
  autorizado:  { label: "Autorizada por gerente",     icon: CheckCircle2,  tone: "accent" },
  validado:    { label: "Validada por administración", icon: ShieldCheck,  tone: "violet" },
  liberado:    { label: "Pago liberado",              icon: Banknote,      tone: "blue" },
  pagado:      { label: "Pago liberado",              icon: Banknote,      tone: "blue" },
  comprobacion:{ label: "Comprobación enviada",       icon: Paperclip,     tone: "accent" },
  parcial:     { label: "Comprobación parcial",       icon: Paperclip,     tone: "warn" },
  comprobado:  { label: "Comprobada",                 icon: Trophy,        tone: "success" },
  rechazado:   { label: "Rechazada",                  icon: XCircle,       tone: "danger" },
  devuelto:    { label: "Devuelta para corrección",   icon: RotateCcw,     tone: "warn" },
  corregido:   { label: "Corregida y reenviada",      icon: Pencil,        tone: "accent" },
  cierre:      { label: "Cierre con depósito",        icon: Landmark,      tone: "blue" },
  comentario:  { label: "Comentario",                 icon: MessageSquare, tone: "neutral" },
}

function describir(accion: string) {
  const key = accion.toLowerCase().trim()
  if (ACCIONES[key]) return ACCIONES[key]
  const limpio = stripEmoji(accion)
  return { label: limpio.charAt(0).toUpperCase() + limpio.slice(1), icon: Clock, tone: "neutral" as Tone }
}

/** Línea de tiempo de la bitácora: icono por acción, conector y quién/cuándo. */
export function Timeline({ eventos }: { eventos: Evento[] }) {
  return (
    <ol className="timeline">
      {eventos.map((e, i) => {
        const { label, icon: Icon, tone } = describir(e.accion)
        const color = TONE_COLOR[tone]
        const ultimo = i === eventos.length - 1
        return (
          <li key={e.id} className={`timeline-item list-item-in ${ultimo ? "is-last" : ""}`} style={{ "--i": i } as React.CSSProperties}>
            <span className="timeline-dot" style={{ color, borderColor: color, background: `color-mix(in srgb, ${color} 14%, var(--surface))` }}>
              <Icon size={13} strokeWidth={2.25} />
            </span>
            <div className="timeline-body">
              <div className="timeline-title">{label}</div>
              <div className="timeline-meta">{e.actor || "Sistema"} · {fmtFecha(e.ts)}</div>
              {e.detalle && <div className="timeline-detail">{stripEmoji(e.detalle)}</div>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
