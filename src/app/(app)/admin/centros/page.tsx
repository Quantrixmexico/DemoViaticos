"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Toast } from "@/components/ui/Toast"
import { Dialog } from "@/components/ui/Dialog"
import { Plus } from "lucide-react"

const DIVISIONES = ["4105","4106","4111","4113"]
const DEPTOS = ["Operaciones","Administración","Ventas","Finanzas","Recursos Humanos","Sistemas","Dirección"]

export default function AdminCentrosPage() {
  const [centros, setCentros] = useState<any[]>([])
  const [editing, setEditing] = useState<any|null>(null)
  const [busqueda, setBusqueda] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [toast, setToast] = useState<string|null>(null)

  const showToast = (m: string) => { setToast(m); setTimeout(()=>setToast(null),3000) }

  const load = async () => {
    const sb = createClient()
    const { data } = await sb.from("centros").select("*").order("id")
    setCentros(data || [])
  }
  useEffect(() => { load() }, [])

  const openNuevo = () => setEditing({ id:"", nombre:"", depto:"Operaciones", division:"4105", activo:true })

  const guardar = async () => {
    if (!editing) return
    if (!editing.id.trim() || !editing.nombre.trim()) { showToast("⚠ ID y nombre requeridos"); return }
    setGuardando(true)
    const sb = createClient()
    const exists = centros.find(c => c.id === editing.id)
    const row = { id: editing.id.toUpperCase().trim(), nombre: editing.nombre, depto: editing.depto, division: editing.division, activo: editing.activo ?? true }
    const { error } = exists
      ? await sb.from("centros").update(row).eq("id", editing.id)
      : await sb.from("centros").insert(row)
    if (error) showToast("⚠ " + error.message)
    else { showToast("✓ Guardado"); await load() }
    setEditing(null); setGuardando(false)
  }

  const toggleActivo = async (c: any) => {
    const sb = createClient()
    await sb.from("centros").update({ activo: !c.activo }).eq("id", c.id)
    showToast(c.activo ? "Centro desactivado" : "Centro activado")
    await load()
  }

  const filtrados = centros.filter(c =>
    !busqueda || c.id?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()))

  const esEdicion = !!editing && !!centros.find(c=>c.id===editing.id)

  return (
    <>
      <div className="page-head">
        <div><h1 className="page-title">Centros de beneficio</h1><div className="page-sub">{centros.length} registrados</div></div>
        <button className="btn primary" onClick={openNuevo}><Plus size={15} strokeWidth={2}/> Nuevo centro</button>
      </div>

      <Toast message={toast}/>

      <Dialog
        open={!!editing}
        onClose={()=>setEditing(null)}
        title={`${esEdicion?"Editar":"Nuevo"} centro`}
        description="Clave, nombre, departamento y división SAP del centro de beneficio"
        size="md"
        dismissible={!guardando}
        footer={<>
          <button className="btn ghost" onClick={()=>setEditing(null)} disabled={guardando}>Cancelar</button>
          <button className="btn primary" onClick={guardar} disabled={guardando}>{guardando?"Guardando…":"Guardar"}</button>
        </>}
      >
        {editing && (
          <div className="form-grid cols-2">
            {[
              {label:"Clave (ID)",key:"id",disabled:esEdicion},
              {label:"Nombre",key:"nombre"},
            ].map(({label,key,disabled})=>(
              <div key={key} className="field">
                <label>{label}</label>
                <input className="input" value={editing[key]||""} disabled={disabled}
                  onChange={e=>setEditing({...editing,[key]:e.target.value})} style={{textTransform:key==="id"?"uppercase":"none"}}/>
              </div>
            ))}
            <div className="field">
              <label>Departamento</label>
              <select className="select" value={editing.depto||""} onChange={e=>setEditing({...editing,depto:e.target.value})}>
                {DEPTOS.map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="field">
              <label>División SAP</label>
              <select className="select" value={editing.division||"4105"} onChange={e=>setEditing({...editing,division:e.target.value})}>
                {DIVISIONES.map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
        )}
      </Dialog>

      <input className="input" placeholder="Buscar por clave o nombre…" value={busqueda}
        onChange={e=>setBusqueda(e.target.value)} style={{marginBottom:14,maxWidth:340}}/>

      <div className="card" style={{padding:0,overflow:"auto"}}>
        <table className="t cards" style={{minWidth:600}}>
          <thead><tr><th>Clave</th><th>Nombre</th><th>Depto</th><th>División</th><th>Activo</th><th></th></tr></thead>
          <tbody>
            {filtrados.map((c:any)=>(
              <tr key={c.id} style={{opacity:c.activo?1:.5}}>
                <td className="mono cell-sub" style={{fontWeight:700}}>{c.id}</td>
                <td className="cell-title" style={{fontWeight:500}}>{c.nombre}</td>
                <td data-label="Depto" style={{fontSize:12,color:"var(--text-3)"}}>{c.depto}</td>
                <td className="mono" data-label="División" style={{fontSize:12}}>{c.division}</td>
                <td data-label="Activo"><span style={{fontSize:11,padding:"2px 8px",borderRadius:10,fontWeight:600,
                  background:c.activo?"var(--success-soft)":"var(--surface-2)",
                  color:c.activo?"var(--success)":"var(--text-3)"}}>{c.activo?"Activo":"Inactivo"}</span></td>
                <td className="cell-actions"><div style={{display:"flex",gap:6}}>
                  <button className="btn sm ghost" onClick={()=>setEditing({...c})}>Editar</button>
                  <button className="btn sm ghost" style={{color:c.activo?"var(--danger)":"var(--success)"}} onClick={()=>toggleActivo(c)}>
                    {c.activo?"Desactivar":"Activar"}
                  </button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
