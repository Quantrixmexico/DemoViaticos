"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { clearAjustesCache } from "@/lib/ajustes"
import { Toast } from "@/components/ui/Toast"
import { Skeleton } from "@/components/ui/Skeleton"

interface Ajuste { clave: string; valor: string; descripcion?: string }

export default function AjustesPage() {
  const [ajustes,  setAjustes]  = useState<Record<string, Ajuste>>({})
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState<string | null>(null)

  const load = async () => {
    const sb = createClient()
    const { data } = await sb.from("ajustes").select("*").order("clave")
    const map: Record<string,Ajuste> = {}
    ;(data || []).forEach((a: any) => { map[a.clave] = a })
    setAjustes(map)
    setLoading(false)
  }
  useEffect(()=>{ load() },[])

  const guardar = async (clave: string) => {
    setSaving(true)
    const sb = createClient()
    const a = ajustes[clave]
    await sb.from("ajustes").upsert({
      clave, valor: a.valor, descripcion: a.descripcion,
      updated_at: new Date().toISOString(),
    })
    clearAjustesCache()
    setSaving(false)
    setToast(`✓ ${clave} actualizado`)
    setTimeout(()=>setToast(null),3000)
  }

  const update = (clave: string, valor: string) => {
    setAjustes(prev => ({...prev, [clave]: { ...prev[clave], valor }}))
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Ajustes del sistema</h1>
          <div className="page-sub">Configuración global de reglas de negocio</div>
        </div>
      </div>

      <Toast message={toast}/>

      {loading ? (
        <div role="status" aria-label="Cargando" style={{display:"grid",gap:14,maxWidth:600}}>
          {Array.from({length:4}).map((_, i) => (
            <div key={i} className="card" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14}}>
              <div style={{flex:1,minWidth:0,display:"grid",gap:10}}>
                <Skeleton w={`${40 + ((i * 17) % 25)}%`} h={14}/>
                <Skeleton w={`${60 + ((i * 13) % 30)}%`} h={11}/>
                <Skeleton w={200} h={38} r={10}/>
              </div>
              <Skeleton w={84} h={34} r={10}/>
            </div>
          ))}
        </div>
      ) : (
        <div style={{display:"grid",gap:14,maxWidth:600}}>
          {Object.values(ajustes).map(a => (
            <div key={a.clave} className="card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:14,marginBottom:4}}>{a.clave}</div>
                  {a.descripcion && (
                    <div style={{fontSize:12,color:"var(--text-3)",marginBottom:10,lineHeight:1.5}}>
                      {a.descripcion}
                    </div>
                  )}
                  <input className="input" type="text" value={a.valor}
                    onChange={e => update(a.clave, e.target.value)}
                    style={{maxWidth:200}}/>
                </div>
                <button className="btn primary" disabled={saving}
                  onClick={()=>guardar(a.clave)}>
                  Guardar
                </button>
              </div>
            </div>
          ))}
          {Object.values(ajustes).length === 0 && (
            <div className="card" style={{padding:40,textAlign:"center",color:"var(--text-3)"}}>
              Sin ajustes configurados. Ejecuta create-ajustes.sql en Supabase.
            </div>
          )}
        </div>
      )}
    </>
  )
}

