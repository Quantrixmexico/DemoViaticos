"use client"
import { useEffect, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

interface Props {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** Texto corto bajo el título */
  description?: ReactNode
  children?: ReactNode
  /** Botones; se alinean a la derecha en escritorio y a todo el ancho en móvil */
  footer?: ReactNode
  size?: "sm" | "md" | "lg"
  /** Si es false, el fondo y Escape no cierran (p. ej. mientras guarda) */
  dismissible?: boolean
}

const WIDTH = { sm: 400, md: 520, lg: 680 }

/**
 * Diálogo modal: ventana centrada en escritorio, hoja inferior en móvil.
 * Se monta en <body> con un portal para no depender del contenedor de página.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = "md", dismissible = true }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && dismissible) onClose() }
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    // Enfoca el primer control del diálogo
    const t = setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>("input, textarea, select, button:not([data-close])")
      el?.focus()
    }, 50)
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; clearTimeout(t) }
  }, [open, onClose, dismissible])

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div className="dialog-backdrop sheet-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && dismissible) onClose() }}>
      <div ref={panelRef} className="dialog" role="dialog" aria-modal="true" style={{ maxWidth: WIDTH[size] }}>
        <div className="dialog-grab" aria-hidden />
        <div className="dialog-head">
          <div style={{ minWidth: 0 }}>
            <h2 className="dialog-title">{title}</h2>
            {description && <div className="dialog-desc">{description}</div>}
          </div>
          {dismissible && (
            <button className="icon-btn" onClick={onClose} aria-label="Cerrar" data-close>
              <X size={16} strokeWidth={2} />
            </button>
          )}
        </div>
        {children && <div className="dialog-body">{children}</div>}
        {footer && <div className="dialog-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
