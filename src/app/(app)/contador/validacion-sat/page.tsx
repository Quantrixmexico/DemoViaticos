"use client"
import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { fmtMXN } from "@/lib/format"
import { Download, CheckCircle2, Paperclip, AlertTriangle, XCircle, ShieldCheck } from "lucide-react"
import { StatCards } from "@/components/ui/StatCards"
import { EmptyState } from "@/components/ui/EmptyState"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function ValidacionSATPage() {
  const [cfdis, setCfdis] = useState<any[]>([])
  const [resultados, setResultados] = useState<any[]|null>(null)
  const [validando, setValidando] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [mes, setMes] = useState(()=>new Date().toISOString().slice(0,7))
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    const sb = createClient()
    sb.from("comprobantes_cfdi")
      .select("uuid, rfc_emisor, rfc_receptor, total, emisor, solicitud_id, solicitudes!inner(fecha)")
      .not("uuid","like","CIERRE%").then(({data})=>{
        setCfdis(data||[]); setLoading(false)
      })
  },[])

  const cfdisDelMes = useMemo(()=>{
    return cfdis.filter(c=>{
      const uuid = (c.uuid||"").trim()
      if (!uuid||uuid.endsWith("…")||uuid.endsWith("...")||!UUID_RE.test(uuid)) return false
      const fecha = c.solicitudes?.fecha
      if (!fecha) return false
      return fecha.slice(0,7) === mes
    }).reduce((acc:any[],c)=>{
      if (!acc.find(x=>x.uuid===c.uuid)) acc.push(c)
      return acc
    },[])
  },[cfdis,mes])

  const validar = async () => {
    if (!cfdisDelMes.length) return
    setValidando(true); setResultados(null); setProgreso(0)
    const LOTE = 20
    const todos: any[] = []
    for (let i=0; i<cfdisDelMes.length; i+=LOTE) {
      const lote = cfdisDelMes.slice(i,i+LOTE).map(c=>({
        uuid:c.uuid, rfcEmisor:c.rfc_emisor||"", rfcReceptor:c.rfc_receptor||"", total:c.total||0,
        emisor:c.emisor||"", folio:c.solicitud_id,
      }))
      const res = await fetch("/api/sat/validate", {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({cfdis:lote})
      })
      const data = await res.json()
      todos.push(...(data.resultados||[]).map((r:any,j:number)=>({...r, emisor:lote[j]?.emisor, folio:lote[j]?.folio})))
      setProgreso(Math.round(((i+lote.length)/cfdisDelMes.length)*100))
    }
    setResultados(todos); setValidando(false)
  }

  const exportCSV = () => {
    if (!resultados) return
    const rows = [["Folio","UUID","Emisor","Estado","Método","URL Verificación"],
      ...resultados.map(r=>[r.folio||"",r.uuid,r.emisor||"",r.estado,r.metodo||"",r.urlVerificacionSAT||""])]
    const csv = rows.map(r=>r.map(v=>`"${v}"`).join(",")).join("\n")
    const a = document.createElement("a"); a.href=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv"}))
    a.download=`validacion_sat_${mes}.csv`; a.click()
  }

  const resumen = useMemo(()=>{
    if (!resultados) return null
    return {
      vigentes: resultados.filter(r=>r.estado==="Vigente").length,
      cancelados: resultados.filter(r=>r.estado==="Cancelado").length,
      noEncontrados: resultados.filter(r=>r.estado==="No Encontrado").length,
      locales: resultados.filter(r=>r.metodo==="local"&&r.valido!==false).length,
      errores: resultados.filter(r=>!r.valido||r.estado==="Error").length,
    }
  },[resultados])

  const estadoColor = (e:string) => ({
    "Vigente":"var(--success)","Cancelado":"var(--danger)",
    "No Encontrado":"var(--warn)","Estructura válida":"var(--accent)","Error":"var(--text-3)"
  }[e]||"var(--text-3)")

  const pdfsOImagenes = cfdis.filter(c=>{
    const uuid=(c.uuid||"").trim()
    const fecha=c.solicitudes?.fecha
    return (!fecha||fecha.slice(0,7)===mes)&&(!uuid||!UUID_RE.test(uuid))&&!uuid.startsWith("CIERRE")
  }).length

  const truncados = cfdis.filter(c=>{
    const uuid=(c.uuid||"").trim()
    const fecha=c.solicitudes?.fecha
    return (fecha?.slice(0,7)===mes)&&(uuid.endsWith("…")||uuid.endsWith("..."))
  }).length

  return (
    <>
      <div className="page-head">
        <div><h1 className="page-title">Validación SAT</h1><div className="page-sub">Verifica el estatus de CFDIs ante el SAT</div></div>
        {resultados && <button className="btn ghost" onClick={exportCSV}><Download size={15} strokeWidth={2}/> CSV</button>}
      </div>

      {(pdfsOImagenes>0||truncados>0) && (
        <div className="card" style={{marginBottom:16,fontSize:12.5}}>
          <div style={{fontWeight:600,marginBottom:6}}>Resumen del mes {mes}</div>
          <div style={{color:"var(--text-2)",lineHeight:1.7}}>
            <div><CheckCircle2 size={14} strokeWidth={2} color="var(--success)" style={{verticalAlign:"-0.15em"}}/> <strong>{cfdisDelMes.length}</strong> CFDIs con UUID válido — serán validados</div>
            {pdfsOImagenes>0&&<div><Paperclip size={14} strokeWidth={2} style={{verticalAlign:"-0.15em"}}/> <strong>{pdfsOImagenes}</strong> PDFs/imágenes — no aplica validación SAT</div>}
            {truncados>0&&<div style={{color:"var(--warn)"}}><AlertTriangle size={14} strokeWidth={2} color="var(--warn)" style={{verticalAlign:"-0.15em"}}/> <strong>{truncados}</strong> UUIDs truncados en BD — sube el XML de nuevo</div>}
          </div>
        </div>
      )}

      <div className="card" style={{marginBottom:16}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
          <div>
            <label style={{fontSize:11,color:"var(--text-3)",display:"block",marginBottom:4}}>Mes a validar</label>
            <input className="input" type="month" value={mes} onChange={e=>{setMes(e.target.value);setResultados(null)}} style={{width:160}}/>
          </div>
          <button className="btn primary" onClick={validar} disabled={validando||cfdisDelMes.length===0}>
            {validando?`Validando… ${progreso}%`:`Validar ${cfdisDelMes.length} CFDIs ante SAT`}
          </button>
          {validando && (
            <div style={{flex:1,height:6,background:"var(--border)",borderRadius:4,minWidth:160}}>
              <div style={{height:"100%",width:progreso+"%",background:"var(--accent)",borderRadius:4,transition:"width .3s"}}/>
            </div>
          )}
        </div>
      </div>

      {resumen && (
        <StatCards min={130} items={[
          {label:"Vigentes",value:resumen.vigentes,color:"var(--success)"},
          {label:"Cancelados",value:resumen.cancelados,color:"var(--danger)"},
          {label:"No encontrados",value:resumen.noEncontrados,color:"var(--warn)"},
          {label:"Solo local *",value:resumen.locales,color:"var(--accent)"},
        ]}/>
      )}

      {resultados && (
        <div className="card" style={{padding:0,overflow:"auto"}}>
          <table className="t" style={{fontSize:12}}>
            <thead><tr>
              <th>Folio</th>
              <th style={{minWidth:295}}>UUID</th>
              <th>Emisor</th>
              <th>Estado</th>
              <th>Método</th>
              <th>SAT.gob</th>
            </tr></thead>
            <tbody>
              {resultados.map((r,i)=>(
                <tr key={i}>
                  <td className="mono" style={{fontSize:10}}>{r.folio}</td>
                  <td style={{fontFamily:"monospace",fontSize:10.5,wordBreak:"break-all"}}>
                    <span onClick={()=>navigator.clipboard.writeText(r.uuid)}
                      style={{cursor:"pointer",padding:"2px 6px",borderRadius:4,display:"inline-block"}}
                      title="Clic para copiar">{r.uuid}</span>
                  </td>
                  <td style={{fontSize:11}}>{r.emisor||"—"}</td>
                  <td>
                    <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,fontWeight:600,
                      background:estadoColor(r.estado)+"22",color:estadoColor(r.estado)}}>
                      {r.estado==="Vigente"?<><CheckCircle2 size={14} strokeWidth={2} color="var(--success)" style={{verticalAlign:"-0.15em"}}/> Vigente</>:r.estado==="Cancelado"?<><XCircle size={14} strokeWidth={2} color="var(--danger)" style={{verticalAlign:"-0.15em"}}/> Cancelado</>:r.estado}
                    </span>
                  </td>
                  <td>
                    <span style={{fontSize:10,padding:"2px 6px",borderRadius:8,
                      background:r.metodo==="sat-soap"?"var(--success-soft)":"var(--surface-2)",
                      color:r.metodo==="sat-soap"?"var(--success)":"var(--text-3)"}}>
                      {r.metodo==="sat-soap"?"SAT":"Local"}
                    </span>
                  </td>
                  <td>
                    {r.urlVerificacionSAT
                      ? <a href={r.urlVerificacionSAT} target="_blank" rel="noopener"
                          style={{fontSize:11,color:"var(--accent)"}}>Verificar</a>
                      : <span style={{fontSize:10,color:"var(--text-3)"}}>Sin RFC</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!resultados && !validando && cfdisDelMes.length>0 && (
        <EmptyState icon={ShieldCheck} tone="accent" title={`${cfdisDelMes.length} CFDIs listos para validar`}
          text={<>
            Se verificará RFC, monto y estructura localmente. Si el SAT responde, también se consulta el estatus de cancelación.
            {truncados>0&&<div style={{marginTop:10,fontSize:11.5,color:"var(--text-3)",padding:"8px 12px",background:"var(--surface-2)",borderRadius:8}}>
              * CFDIs "Solo local" tienen estructura válida pero el SAT no respondió. Usa "Verificar" en tu navegador.
            </div>}
          </>}/>
      )}
    </>
  )
}

