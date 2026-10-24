import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

type Tone = "neutral" | "success" | "accent" | "warn" | "danger"

const TONES: Record<Tone, { fg: string; bg: string }> = {
  neutral: { fg: "var(--text-2)",  bg: "var(--surface-2)" },
  success: { fg: "var(--success)", bg: "var(--success-soft)" },
  accent:  { fg: "var(--accent)",  bg: "var(--accent-soft)" },
  warn:    { fg: "var(--warn)",    bg: "var(--warn-soft)" },
  danger:  { fg: "var(--danger)",  bg: "var(--danger-soft)" },
}

interface Props {
  icon: LucideIcon
  title: string
  text?: ReactNode
  action?: ReactNode
  tone?: Tone
  /** "card" (por defecto) lo envuelve en una tarjeta; "plain" solo el contenido */
  variant?: "card" | "plain"
  compact?: boolean
}

/** Estado vacío: icono en un círculo de color suave, título, texto y acción opcional. */
export function EmptyState({ icon: Icon, title, text, action, tone = "neutral", variant = "card", compact }: Props) {
  const t = TONES[tone]
  const body = (
    <div className="empty-state" style={{ padding: compact ? "20px 16px" : "40px 24px" }}>
      <div className="empty-state-icon popover" style={{ background: t.bg, color: t.fg }}>
        <Icon size={compact ? 20 : 24} strokeWidth={1.75} />
      </div>
      <div className="empty-state-title">{title}</div>
      {text && <div className="empty-state-text">{text}</div>}
      {action && <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>{action}</div>}
    </div>
  )
  return variant === "card" ? <div className="card" style={{ padding: 0 }}>{body}</div> : body
}
