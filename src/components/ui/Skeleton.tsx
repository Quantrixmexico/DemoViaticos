import type { CSSProperties } from "react"

/** Bloque gris animado. Úsalo para dibujar la silueta de lo que está cargando. */
export function Skeleton({ w, h = 14, r = 8, style }: { w?: number | string; h?: number | string; r?: number; style?: CSSProperties }) {
  return <div className="skeleton" aria-hidden style={{ width: w ?? "100%", height: h, borderRadius: r, ...style }} />
}

/**
 * Lista de filas tipo tarjeta (solicitudes, usuarios, pagos…):
 * una línea de título, una secundaria y una cifra a la derecha.
 */
export function SkeletonList({ rows = 5, card = true }: { rows?: number; card?: boolean }) {
  const body = (
    <div role="status" aria-label="Cargando" className="skeleton-list">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row list-item-in" style={{ "--i": i } as CSSProperties}>
          <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 8 }}>
            <Skeleton w={`${55 + ((i * 17) % 30)}%`} h={14} />
            <Skeleton w={`${30 + ((i * 11) % 25)}%`} h={11} />
          </div>
          <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
            <Skeleton w={84} h={16} />
            <Skeleton w={56} h={18} r={999} />
          </div>
        </div>
      ))}
    </div>
  )
  return card ? <div className="card" style={{ padding: 0, overflow: "hidden" }}>{body}</div> : body
}

/** Tabla: cabecera y filas con celdas de ancho variable. En móvil se ve como lista. */
export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Cargando" className="skeleton-table">
      <div className="skeleton-thead">
        {Array.from({ length: cols }).map((_, c) => <Skeleton key={c} w={`${40 + ((c * 23) % 40)}%`} h={10} />)}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-tr list-item-in" style={{ "--i": i, gridTemplateColumns: `repeat(${cols}, 1fr)` } as CSSProperties}>
          {Array.from({ length: cols }).map((_, c) => <Skeleton key={c} w={`${45 + ((i * 13 + c * 29) % 45)}%`} h={12} />)}
        </div>
      ))}
    </div>
  )
}

/** Cuadrícula de tarjetas (equipo, tarjetas de estatus, gráficas). */
export function SkeletonCards({ count = 6, h = 120, min = 220 }: { count?: number; h?: number; min?: number }) {
  return (
    <div role="status" aria-label="Cargando" style={{ display: "grid", gap: 12, gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card list-item-in" style={{ "--i": i, height: h, display: "grid", alignContent: "space-between" } as CSSProperties}>
          <Skeleton w="45%" h={12} />
          <Skeleton w="70%" h={26} />
          <Skeleton w="35%" h={10} />
        </div>
      ))}
    </div>
  )
}

/** Página de detalle o formulario: encabezado + bloques. */
export function SkeletonPage() {
  return (
    <div role="status" aria-label="Cargando" style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 10 }}>
        <Skeleton w={260} h={30} r={10} />
        <Skeleton w={180} h={14} />
      </div>
      <div className="card" style={{ display: "grid", gap: 14 }}>
        <Skeleton w="30%" h={14} />
        <Skeleton h={42} r={12} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Skeleton h={42} r={12} /><Skeleton h={42} r={12} />
        </div>
      </div>
      <SkeletonList rows={3} />
    </div>
  )
}
