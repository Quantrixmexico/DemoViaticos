import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

export interface StatItem {
  label: string
  value: ReactNode
  /** Color del valor cuando conviene destacar (var(--warn), var(--danger)…) */
  color?: string
  icon?: LucideIcon
  /** Texto pequeño bajo el valor: comparativo, unidad, aclaración */
  hint?: ReactNode
}

interface Props {
  items: StatItem[]
  /** Ancho mínimo de cada tarjeta; la cuadrícula se adapta sola */
  min?: number
  loading?: boolean
  style?: React.CSSProperties
}

/** Fila de cifras clave: etiqueta arriba, número grande debajo, mismo tamaño en toda la app. */
export function StatCards({ items, min = 150, loading, style }: Props) {
  return (
    <div className="stat-grid" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, ...style }}>
      {items.map((k, i) => {
        const Icon = k.icon
        return (
          <div key={k.label} className="stat list-item-in" style={{ "--i": i } as React.CSSProperties}>
            <div className="stat-label">
              {Icon && <Icon size={14} strokeWidth={2} />}
              <span>{k.label}</span>
            </div>
            {loading
              ? <div className="skeleton" style={{ height: 24, width: "55%", borderRadius: 8, marginTop: 8, marginBottom: 2 }} />
              : <div className="stat-value" style={{ color: k.color }}>{k.value}</div>}
            {k.hint && !loading && <div className="stat-hint">{k.hint}</div>}
          </div>
        )
      })}
    </div>
  )
}
