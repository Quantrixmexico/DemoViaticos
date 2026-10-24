"use client"
import { createContext, useContext, useState, useEffect } from "react"

type Mode = "dark" | "light"
type Accent = "aurora" | "azul" | "ambar" | "violeta"

// Cada acento tiene una versión para fondo oscuro y otra para fondo claro;
// globals.css elige la correcta según el modo.
const ACCENTS: Record<Accent, { name:string; color:string; soft:string; light:string; softLight:string }> = {
  aurora:  { name:"Aurora",  color:"#5ee6c3", soft:"rgba(94,230,195,.12)",  light:"#0b8f78", softLight:"rgba(11,143,120,.10)" },
  azul:    { name:"Azul",    color:"#4da3ff", soft:"rgba(77,163,255,.13)",  light:"#0066cc", softLight:"rgba(0,102,204,.09)" },
  ambar:   { name:"Ámbar",   color:"#ffb340", soft:"rgba(255,179,64,.13)",  light:"#b25000", softLight:"rgba(178,80,0,.09)" },
  violeta: { name:"Violeta", color:"#bf8bff", soft:"rgba(191,139,255,.13)", light:"#7a44d6", softLight:"rgba(122,68,214,.09)" },
}

interface ThemeCtx {
  mode: Mode; accent: Accent
  setMode: (m: Mode) => void
  setAccent: (a: Accent) => void
  accents: typeof ACCENTS
}

const ThemeContext = createContext<ThemeCtx|null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>("dark")
  const [accent, setAccentState] = useState<Accent>("aurora")

  // Load from localStorage
  useEffect(() => {
    // "theme" es la llave que usaba la barra lateral antes de unificar el tema
    const m = (localStorage.getItem("vz-mode") || localStorage.getItem("theme")) as Mode
    const a = localStorage.getItem("vz-accent") as Accent
    if (m === "light" || m === "dark") setModeState(m)
    if (a && ACCENTS[a]) setAccentState(a)
  }, [])

  // Apply CSS variables
  useEffect(() => {
    const root = document.documentElement
    const ac = ACCENTS[accent]
    root.style.setProperty("--accent-d", ac.color)
    root.style.setProperty("--accent-soft-d", ac.soft)
    root.style.setProperty("--accent-l", ac.light)
    root.style.setProperty("--accent-soft-l", ac.softLight)
    if (mode === "light") {
      root.classList.add("light")
    } else {
      root.classList.remove("light")
    }
  }, [mode, accent])

  const setMode = (m: Mode) => { setModeState(m); localStorage.setItem("vz-mode", m) }
  const setAccent = (a: Accent) => { setAccentState(a); localStorage.setItem("vz-accent", a) }

  return (
    <ThemeContext.Provider value={{ mode, accent, setMode, setAccent, accents:ACCENTS }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)!

