"use client"
import type { ReactNode } from "react"

/** Paleta categórica tomada de los tokens: cambia con el acento y con el modo claro/oscuro. */
export const CHART_COLORS = [
  "var(--accent)", "var(--st-blue)", "var(--st-violet)", "var(--warn)",
  "var(--success)", "var(--st-orange)", "var(--danger)", "var(--text-3)",
]

/** Tono por nivel de antigüedad: sano, atención, riesgo, crítico. */
export const AGING_COLORS = ["var(--success)", "var(--warn)", "var(--st-orange)", "var(--danger)"]

export const axisTick = { fontSize: 11, fill: "var(--text-3)" }
export const gridProps = { strokeDasharray: "3 3", stroke: "var(--border-soft)", vertical: false }
export const barRadius: [number, number, number, number] = [0, 6, 6, 0]

interface TooltipPayload { name?: string; value?: number | string; color?: string; payload?: Record<string, unknown>; dataKey?: string }
interface TooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: ReactNode
  formatter?: (v: number) => string
  /** Etiqueta por dataKey ("anticipos" → "Anticipos") */
  names?: Record<string, string>
}

/** Tooltip con el estilo de la app: tarjeta de vidrio, punto de color por serie, cifras tabulares. */
export function ChartTooltip({ active, payload, label, formatter, names }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      {label !== undefined && label !== "" && <div className="chart-tooltip-title">{label}</div>}
      {payload.map((p, i) => {
        const key = String(p.dataKey ?? p.name ?? i)
        const name = names?.[key] ?? p.name ?? key
        const v = typeof p.value === "number" ? (formatter ? formatter(p.value) : p.value.toLocaleString("es-MX")) : p.value
        const color = p.color ?? (p.payload as { fill?: string } | undefined)?.fill
        return (
          <div key={i} className="chart-tooltip-row">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              {color && <i className="chart-dot" style={{ background: color }} />}{name}
            </span>
            <b>{v}</b>
          </div>
        )
      })}
    </div>
  )
}

/** Leyenda con puntos, como las insignias de estatus. */
export function ChartLegend({ payload, names }: { payload?: Array<{ value?: string; color?: string; dataKey?: unknown }>; names?: Record<string, string> }) {
  if (!payload?.length) return null
  return (
    <div className="chart-legend">
      {payload.map((p, i) => (
        <span key={i}><i className="chart-dot" style={{ background: p.color }} />{names?.[String(p.dataKey ?? p.value)] ?? p.value}</span>
      ))}
    </div>
  )
}

/** Cursor de las gráficas: una franja suave en lugar del gris por defecto. */
export const barCursor = { fill: "var(--accent-soft)", radius: 8 }
export const lineCursor = { stroke: "var(--accent)", strokeWidth: 1, strokeDasharray: "3 3" }
