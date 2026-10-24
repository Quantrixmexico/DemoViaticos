"use client"
import { Sun, Moon, Check } from "lucide-react"
import { useTheme } from "@/contexts/ThemeContext"

/** Preferencias de apariencia: modo claro/oscuro y color de acento. Se guardan en este dispositivo. */
export function Apariencia() {
  const { mode, accent, setMode, setAccent, accents } = useTheme()
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div className="spread" style={{ gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Tema</div>
          <div style={{ fontSize: 13, color: "var(--text-2)" }}>Se guarda en este dispositivo.</div>
        </div>
        <div className="segmented" role="group" aria-label="Tema">
          <button type="button" aria-pressed={mode === "dark"} onClick={() => setMode("dark")}><Moon size={14} strokeWidth={2}/> Oscuro</button>
          <button type="button" aria-pressed={mode === "light"} onClick={() => setMode("light")}><Sun size={14} strokeWidth={2}/> Claro</button>
        </div>
      </div>
      <div className="spread" style={{ gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Color de acento</div>
          <div style={{ fontSize: 13, color: "var(--text-2)" }}>Botones, enlaces y resaltados.</div>
        </div>
        <div className="swatches" role="radiogroup" aria-label="Color de acento">
          {(Object.entries(accents) as [keyof typeof accents, (typeof accents)[keyof typeof accents]][]).map(([key, a]) => (
            <button key={key} type="button" role="radio" aria-checked={accent === key} aria-label={a.name} title={a.name}
              className="swatch" onClick={() => setAccent(key)}
              style={{ "--sw-d": a.color, "--sw-l": a.light } as React.CSSProperties}>
              {accent === key && <Check size={14} strokeWidth={3}/>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
