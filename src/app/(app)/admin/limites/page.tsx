"use client"
import { useState, useEffect, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import { fmtMXN } from "@/lib/format"
import { Toast } from "@/components/ui/Toast"
import { Dialog } from "@/components/ui/Dialog"
import { Plus } from "lucide-react"

const ROLES = ["(todos)","usuario","gerente","tesoreria","contador","admin"]

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="field">
    <label>{label}</label>
    {children}
  </div>
)

export default function LimitesPage() {
  const [limites, setLimites] = useState<any[]>([])
  const [cuentas, setCuentas] = useState<any[]>([])
  const [editing, setEditing] = useState<any|null>(null)
  const [guardando, setGuardando] = useState(false)
  const [toast, setToast] = useState<string|null>(null)

  const showToast = (m:string)=>{ setToast(m); setTimeout(()=>setToast(null),3000) }
  const load = async () => {
    const sb = createClient()
    const [l,c] = await Promise.all([
      sb.from("limites_gasto").select("*").order("nombre"),
      sb.from("cuentas_contables").select("cuenta,nombre").eq("activo",true).order("cuenta"),
    ])
    setLimites(l.data||[]); setCuentas(c.data||[])
  }
  useEffect(()=>{ load() },[])

  const openNuevo = () => setEditing({ nombre:"", cuenta:null, limite_monto:null, limite_diario:null, aplica_rol:null, activo:true })

  const guardar = async () => {
    if (!editing) return
    if (!editing.nombre.trim()) { showToast("⚠ Nombre requerido"); return }
    setGuardando(true)
    const sb = createClient()
    const row = {
      nombre: editing.nombre,
      cuenta: editing.cuenta||null,
      limite_monto: editing.limite_monto ? parseFloat(editing.limite_monto) : null,
      limite_diario: editing.limite_diario ? parseFloat(editing.limite_diario) : null,
      aplica_rol: editing.aplica_rol||null,
      activo: editing.activo ?? true,
    }
    const { error } = editing.id
      ? await sb.from("limites_gasto").update(row).eq("id",editing.id)
      : await sb.from("limites_gasto").insert(row)
    if (error) showToast("⚠ "+error.message)
    else { showToast("✓ Guardado"); await load() }
    setEditing(null); setGuardando(false)
  }

  const toggleActivo = async (l:any) => {
    const sb = createClient()
    await sb.from("limites_gasto").update({ activo:!l.activo }).eq("id",l.id)
    await load()
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Límites de gasto</h1>
          <div className="page-sub">Reglas de negocio por cuenta contable y por día</div>
        </div>
        <button className="btn primary" onClick={openNuevo}><Plus size={15} strokeWidth={2}/> Nuevo límite</button>
      </div>

      <Toast message={toast}/>

      <Dialog
        open={!!editing}
        onClose={()=>setEditing(null)}
        title={`${editing?.id?"Editar":"Nuevo"} límite`}
        description="Tope por solicitud o por día para una cuenta contable y rol"
        size="md"
        dismissible={!guardando}
        footer={<>
          <button className="btn ghost" onClick={()=>setEditing(null)} disabled={guardando}>Cancelar</button>
          <button className="btn primary" onClick={guardar} disabled={guardando}>{guardando?"Guardando…":"Guardar"}</button>
        </>}
      >
        {editing && (
          <div className="form-grid">
            <Field label="Nombre del límite *">
              <input className="input" value={editing.nombre||""} onChange={e=>setEditing({...editing,nombre:e.target.value})} placeholder="Ej: Alimentos por viaje"/>
            </Field>
            <div className="form-grid cols-2">
              <Field label="Cuenta contable (opcional)">
                <select className="select" value={editing.cuenta||""} onChange={e=>setEditing({...editing,cuenta:e.target.value||null})}>
                  <option value="">— Todas las cuentas —</option>
                  {cuentas.map((c:any)=><option key={c.cuenta} value={c.cuenta}>{c.cuenta} · {c.nombre}</option>)}
                </select>
              </Field>
              <Field label="Aplica a rol">
                <select className="select" value={editing.aplica_rol||""} onChange={e=>setEditing({...editing,aplica_rol:e.target.value||null})}>
                  {ROLES.map(r=><option key={r} value={r==="(todos)"?"":r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Límite por solicitud ($)">
                <input className="input mono" type="number" min="0" value={editing.limite_monto||""} onChange={e=>setEditing({...editing,limite_monto:e.target.value})} placeholder="Sin límite"/>
              </Field>
              <Field label="Límite diario ($)">
                <input className="input mono" type="number" min="0" value={editing.limite_diario||""} onChange={e=>setEditing({...editing,limite_diario:e.target.value})} placeholder="Sin límite"/>
              </Field>
            </div>
          </div>
        )}
      </Dialog>

      <div className="card" style={{padding:0,overflow:"auto"}}>
        <table className="t cards" style={{minWidth:700}}>
          <thead><tr><th>Nombre</th><th>Cuenta</th><th>Rol</th><th className="num">Por solicitud</th><th className="num">Diario</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {limites.map((l:any)=>{
              const c = cuentas.find((x:any)=>x.cuenta===l.cuenta)
              return (
                <tr key={l.id} style={{opacity:l.activo?1:.5}}>
                  <td className="cell-title" style={{fontWeight:500}}>{l.nombre}</td>
                  <td className="cell-sub" style={{fontSize:11,color:"var(--text-3)"}}>{c?`${c.cuenta} · ${c.nombre}`:"Todas"}</td>
                  <td data-label="Rol"><span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:"var(--surface-2)"}}>{l.aplica_rol||"Todos"}</span></td>
                  <td className="num cell-amount" data-label="Por solicitud">{l.limite_monto?fmtMXN(l.limite_monto):"—"}</td>
                  <td className="num" data-label="Diario">{l.limite_diario?fmtMXN(l.limite_diario):"—"}</td>
                  <td data-label="Estado"><span style={{fontSize:11,padding:"2px 8px",borderRadius:10,fontWeight:600,
                    background:l.activo?"var(--success-soft)":"var(--surface-2)",
                    color:l.activo?"var(--success)":"var(--text-3)"}}>{l.activo?"Activo":"Inactivo"}</span></td>
                  <td className="cell-actions"><div style={{display:"flex",gap:6}}>
                    <button className="btn sm ghost" onClick={()=>setEditing({...l})}>Editar</button>
                    <button className="btn sm ghost" style={{color:l.activo?"var(--danger)":"var(--success)"}} onClick={()=>toggleActivo(l)}>
                      {l.activo?"Desactivar":"Activar"}
                    </button>
                  </div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
