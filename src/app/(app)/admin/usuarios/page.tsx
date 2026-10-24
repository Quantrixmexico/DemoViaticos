"use client"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useUsuario } from "@/lib/UsuarioContext"
import { esDemo, MSG_DEMO_BLOQUEADO, rolesAsignables } from "@/lib/permisos"
import { Toast } from "@/components/ui/Toast"
import { Dialog } from "@/components/ui/Dialog"
import { useConfirm } from "@/components/ui/Confirm"
import { Plus, KeyRound, X } from "lucide-react"
import { SkeletonList } from "@/components/ui/Skeleton"


async function callWorker(action: string, payload: any) {
  const res = await fetch(`/api/admin/users/${action}`, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Error Worker")
  return data
}

const ROL_COLOR: Record<string,string> = {
  admin:"var(--accent)",gerente:"var(--success)",tesoreria:"#60a5fa",contador:"#c084fc",usuario:"var(--text-3)"
}


const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="field">
    <label>{label}</label>
    {children}
  </div>
)

export default function AdminUsuariosPage() {
  const usuarioActual = useUsuario()
  const soyDemo = esDemo(usuarioActual.rol)
  const ROLES = rolesAsignables(usuarioActual.rol)
  const confirm = useConfirm()
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [centros, setCentros] = useState<any[]>([])
  const [divisiones, setDivisiones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<any|null>(null)
  const [creando, setCreando] = useState(false)
  const [pwdUser, setPwdUser] = useState<{ id:string; nombre:string }|null>(null)
  const [pwdNueva, setPwdNueva] = useState("")
  const [pwdGuardando, setPwdGuardando] = useState(false)
  const [nuevoForm, setNuevoForm] = useState({ nombre:"", correo:"", password:"", rol:"usuario", centro_id:"", gerente_id:"", division:"4105" })
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [toast, setToast] = useState<string|null>(null)

  const showToast = (m:string) => { setToast(m); setTimeout(()=>setToast(null),3500) }

  const load = useCallback(async () => {
    const sb = createClient()
    const [u,c] = await Promise.all([
      sb.from("usuarios").select("*").eq("activo",true).order("nombre"),
      sb.from("centros").select("id,nombre").eq("activo",true).order("nombre"),
    ])
    setUsuarios(u.data||[]); setCentros(c.data||[]); const { data: dataD } = await sb.from("divisiones").select("*").eq("activo", true).order("codigo"); setDivisiones(dataD || []); setLoading(false)
  },[])
  useEffect(()=>{ load() },[load])

  const guardar = async () => {
    if (!editando) return
    if (!editando.centro_id) { showToast("⚠ Debe asignar un Centro de beneficio al usuario"); return }
    setGuardando(true)
    const sb = createClient()
    const row = {
      nombre:editando.nombre, rol:editando.rol,
      centro_id:editando.centro_id||null, gerente_id:editando.gerente_id||null,
      division:editando.division||"4105", clabe:editando.clabe||null, banco:editando.banco||null,
      iniciales:editando.nombre.split(" ").map((p:string)=>p[0]).slice(0,2).join("").toUpperCase(),
    }
    const { error } = await sb.from("usuarios").update(row).eq("id",editando.id)
    if (error) showToast("⚠ "+error.message)
    else { showToast("✓ Actualizado"); await load() }
    setEditando(null); setGuardando(false)
  }

  const crearUsuario = async () => {
    const { nombre,correo,password,rol,centro_id,gerente_id,division } = nuevoForm
    if (!centro_id) { showToast("⚠ Debe asignar un Centro de beneficio al usuario"); return }
    if (!nombre.trim() || !correo.trim() || !password) { showToast("⚠ Nombre, correo y contraseña son obligatorios"); return }
    if (!nombre.trim()||!correo.trim()||!password.trim()) { showToast("⚠ Nombre, correo y contraseña requeridos"); return }
    setGuardando(true)
    try {
      await callWorker("createUser", { nombre,email:correo,password,rol,centro:centro_id||null,gerente:gerente_id||null,division })
      showToast("✓ Usuario creado")
      setCreando(false)
      setNuevoForm({ nombre:"",correo:"",password:"",rol:"usuario",centro_id:"",gerente_id:"",division:"4105" })
      await load()
    } catch(e:any) { showToast("⚠ "+e.message) }
    setGuardando(false)
  }

  const resetPassword = (userId:string, nombre:string) => {
    if (soyDemo) { showToast(MSG_DEMO_BLOQUEADO); return }
    setPwdNueva(""); setPwdUser({ id:userId, nombre })
  }

  const guardarPassword = async () => {
    if (!pwdUser || pwdNueva.length < 6) return
    setPwdGuardando(true)
    try {
      await callWorker("resetPassword", { userId:pwdUser.id, newPassword:pwdNueva })
      showToast("✓ Contraseña actualizada")
      setPwdUser(null)
    } catch(e:any) { showToast("⚠ "+e.message) }
    setPwdGuardando(false)
  }

  const desactivar = async (id:string, nombre:string) => {
    if (soyDemo) { showToast(MSG_DEMO_BLOQUEADO); return }
    if (!(await confirm({ title:`¿Desactivar a ${nombre}?`, text:"Dejará de poder entrar; puedes reactivarle después.", confirmLabel:"Desactivar", tone:"danger" }))) return
    const sb = createClient()
    await sb.from("usuarios").update({ activo:false }).eq("id",id)
    showToast("Usuario desactivado")
    await load()
  }

  const filtrados = usuarios.filter(u =>
    !busqueda || u.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.correo?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.rol?.toLowerCase().includes(busqueda.toLowerCase()))



  return (
    <>
      <div className="page-head">
        <div><h1 className="page-title">Usuarios</h1><div className="page-sub">{usuarios.length} registrados</div></div>
        <button className="btn primary" onClick={()=>setCreando(true)}><Plus size={15} strokeWidth={2}/> Nuevo usuario</button>
      </div>

      <Toast message={toast}/>

      {/* Modal nuevo usuario */}
      <Dialog open={creando} onClose={()=>setCreando(false)} title="Nuevo usuario" dismissible={!guardando}
        footer={<>
          <button className="btn ghost" onClick={()=>setCreando(false)}>Cancelar</button>
          <button className="btn primary" onClick={crearUsuario} disabled={guardando}>{guardando?"Guardando…":"Guardar"}</button>
        </>}>
        <div className="form-grid cols-2">
          <FormField label="Nombre completo">
            <input className="input" value={nuevoForm.nombre} onChange={e=>setNuevoForm({...nuevoForm,nombre:e.target.value})}/>
          </FormField>
          <FormField label="Correo electrónico">
            <input className="input" type="email" value={nuevoForm.correo} onChange={e=>setNuevoForm({...nuevoForm,correo:e.target.value})}/>
          </FormField>
          <FormField label="Contraseña inicial">
            <input className="input" type="password" value={nuevoForm.password} onChange={e=>setNuevoForm({...nuevoForm,password:e.target.value})}/>
          </FormField>
          <FormField label="Rol">
            <select className="select" value={nuevoForm.rol} onChange={e=>setNuevoForm({...nuevoForm,rol:e.target.value})}>
              {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
          </FormField>
          <FormField label="División SAP">
            <select className="select" value={nuevoForm.division} onChange={e=>setNuevoForm({...nuevoForm,division:e.target.value})}>
              {divisiones.map((d:any)=><option key={d.codigo} value={d.codigo}>{d.codigo} · {d.nombre}</option>)}
            </select>
          </FormField>
          <FormField label="Centro de beneficio *">
            <select className="select" required value={nuevoForm.centro_id} onChange={e=>setNuevoForm({...nuevoForm,centro_id:e.target.value})} style={{borderColor:!nuevoForm.centro_id?"var(--danger)":"var(--border)"}}>
              <option value="">— Sin centro —</option>
              {centros.map((c:any)=><option key={c.id} value={c.id}>{c.id} · {c.nombre}</option>)}
            </select>
          </FormField>
          <FormField label="Gerente directo">
            <select className="select" value={nuevoForm.gerente_id} onChange={e=>setNuevoForm({...nuevoForm,gerente_id:e.target.value})}>
              <option value="">— Sin gerente —</option>
              {usuarios.filter(u=>["gerente","admin"].includes(u.rol)).map((u:any)=><option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </FormField>
        </div>
      </Dialog>

      {/* Modal editar */}
      <Dialog open={!!editando} onClose={()=>setEditando(null)} title={`Editar · ${editando?.nombre ?? ""}`} dismissible={!guardando}
        footer={<>
          <button className="btn ghost" onClick={()=>setEditando(null)}>Cancelar</button>
          <button className="btn primary" onClick={guardar} disabled={guardando}>{guardando?"Guardando…":"Guardar"}</button>
        </>}>
        {editando && <div className="form-grid cols-2">
          <FormField label="Nombre">
            <input className="input" value={editando.nombre||""} onChange={e=>setEditando({...editando,nombre:e.target.value})}/>
          </FormField>
          <FormField label="Correo">
            <input className="input" type="email" value={editando.correo||""} disabled/>
          </FormField>
          <FormField label="Rol">
            <select className="select" value={editando.rol} onChange={e=>setEditando({...editando,rol:e.target.value})}>
              {ROLES.map(r=><option key={r}>{r}</option>)}
            </select>
          </FormField>
          <FormField label="División">
            <select className="select" value={editando.division||"4105"} onChange={e=>setEditando({...editando,division:e.target.value})}>
              {divisiones.map((d:any)=><option key={d.codigo} value={d.codigo}>{d.codigo} · {d.nombre}</option>)}
            </select>
          </FormField>
          <FormField label="Centro">
            <select className="select" required value={editando.centro_id||""} onChange={e=>setEditando({...editando,centro_id:e.target.value||null})} style={{borderColor:!editando.centro_id?"var(--danger)":"var(--border)"}}>
              <option value="">— Sin centro —</option>
              {centros.map((c:any)=><option key={c.id} value={c.id}>{c.id} · {c.nombre}</option>)}
            </select>
          </FormField>
          <FormField label="Gerente">
            <select className="select" value={editando.gerente_id||""} onChange={e=>setEditando({...editando,gerente_id:e.target.value||null})}>
              <option value="">— Sin gerente —</option>
              {usuarios.filter(u=>["gerente","admin"].includes(u.rol)&&u.id!==editando.id).map((u:any)=><option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </FormField>
          <FormField label="CLABE">
            <input className="input mono" value={editando.clabe||""} onChange={e=>setEditando({...editando,clabe:e.target.value})}/>
          </FormField>
          <FormField label="Banco">
            <input className="input" value={editando.banco||""} onChange={e=>setEditando({...editando,banco:e.target.value})}/>
          </FormField>
        </div>}
      </Dialog>

      <Dialog open={!!pwdUser} onClose={()=>setPwdUser(null)} size="sm" dismissible={!pwdGuardando}
        title="Cambiar contraseña" description={pwdUser ? `Para ${pwdUser.nombre}. Tendrá que usarla en su próximo inicio de sesión.` : ""}
        footer={<>
          <button className="btn ghost" onClick={()=>setPwdUser(null)}>Cancelar</button>
          <button className="btn primary" onClick={guardarPassword} disabled={pwdGuardando || pwdNueva.length < 6}>
            {pwdGuardando ? "Guardando…" : "Guardar contraseña"}
          </button>
        </>}>
        <div className="field">
          <label htmlFor="pwd-nueva">Nueva contraseña</label>
          <input id="pwd-nueva" className="input" type="password" autoComplete="new-password" value={pwdNueva}
            onChange={e=>setPwdNueva(e.target.value)}
            onKeyDown={e=>{ if (e.key==="Enter") guardarPassword() }}/>
          <div className="field-hint">Mínimo 6 caracteres.</div>
        </div>
      </Dialog>

      <input className="input" placeholder="Buscar por nombre, correo o rol…" value={busqueda}
        onChange={e=>setBusqueda(e.target.value)} style={{marginBottom:14,maxWidth:380}}/>

      <div className="card" style={{padding:0,overflow:"hidden"}}>
        {loading ? (
          <SkeletonList rows={6} card={false}/>
        ) : (
          <table className="t cards">
            <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>División</th><th>Centro</th><th></th></tr></thead>
            <tbody>
              {filtrados.map((u:any)=>(
                <tr key={u.id}>
                  <td className="cell-title"><div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:30,height:30,borderRadius:"50%",background:"var(--surface-2)",border:"1px solid var(--border)",display:"grid",placeItems:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{u.iniciales||"??"}</div>
                    <span style={{fontWeight:500}}>{u.nombre}</span>
                  </div></td>
                  <td className="cell-sub" style={{fontSize:12,color:"var(--text-3)"}}>{u.correo}</td>
                  <td data-label="Rol"><span style={{fontSize:11,padding:"2px 10px",borderRadius:12,background:ROL_COLOR[u.rol]+"22",color:ROL_COLOR[u.rol],fontWeight:600}}>{u.rol}</span></td>
                  <td className="mono" data-label="División" style={{fontSize:12}}>{u.division||"4105"}</td>
                  <td data-label="Centro" style={{fontSize:12,color:"var(--text-3)"}}>{centros.find((c:any)=>c.id===u.centro_id)?.nombre||"—"}</td>
                  <td className="cell-actions"><div style={{display:"flex",gap:4}}>
                    <button className="btn sm ghost" onClick={()=>setEditando({...u})}>Editar</button>
                    <button className="icon-btn" onClick={()=>resetPassword(u.id, u.nombre)} title="Cambiar contraseña" aria-label="Cambiar contraseña"><KeyRound size={15} strokeWidth={1.75}/></button>
                    <button className="icon-btn" style={{color:"var(--danger)"}} onClick={()=>desactivar(u.id,u.nombre)} title="Desactivar usuario" aria-label="Desactivar usuario"><X size={15} strokeWidth={1.75}/></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}


