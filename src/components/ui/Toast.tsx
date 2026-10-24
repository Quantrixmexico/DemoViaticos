"use client"
import { createPortal } from "react-dom"
import { CheckCircle2, AlertTriangle, Info } from "lucide-react"

type Tone = "success" | "danger" | "info"

const PREFIX: Array<[RegExp, Tone]> = [
  [/^\s*[✓✅]\s*/u, "success"],
  [/^\s*[⚠❌✗✕🚫]\s*/u, "danger"],
  [/^\s*ℹ\s*/u, "info"],
]

/**
 * Separa el prefijo con el que las páginas marcan el tipo de mensaje
 * ("✓ Guardado", "⚠ Error…") y devuelve el tono y el texto limpio.
 */
export function parseToast(message: string): { tone: Tone; text: string } {
  for (const [re, tone] of PREFIX) {
    if (re.test(message)) return { tone, text: message.replace(re, "") }
  }
  return { tone: "danger", text: message }
}

const ICON = { success: CheckCircle2, danger: AlertTriangle, info: Info }

interface Props {
  message: string | null | undefined
  /** "floating" (por defecto) aparece abajo al centro; "inline" se queda en el flujo de la página */
  variant?: "floating" | "inline"
  style?: React.CSSProperties
}

/** Aviso con icono; el tono se deduce del prefijo del mensaje. Las páginas controlan cuándo desaparece. */
export function Toast({ message, variant = "floating", style }: Props) {
  if (!message) return null
  const { tone, text } = parseToast(message)
  const Icon = ICON[tone]
  const node = (
    <div role="status" className={`toast ${tone} ${variant === "floating" ? "toast-floating" : "popover"}`} style={variant === "inline" ? style : undefined}>
      <Icon size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
      <span>{text}</span>
    </div>
  )
  // El mensaje solo existe tras una acción del usuario, así que nunca se renderiza en el servidor
  if (variant === "inline" || typeof document === "undefined") return variant === "inline" ? node : null
  return createPortal(<div className="toast-layer">{node}</div>, document.body)
}
