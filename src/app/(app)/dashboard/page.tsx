"use client"
import { ArchivoLink } from "@/components/ui/ArchivoLink"
import type { LucideIcon } from "lucide-react"
import { Inbox, Clock, ShieldCheck, Banknote, FileText, Trophy, XCircle, RotateCcw, Paperclip, ChevronDown, X, MousePointerClick, Receipt, FolderOpen } from "lucide-react"
import { EmptyState } from "@/components/ui/EmptyState"
import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { fmtMXN, fmtFecha } from "@/lib/format"
import { StatusBadge, TipoBadge } from "@/components/ui/StatusBadge"

type Status = "solicitado"|"autorizado"|"validado"|"liberado"|"parcial"|"comprobado"|"rechazado"

const STATUS_CONFIG: Record<Status,{label:string,icon:LucideIcon,color:string,bg:string}> = {
  solicitado:  { label:"Por aprobar",    icon: Inbox, color:"var(--warn)",    bg:"var(--warn-soft)"    },
  autorizado:  { label:"Pend. Admin",    icon: Clock, color:"var(--st-violet)", bg:"color-mix(in srgb, var(--st-violet) 13%, transparent)"},
  validado:    { label:"Aut. Admin",     icon: ShieldCheck, color:"var(--accent)",  bg:"var(--accent-soft)"  },
  liberado:    { label:"Liberados",      icon: Banknote, color:"var(--st-blue)",   bg:"color-mix(in srgb, var(--st-blue) 13%, transparent)"},
  parcial:     { label:"Parcial",        icon: FileText, color:"var(--st-orange)", bg:"color-mix(in srgb, var(--st-orange) 13%, transparent)"},
  comprobado:  { label:"Comprobados",    icon: Trophy, color:"var(--success)", bg:"var(--success-soft)" },
  rechazado:   { label:"Rechazados",     icon: XCircle, color:"var(--danger)",  bg:"var(--danger-soft)"  },
}

export default function DashboardPage() {
  const router = useRouter()
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState<Status|null>(null)
  const [expandedId, setExpandedId] = useState<string|null>(null)
  const [userRol, setUserRol] = useState("")
  const [userId, setUserId] = useState("")

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(async ({data:{user}}) => {
      if (!user) return
      setUserId(user.id)
      const {data:perfil} = await sb.from("usuarios").select("rol").eq("id",user.id).single()
      const rol = perfil?.rol || ""
      setUserRol(rol)

      const [solRes, usrRes] = await Promise.all([
        sb.from("solicitudes")
          .select("id,tipo,concepto,monto,fecha,status,usuario_id,saldo_pendiente,anticipo_ref,comprobantes,cfdi:comprobantes_cfdi(id,uuid,emisor,total,cuenta,archivo_url)")
          .order("fecha",{ascending:false})
          .limit(500),
        sb.from("usuarios").select("id,nombre,iniciales,rol"),
      ])
      // usuario: own only | gerente/admin/tesoreria/contador: all
      const ownOnly = rol === "usuario"
      setSolicitudes(
        ownOnly
          ? (solRes.data||[]).filter((s:any) => s.usuario_id === user.id)
          : (solRes.data||[])
      )
      setUsuarios(usrRes.data||[])
      setLoading(false)
    })
  },[])

  const byStatus = useMemo(() => {
    const map: Record<string, any[]> = {}
    Object.keys(STATUS_CONFIG).forEach(s => map[s]=[])
    solicitudes.forEach(s => { if (map[s.status]) map[s.status].push(s) })
    return map
  }, [solicitudes])

  const findUser = (id:string) => usuarios.find(u=>u.id===id)

  const drillItems = activeStatus ? byStatus[activeStatus] : []

  const VALIDOS = ["liberado","comprobado"]  // KPIs: only settled amounts
  const solicitudesValidas = solicitudes.filter(s => VALIDOS.includes(s.status))
  const totalMonto = solicitudesValidas.reduce((a,s)=>a+parseFloat(s.monto||0),0)
  const saldoPendiente = solicitudes
    .filter(s=>["liberado","parcial"].includes(s.status)&&s.tipo==="anticipo"&&parseFloat(s.saldo_pendiente)>0)
    .reduce((a,s)=>a+parseFloat(s.saldo_pendiente||0),0)

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Workflow</h1>
          <div className="page-sub">
            {loading ? "Cargando solicitudes…" : `${solicitudes.filter(s=>s.status!=="rechazado").length} solicitudes activas, agrupadas por estatus`}
          </div>
        </div>
        {saldoPendiente > 0 && (
          <div className="popover head-figure">
            <div style={{fontSize:28,fontWeight:700,letterSpacing:"-0.03em",color:"var(--warn)",fontVariantNumeric:"tabular-nums"}}>
              <CountUp value={saldoPendiente} format={fmtMXN}/>
            </div>
            <div style={{fontSize:13,color:"var(--text-2)"}}>saldo por comprobar</div>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(136px,1fr))",gap:12}}>
          {Array.from({length:7}).map((_,i)=>(
            <div key={i} className="skeleton" style={{height:112,borderRadius:"var(--r-lg)"}}/>
          ))}
        </div>
      ) : (
        <>
          {/* ── KPI Status Cards ── */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(136px,1fr))",gap:12,marginBottom:16}}>
            {(Object.entries(STATUS_CONFIG) as [Status,any][]).map(([status,cfg],i)=>{
              const items = byStatus[status]
              const monto = items.reduce((a:number,s:any)=>a+parseFloat(s.monto||0),0)
              const isActive = activeStatus===status
              const StatusIcon = cfg.icon
              return (
                <button key={status} className="status-tile" aria-pressed={isActive}
                  onClick={()=>setActiveStatus(isActive?null:status)}
                  style={{ "--tile": cfg.color, "--i": i } as React.CSSProperties}>
                  <div className="tile-icon" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{width:32,height:32,borderRadius:10,display:"grid",placeItems:"center",background:cfg.bg}}>
                      <StatusIcon size={17} strokeWidth={2} color={cfg.color}/>
                    </span>
                  </div>
                  <div className="tile-num" style={{color:isActive?cfg.color:"var(--text)"}}>
                    <CountUp value={items.length}/>
                  </div>
                  <div style={{fontSize:13,fontWeight:500,color:isActive?cfg.color:"var(--text-2)",marginTop:6}}>{cfg.label}</div>
                  <div style={{fontSize:12,color:"var(--text-3)",marginTop:2,minHeight:16,fontVariantNumeric:"tabular-nums"}}>{monto > 0 ? fmtMXN(monto) : "Sin monto"}</div>
                </button>
              )
            })}
          </div>

          {/* ── Total bar ── */}
          <div className="card" style={{marginBottom:24,padding:"16px 20px"}}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>Flujo activo</div>
            <div className="flow-bar">
              {(Object.entries(STATUS_CONFIG) as [Status,any][]).map(([status,cfg])=>{
                // Exclude rechazado from progress bar (it distorts active flow)
                if (status === "rechazado") return null
                const validTotal = solicitudes.filter(s => s.status !== "rechazado").length
                const pct = validTotal ? byStatus[status].length/validTotal*100 : 0
                if (!pct) return null
                return <span key={status} title={`${cfg.label}: ${byStatus[status].length}`}
                  style={{width:`${pct}%`,background:cfg.color,transition:"width .8s var(--ease-out)"}}/>
              })}
            </div>
            <div style={{display:"flex",gap:"6px 18px",marginTop:12,flexWrap:"wrap"}}>
              {(Object.entries(STATUS_CONFIG) as [Status,any][]).map(([status,cfg])=>(
                byStatus[status].length > 0 &&
                <span key={status} style={{fontSize:12,color:"var(--text-2)",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:cfg.color,display:"inline-block"}}/>
                  {cfg.label}: {byStatus[status].length}
                </span>
              ))}
            </div>
          </div>

          {/* ── Drilldown ── */}
          {activeStatus && (
            <div key={activeStatus} className="page-enter">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:14,gap:12}}>
                <div>
                  <h2 style={{fontWeight:700,fontSize:22,letterSpacing:"-0.03em",display:"flex",alignItems:"center",gap:8}}>
                    {(() => { const StIcon = STATUS_CONFIG[activeStatus].icon; return <StIcon size={20} strokeWidth={2} color={STATUS_CONFIG[activeStatus].color}/> })()}
                    {STATUS_CONFIG[activeStatus].label}
                  </h2>
                  <div style={{color:"var(--text-2)",fontSize:13,marginTop:2}}>
                    {drillItems.length} {drillItems.length===1?"solicitud":"solicitudes"}, {fmtMXN(drillItems.reduce((a,s)=>a+parseFloat(s.monto||0),0))} en total
                  </div>
                </div>
                <button className="icon-btn" onClick={()=>setActiveStatus(null)} aria-label="Cerrar detalle">
                  <X size={16} strokeWidth={2}/>
                </button>
              </div>

              {drillItems.length === 0 && (
                <EmptyState compact icon={FolderOpen} title="Nada en este estatus" text="No hay solicitudes aquí por ahora."/>
              )}

              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {drillItems.map((s, idx) => {
                  const u = findUser(s.usuario_id)
                  const isExpanded = expandedId===s.id
                  const cfdis = s.cfdi||[]
                  return (
                    <div key={s.id} className="card list-item-in" style={{padding:0,overflow:"hidden","--i": Math.min(idx, 12),
                      borderColor: isExpanded ? "var(--border)" : undefined, transition:"border-color .2s"} as React.CSSProperties}>
                      {/* Header row */}
                      <div role="button" tabIndex={0} aria-expanded={isExpanded} className="row-press"
                        style={{padding:"14px 18px",display:"flex",gap:14,alignItems:"center",cursor:"pointer"}}
                        onClick={()=>setExpandedId(isExpanded?null:s.id)}
                        onKeyDown={e=>{ if (e.key==="Enter"||e.key===" ") { e.preventDefault(); setExpandedId(isExpanded?null:s.id) } }}>
                        <TipoBadge tipo={s.tipo}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span className="mono" style={{fontSize:11,color:"var(--text-3)"}}>{s.id}</span>
                            {u && <span style={{fontSize:12,fontWeight:500}}>{u.nombre}</span>}
                          </div>
                          <div style={{fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:2}}>
                            {s.concepto}
                          </div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{fontWeight:650,fontSize:15,letterSpacing:"-0.02em",fontVariantNumeric:"tabular-nums"}}>{fmtMXN(parseFloat(s.monto))}</div>
                          <div style={{fontSize:12,color:"var(--text-3)"}}>{fmtFecha(s.fecha)}</div>
                        </div>
                        <ChevronDown size={18} strokeWidth={2} color="var(--text-3)"
                          style={{flexShrink:0,transition:"transform .4s var(--ease-spring)",transform:isExpanded?"rotate(180deg)":"none"}}/>
                      </div>

                      {/* Expanded detail */}
                      <div className={`expand ${isExpanded ? "open" : ""}`}>
                      <div inert={!isExpanded}>
                      {(
                        <div style={{borderTop:"1px solid var(--border-soft)",padding:"16px 18px",
                          background:"var(--surface-2)",display:"flex",flexDirection:"column",gap:14}}>
                          {/* Meta */}
                          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10}}>
                            {[
                              {label:"Status",value:<StatusBadge status={s.status}/>},
                              {label:"Monto",value:fmtMXN(parseFloat(s.monto))},
                              ...(parseFloat(s.saldo_pendiente)>0?[{label:"Saldo pendiente",value:<span style={{color:"var(--warn)",fontWeight:600}}>{fmtMXN(parseFloat(s.saldo_pendiente))}</span>}]:[]),
                              {label:"Comprobantes",value:`${cfdis.length} CFDIs`},
                              {label:"Fecha",value:fmtFecha(s.fecha)},
                              ...(s.anticipo_ref?[{label:"Anticipo ref.",value:<span className="mono" style={{fontSize:11}}>{s.anticipo_ref}</span>}]:[]),
                            ].map(({label,value})=>(
                              <div key={label}>
                                <div style={{fontSize:12,color:"var(--text-3)",marginBottom:3}}>{label}</div>
                                <div style={{fontSize:13,fontWeight:500}}>{value}</div>
                              </div>
                            ))}
                          </div>

                          {/* CFDIs + Adjuntos */}
                          {cfdis.length>0&&(
                            <div>
                              <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>Comprobantes</div>
                              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                                {cfdis.map((cf:any)=>(
                                  <div key={cf.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",
                                    background:"var(--surface)",borderRadius:12,fontSize:13}}>
                                    <Receipt size={15} strokeWidth={1.75} color="var(--text-3)" style={{flexShrink:0}}/>
                                    <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cf.emisor||"—"}</span>
                                    <span className="mono" style={{fontSize:10,color:"var(--text-3)"}}>{cf.cuenta}</span>
                                    <span style={{fontWeight:600}}>{fmtMXN(parseFloat(cf.total))}</span>
                                    {cf.archivo_url&&(
                                      <ArchivoLink archivo={cf.archivo_url} style={{padding:"4px 8px"}} title="Descargar comprobante"/>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                            <button className="btn sm" onClick={()=>router.push(`/solicitudes/${s.id}`)}>
                              Ver detalle completo
                            </button>
                            {s.status==="solicitado"&&(userRol==="gerente"||userRol==="admin")&&(
                              <button className="btn sm primary" onClick={()=>router.push("/gerente")}>
                                Ir a bandeja
                              </button>
                            )}
                            {s.status==="autorizado"&&(userRol==="admin")&&(
                              <button className="btn sm" style={{background:"var(--st-violet)",border:"none",color:"var(--on-accent)",fontWeight:600}}
                                onClick={()=>router.push("/admin/validar")}>
                                <ShieldCheck size={14} strokeWidth={2}/>Validar
                              </button>
                            )}
                            {s.status==="validado"&&(userRol==="tesoreria"||userRol==="admin")&&(
                              <button className="btn sm primary" onClick={()=>router.push("/tesoreria")}>
                                Liberar pago
                              </button>
                            )}
                            {s.status==="liberado"&&s.tipo==="anticipo"&&(
                              <button className="btn sm primary"
                                onClick={()=>router.push(`/solicitudes/comprobacion?anticipo=${s.id}`)}>
                                <Paperclip size={14} strokeWidth={2}/>Comprobar
                              </button>
                            )}
                            {s.status==="parcial"&&s.tipo==="anticipo"&&(
                              <button className="btn sm"
                                style={{background:"var(--warn)",border:"none",color:"#1f1300",fontWeight:600}}
                                onClick={()=>router.push(`/solicitudes/comprobacion?anticipo=${s.id}`)}>
                                <Paperclip size={14} strokeWidth={2}/>Comprobar saldo
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Empty state when no status selected */}
          {!activeStatus && (
            <div className="page-enter">
              <EmptyState icon={MousePointerClick} tone="accent" title="Elige un estatus" text="Toca una tarjeta para ver sus solicitudes."/>
            </div>
          )}
        </>
      )}
    </>
  )
}



// Anima un número desde su valor anterior hasta el nuevo (ease-out, ~0.9 s)
function CountUp({ value, format }: { value: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const start = performance.now(), a = from.current, dur = reduce ? 1 : 900
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      const v = a + (value - a) * (1 - Math.pow(1 - p, 4))
      setShown(v)
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); from.current = value }
  }, [value])
  return <>{format ? format(shown) : Math.round(shown)}</>
}
