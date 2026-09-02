"use client"
import { createContext, useContext } from "react"

export interface UsuarioActual {
  id?: string
  nombre: string
  rol: string
  iniciales: string
}

const UsuarioContext = createContext<UsuarioActual | null>(null)

export function UsuarioProvider({ usuario, children }: { usuario: UsuarioActual; children: React.ReactNode }) {
  return <UsuarioContext.Provider value={usuario}>{children}</UsuarioContext.Provider>
}

/** Hook para obtener el usuario actual en cualquier componente client */
export function useUsuario(): UsuarioActual {
  const ctx = useContext(UsuarioContext)
  if (!ctx) return { nombre: "", rol: "", iniciales: "" }
  return ctx
}

