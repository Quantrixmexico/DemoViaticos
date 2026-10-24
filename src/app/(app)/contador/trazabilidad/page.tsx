"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { fmtMXN, fmtFecha } from "@/lib/format"
import { StatusBadge, TipoBadge } from "@/components/ui/StatusBadge"
import Link from "next/link"
import { Search, User, Calendar, Banknote, Download, Landmark, History } from "lucide-react"
import { EmptyState } from "@/components/ui/EmptyState"
import { Timeline } from "@/components/ui/Timeline"

export default function TrazabilidadPage() {
  const [folio, setFolio] = useState("")
  const [buscando, setBuscando] = useState(false)
  const [resultado, setResultado] = useState<any|null>(null)
  const [error, setError] = useState<string|null>(null)

  const buscar = async (id?: string) => {
    const f = (id || folio).trim().toUpperCase()
    if (!f) return
    setBuscando(true); setResultado(null); setError(null)
    const sb = createClient()

    const { data: sol } = await sb.from("solicitudes")
      .select("*, cfdi:comprobantes_cfdi(*), items:solicitud_items(*)")
      .eq("id", f).maybeSingle()

    if (!sol) { setError(`No encontrado: ${f}`); setBuscando(false); return }

    const [bitacoraRes, usuarioRes, anticipoRes, compsRes] = await Promise.all([
      sb.from("bitacora").select("*, actor:usuarios!usuario_id(nombre)").eq("solicitud_id",f).order("ts",{ascending:true}),
      sb.from("usuarios").select("nombre,iniciales,division,rol").eq("id",sol.usuario_id).maybeSingle(),
      sol.anticipo_ref ? sb.from("solicitudes").select("id,concepto,monto,status").eq("id",sol.anticipo_ref).maybeSingle() : Promise.resolve({data:null}),
      sb.from("solicitudes").select("id,concepto,monto,status,tipo").eq("anticipo_ref",f),
    ])

    setResultado({
      sol, bitacora:bitacoraRes.data||[], usuario:usuarioRes.data,
      anticipoPadre:anticipoRes.data, comprobacionesLigadas:compsRes.data||[],
    })
    setBuscando(false)
  }

  const { sol, bitacora, usuario, anticipoPadre, comprobacionesLigadas } = resultado || {}

  return (
    <div style={{maxWidth:800}}>
      <div className="page-head">
        <div><h1 className="page-title">Trazabilidad</h1><div className="page-sub">Rastrea el ciclo completo de una solicitud</div></div>
      </div>

      {/* Search */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:"flex",gap:10}}>
          <input className="input" value={folio} onChange={e=>setFolio(e.target.value.toUpperCase())}
            onKeyDown={e=>e.key==="Enter"&&buscar()}
            placeholder="Ej: ANT-2026-1234 o REE-2026-5678"
            style={{flex:1,fontFamily:"monospace"}}/>
          <button className="btn primary" onClick={()=>buscar()} disabled={buscando||!folio.trim()}>
            {buscando?"Buscando…":<><Search size={15} strokeWidth={2}/> Rastrear</>}
          </button>
        </div>
      </div>

      {error && <div style={{padding:"10px 14px",borderRadius:8,marginBottom:16,background:"var(--danger-soft)",color:"var(--danger)",fontSize:13}}>{error}</div>}

      {resultado && (
        <>
          {/* Header */}
          <div className="card" style={{marginBottom:12}}>
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8}}>
              <TipoBadge tipo={sol.tipo}/>
              <StatusBadge status={sol.status}/>
              {sol.notas?.includes("CIERRE_DEPOSITO")&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:12,background:"var(--accent-soft)",color:"var(--accent)",fontWeight:600,display:"inline-flex",alignItems:"center",gap:4}}><Landmark size={12} strokeWidth={2}/> CIERRE</span>}
              <span className="mono" style={{fontSize:11,color:"var(--text-3)"}}>{sol.id}</span>
            </div>
            <div style={{fontWeight:600,fontSize:16,marginBottom:4}}>{sol.concepto}</div>
            <div style={{display:"flex",gap:20,fontSize:12,color:"var(--text-3)"}}>
              <span style={{display:"inline-flex",alignItems:"center",gap:4}}><User size={14} strokeWidth={2}/> {usuario?.nombre||"—"}</span>
              <span style={{display:"inline-flex",alignItems:"center",gap:4}}><Calendar size={14} strokeWidth={2}/> {fmtFecha(sol.fecha)}</span>
              <span style={{display:"inline-flex",alignItems:"center",gap:4}}><Banknote size={14} strokeWidth={2}/> {fmtMXN(parseFloat(sol.monto))}</span>
            </div>
            {anticipoPadre&&<div style={{marginTop:8,padding:"8px 12px",background:"var(--warn-soft)",borderRadius:8,fontSize:12}}>
              Comprobación del anticipo: <button onClick={()=>{setFolio(anticipoPadre.id);buscar(anticipoPadre.id)}}
                style={{background:"none",border:"none",color:"var(--warn)",fontWeight:600,cursor:"pointer",fontFamily:"monospace"}}>{anticipoPadre.id}</button>
            </div>}
          </div>

          {/* Timeline */}
          <div className="card" style={{marginBottom:12}}>
            <div className="card-title" style={{marginBottom:14}}>Línea de tiempo</div>
            {bitacora.length===0 ? (
              <EmptyState variant="plain" compact icon={History} title="Sin registros en bitácora" text="Las nuevas transacciones sí quedan registradas."/>
            ) : (
              <Timeline eventos={bitacora.map((b:any)=>({ id:b.id, accion:b.accion, ts:b.ts, actor:b.actor?.nombre, detalle:b.detalle }))}/>
            )}
          </div>

          {/* CFDIs */}
          {sol.cfdi?.length>0&&(
            <div className="card" style={{marginBottom:12}}>
              <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Comprobantes · {sol.cfdi.length}</div>
              <table className="t cards">
                <thead><tr><th>UUID</th><th>Emisor</th><th>Cuenta</th><th className="num">Total</th><th>SAT</th><th></th></tr></thead>
                <tbody>
                  {sol.cfdi.map((cf:any)=>(
                    <tr key={cf.id}>
                      <td className="mono uuid cell-sub" style={{fontSize:10}}>{cf.uuid?cf.uuid.slice(0,20)+"…":"—"}</td>
                      <td className="cell-title" style={{fontSize:11}}>{cf.emisor||"—"}</td>
                      <td className="mono cell-sub" style={{fontSize:10}}>{cf.cuenta}</td>
                      <td className="num cell-amount" data-label="Total">{fmtMXN(parseFloat(cf.total))}</td>
                      <td data-label="SAT">{cf.sat_estado&&<span style={{fontSize:10,padding:"2px 6px",borderRadius:8,
                        background:cf.sat_estado==="Vigente"?"var(--success-soft)":"var(--warn-soft)",
                        color:cf.sat_estado==="Vigente"?"var(--success)":"var(--warn)"}}>{cf.sat_estado}</span>}</td>
                      <td className="cell-actions">{cf.archivo_url&&<a href={cf.archivo_url} target="_blank" rel="noopener" className="btn sm ghost" style={{fontSize:11}} title="Descargar" aria-label="Descargar"><Download size={14} strokeWidth={2}/></a>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Comprobaciones ligadas */}
          {comprobacionesLigadas.length>0&&(
            <div className="card">
              <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Comprobaciones ligadas · {comprobacionesLigadas.length}</div>
              {comprobacionesLigadas.map((c:any)=>(
                <div key={c.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border)",alignItems:"center"}}>
                  <div>
                    <button onClick={()=>{setFolio(c.id);buscar(c.id)}}
                      style={{background:"none",border:"none",color:"var(--accent)",fontWeight:600,cursor:"pointer",fontFamily:"monospace",fontSize:12}}>
                      {c.id}
                    </button>
                    <span style={{fontSize:12,color:"var(--text-3)",marginLeft:8}}>{c.concepto}</span>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span className={`badge ${c.status}`}>{c.status}</span>
                    <span style={{fontWeight:600}}>{fmtMXN(parseFloat(c.monto))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

