"use client"
import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { urlFirmada } from "@/lib/archivos"

interface Props {
  /** Ruta en el bucket o URL guardada en comprobantes_cfdi.archivo_url */
  archivo: string
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
  title?: string
}

/**
 * Abre un comprobante del bucket privado en una pestaña nueva pidiendo una
 * URL firmada en el momento del clic. Sustituye a los <a href={archivo_url}>.
 */
export function ArchivoLink({ archivo, children, className = "btn sm ghost", style, title = "Descargar" }: Props) {
  const [cargando, setCargando] = useState(false)

  const abrir = async () => {
    if (cargando) return
    setCargando(true)
    // La pestaña se abre antes del await para que el navegador no la bloquee.
    const ventana = window.open("", "_blank", "noopener")
    try {
      const url = await urlFirmada(createClient(), archivo)
      if (url) { if (ventana) ventana.location.href = url; else window.open(url, "_blank", "noopener") }
      else ventana?.close()
    } finally { setCargando(false) }
  }

  return (
    <button type="button" onClick={abrir} className={className} style={style} title={title} aria-label={title} disabled={cargando}>
      {cargando ? <Loader2 size={14} strokeWidth={2} className="spin"/> : (children ?? <Download size={14} strokeWidth={2}/>)}
    </button>
  )
}
