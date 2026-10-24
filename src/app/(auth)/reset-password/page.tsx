"use client"
import { useState, useEffect } from "react"
import { BRAND } from "@/lib/brand"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import { ArrowLeft, CheckCircle2, Hourglass } from "lucide-react"
import { EmptyState } from "@/components/ui/EmptyState"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password,  setPassword]  = useState("")
  const [confirm,   setConfirm]   = useState("")
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string|null>(null)
  const [success,   setSuccess]   = useState(false)
  const [ready,     setReady]     = useState(false)

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash
    // It automatically picks it up via onAuthStateChange
    const sb = createClient()
    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true)
      }
    })

    // Check if already has session from recovery link
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return }
    if (password !== confirm) { setError("Las contraseñas no coinciden"); return }

    setLoading(true); setError(null)
    const sb = createClient()
    const { error } = await sb.auth.updateUser({ password })
    if (error) { setError("Error al actualizar: " + error.message); setLoading(false); return }

    setSuccess(true)
    setTimeout(() => router.push("/dashboard"), 2000)
  }

  return (
    <div style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"var(--bg)" }}>
      <div style={{ width:"100%", maxWidth:380, padding:"0 20px" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <Image src="/logo.png" alt={BRAND.empresa} width={64} height={64}
            style={{ display:"block", margin:"0 auto 14px", borderRadius:17, boxShadow:"0 8px 32px rgba(0,0,0,.3)" }}/>
          <div style={{ fontSize:20, fontWeight:700, letterSpacing:"-0.02em" }}>
            Nueva contraseña
          </div>
          <div style={{ fontSize:13, color:"var(--text-3)", marginTop:4 }}>{BRAND.empresa}, {BRAND.nombreCorto}</div>
        </div>

        {success ? (
          <EmptyState icon={CheckCircle2} tone="success" variant="plain"
            title="¡Contraseña actualizada!" text="Redirigiendo al sistema…"/>
        ) : !ready ? (
          <EmptyState icon={Hourglass} tone="neutral" variant="plain"
            title="Validando enlace de recuperación…"
            text={
              <>
                Si esto tarda mucho,{" "}
                <button onClick={() => router.push("/login")}
                  style={{ color:"var(--accent)", background:"none", border:"none", cursor:"pointer", font:"inherit" }}>
                  vuelve al inicio de sesión
                </button>
              </>
            }/>
        ) : (
          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <label style={{ fontSize:12, color:"var(--text-3)", marginBottom:4, display:"block" }}>
                Nueva contraseña
              </label>
              <input className="input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} required
                minLength={6} placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"/>
            </div>
            <div>
              <label style={{ fontSize:12, color:"var(--text-3)", marginBottom:4, display:"block" }}>
                Confirmar contraseña
              </label>
              <input className="input" type="password" value={confirm}
                onChange={e => setConfirm(e.target.value)} required
                placeholder="Repite la contraseña"
                autoComplete="new-password"/>
            </div>
            {error && (
              <div style={{ padding:"8px 12px", background:"var(--danger-soft)",
                borderRadius:"var(--r-md)", fontSize:12, color:"var(--danger)" }}>
                {error}
              </div>
            )}
            <button className="btn primary" type="submit" disabled={loading}
              style={{ justifyContent:"center", padding:"12px" }}>
              {loading ? "Guardando…" : "Guardar nueva contraseña"}
            </button>
            <button type="button" className="btn ghost"
              onClick={() => router.push("/login")}
              style={{ justifyContent:"center" }}>
              <ArrowLeft size={15} strokeWidth={2}/> Cancelar
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

