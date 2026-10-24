"use client"
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
  style?: React.CSSProperties
}

/** Aviso en línea con icono; el tono se deduce del prefijo del mensaje. */
export function Toast({ message, style }: Props) {
  if (!message) return null
  const { tone, text } = parseToast(message)
  const Icon = ICON[tone]
  return (
    <div role="status" className={`toast ${tone} popover`} style={style}>
      <Icon size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
      <span>{text}</span>
    </div>
  )
}
