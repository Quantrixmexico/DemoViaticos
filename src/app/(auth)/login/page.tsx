"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import { triggerNotifSetup } from "@/components/ui/PushNotifications"
import { Download, Mail, ArrowLeft } from "lucide-react"
import { BRAND } from "@/lib/brand"

function InstallButton() {
  const [canInstall, setCanInstall] = useState(false)
  const promptRef = useRef<any>(null)
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); promptRef.current = e; setCanInstall(true) }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])
  if (!canInstall) return null
  return (
    <button onClick={async () => {
      if (!promptRef.current) return
      await promptRef.current.prompt()
      const { outcome } = await promptRef.current.userChoice
      if (outcome === "accepted") { promptRef.current = null; setCanInstall(false) }
    }} className="btn" style={{ marginTop:10, width:"100%", justifyContent:"center", padding:"11px" }}>
      <Download size={15} strokeWidth={1.75}/> Instalar aplicación
    </button>
  )
}

export default function LoginPage() {
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [error,    setError]    = useState<string|null>(null)
  const [loading,  setLoading]  = useState(false)
  const [mode,     setMode]     = useState<"login"|"recover">("login")
  const [sent,     setSent]     = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)
    const sb = createClient()
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) { setError("Credenciales incorrectas"); setLoading(false); return }
    router.push("/dashboard")
  }

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError("Ingresa tu correo"); return }
    setLoading(true); setError(null)
    const sb = createClient()
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) { setError("Error al enviar: " + error.message); setLoading(false); return }
    setSent(true); setLoading(false)
  }

  return (
    <div className="auth-stage">
      <div className="aurora" aria-hidden><i/><i/><i/></div>
      <PowerLines/>
      <section className="auth-hero">
        <h1>Tus viáticos, en orden.</h1>
        <p>Solicita anticipos, comprueba gastos con CFDI y sigue cada pago en un solo lugar.</p>
      </section>

      <section className="auth-panel">
        <div className="auth-card glass">
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:28 }}>
            <Image src="/logo.png" alt={BRAND.empresa} width={48} height={48}
              style={{ borderRadius:13, flexShrink:0, boxShadow:"0 8px 24px -8px rgba(0,0,0,.5)" }}/>
            <div style={{ lineHeight:1.25 }}>
              <div style={{ fontSize:17, fontWeight:650, letterSpacing:"-0.02em" }}>{BRAND.empresa}</div>
              <div style={{ fontSize:13, color:"var(--text-3)" }}>Sistema de viáticos</div>
            </div>
          </div>

        {mode === "login" ? (
          <div key="login" className="page-enter">
            <h2 style={{ fontSize:24, fontWeight:700, letterSpacing:"-0.03em", marginBottom:20 }}>Inicia sesión</h2>
            <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div className="auth-field">
                <label htmlFor="email">Correo electrónico</label>
                <input id="email" className="input" type="email" value={email}
                  onChange={e=>setEmail(e.target.value)} required
                  placeholder={BRAND.correoEjemplo} autoComplete="email"/>
              </div>
              <div className="auth-field">
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                  <label htmlFor="password">Contraseña</label>
                  <button type="button" onClick={()=>{ setMode("recover"); setError(null); setSent(false) }}
                    style={{ fontSize:13, color:"var(--accent)", background:"none", border:"none",
                      cursor:"pointer", padding:0, font:"inherit" }}>
                    ¿La olvidaste?
                  </button>
                </div>
                <input id="password" className="input" type="password" value={password}
                  onChange={e=>setPassword(e.target.value)} required
                  placeholder="••••••••" autoComplete="current-password"/>
              </div>
              {error && (
                <div role="alert" className="popover" style={{ padding:"10px 14px", background:"var(--danger-soft)",
                  borderRadius:"var(--r-md)", fontSize:13, color:"var(--danger)" }}>{error}</div>
              )}
              <button className="btn primary" type="submit" disabled={loading}
                style={{ justifyContent:"center", marginTop:6, padding:"13px", fontSize:15 }}>
                {loading ? <><Spinner/> Iniciando sesión…</> : "Iniciar sesión"}
              </button>
            </form>
            <InstallButton/>
          </div>
        ) : sent ? (
          <div key="sent" className="page-enter" style={{ textAlign:"center", padding:"8px 0" }}>
            <div className="popover" style={{ width:56, height:56, borderRadius:"50%", margin:"0 auto 18px",
              display:"grid", placeItems:"center", background:"var(--accent-soft)", color:"var(--accent)" }}>
              <Mail size={26} strokeWidth={1.75}/>
            </div>
            <div style={{ fontWeight:700, fontSize:20, letterSpacing:"-0.02em", marginBottom:8 }}>Revisa tu correo</div>
            <div style={{ fontSize:14, color:"var(--text-2)", lineHeight:1.6, marginBottom:24 }}>
              Enviamos un enlace a <strong style={{ color:"var(--text)" }}>{email}</strong> para restablecer tu contraseña.
              Puede tardar unos minutos.
            </div>
            <button className="btn" onClick={()=>{ setMode("login"); setSent(false) }}
              style={{ width:"100%", justifyContent:"center" }}>
              <ArrowLeft size={15} strokeWidth={1.75}/> Volver a iniciar sesión
            </button>
          </div>
        ) : (
          <form key="recover" className="page-enter" onSubmit={handleRecover} style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ marginBottom:4 }}>
              <h2 style={{ fontSize:24, fontWeight:700, letterSpacing:"-0.03em", marginBottom:6 }}>Recupera tu contraseña</h2>
              <div style={{ fontSize:14, color:"var(--text-2)" }}>
                Escribe tu correo y te enviaremos un enlace para restablecerla.
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="email-rec">Correo electrónico</label>
              <input id="email-rec" className="input" type="email" value={email}
                onChange={e=>setEmail(e.target.value)} required
                placeholder={BRAND.correoEjemplo} autoComplete="email"/>
            </div>
            {error && (
              <div role="alert" className="popover" style={{ padding:"10px 14px", background:"var(--danger-soft)",
                borderRadius:"var(--r-md)", fontSize:13, color:"var(--danger)" }}>{error}</div>
            )}
            <button className="btn primary" type="submit" disabled={loading}
              style={{ justifyContent:"center", padding:"13px", fontSize:15 }}>
              {loading ? <><Spinner/> Enviando…</> : "Enviar enlace"}
            </button>
            <button type="button" className="btn ghost" onClick={()=>{ setMode("login"); setError(null) }}
              style={{ justifyContent:"center" }}>
              <ArrowLeft size={15} strokeWidth={1.75}/> Volver
            </button>
          </form>
        )}
        </div>
      </section>
    </div>
  )
}

// Cables de alta tensión entre torres, con un pulso de luz que los recorre
function PowerLines() {
  const wires = [
    "M -40 210 Q 260 300 560 230 T 1160 250",
    "M -40 250 Q 260 345 560 270 T 1160 292",
    "M -40 300 Q 260 400 560 320 T 1160 345",
  ]
  return (
    <svg className="powerlines" viewBox="0 0 1100 700" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {wires.map((d, i) => (
        <g key={i}>
          <path className="wire" d={d}/>
          <path className="pulse" d={d}/>
        </g>
      ))}
    </svg>
  )
}

function Spinner() {
  return (
    <span aria-hidden style={{
      width:14, height:14, borderRadius:"50%", display:"inline-block",
      border:"2px solid currentColor", borderRightColor:"transparent",
      animation:"spin .7s linear infinite",
    }}/>
  )
}
