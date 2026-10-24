"use client"
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react"
import { Dialog } from "./Dialog"

interface ConfirmOptions {
  title: ReactNode
  text?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** "danger" para acciones destructivas (botón rojo) */
  tone?: "primary" | "danger"
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

/** Reemplazo de window.confirm con el estilo de la app. Devuelve una promesa con la decisión. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>(o => new Promise(resolve => {
    resolver.current = resolve
    setOpts(o)
  }), [])

  const close = (v: boolean) => {
    resolver.current?.(v)
    resolver.current = null
    setOpts(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={!!opts} onClose={() => close(false)} size="sm"
        title={opts?.title ?? ""} description={opts?.text}
        footer={<>
          <button className="btn ghost" onClick={() => close(false)}>{opts?.cancelLabel ?? "Cancelar"}</button>
          <button className={`btn ${opts?.tone === "danger" ? "danger" : "primary"}`} onClick={() => close(true)}>
            {opts?.confirmLabel ?? "Confirmar"}
          </button>
        </>}
      />
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext)
  if (!fn) throw new Error("useConfirm debe usarse dentro de ConfirmProvider")
  return fn
}
