"use client"
import { Send, Plus, X } from "lucide-react"
import { Toast } from "@/components/ui/Toast"

import { notifyUsers } from "@/lib/notify"
import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { notificarGerente, insertNotif, usuariosPorRol } from "@/lib/notificaciones"
import { fmtMXN } from "@/lib/format"
import { findCuenta } from "@/store/catalogos"
import { useCatalogos } from "@/hooks/useCatalogos"

interface DesgloseItem { id: string; cuenta: string; desc: string; monto: number }

const newItem = (): DesgloseItem => ({
  id: Math.random().toString(36).slice(2), cuenta: "6122200001", desc: "", monto: 0
})

export default function SolicitarAnticipoPage() {
  const router = useRouter()
  const { catalogoGastos, loaded } = useCatalogos()

  const [concepto, setConcepto]   = useState("")
  const [salida,   setSalida]     = useState("")
  const [regreso,  setRegreso]    = useState("")
  const [desglose, setDesglose]   = useState<DesgloseItem[]>([newItem()])
  const [enviando, setEnviando]   = useState(false)
  const [toast,    setToast]      = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500) }

  const totalDesg = desglose.reduce((a, d) => a + (d.monto || 0), 0)

  const updItem = (id: string, field: keyof DesgloseItem, val: string | number) =>
    setDesglose(prev => prev.map(d => d.id === id ? { ...d, [field]: val } : d))

  const handleEnviar = async () => {
    if (!concepto.trim())  { showToast("⚠ Escribe un concepto"); return }
    if (totalDesg <= 0)    { showToast("⚠ Agrega al menos un concepto con monto"); return }

    setEnviando(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { router.push("/login"); return }

    const { data: perfil } = await sb.from("usuarios").select("centro_id").eq("id", user.id).single()
    const id = "ANT-" + new Date().getFullYear() + "-" + String(Date.now()).slice(-4)

    const { error } = await sb.from("solicitudes").insert({
      id, tipo: "anticipo", concepto: concepto.trim(),
      usuario_id: user.id, monto: totalDesg, status: "solicitado",
      saldo_pendiente: totalDesg, centro_id: perfil?.centro_id ?? null,
      fecha: new Date().toISOString(),
    })

    if (error) { showToast("⚠ Error al guardar: " + error.message); setEnviando(false); return }

    if (desglose.some(d => d.monto > 0)) {
      await sb.from("solicitud_items").insert(
        desglose.filter(d => d.monto > 0).map((d, i) => ({
          solicitud_id: id, cuenta: d.cuenta,
          descripcion: d.desc || "", monto: d.monto, orden: i,
        }))
      )
    }

    // Registrar en bitácora
    await sb.from("bitacora").insert({
      solicitud_id: id, accion: "solicitado", usuario_id: user.id,
      detalle: `Anticipo creado por ${fmtMXN(totalDesg)}`, ts: new Date().toISOString(),
    })

    // Notify gerente
    const { data: pf } = await sb.from("usuarios").select("gerente_id, nombre").eq("id", user.id).single()
    if (pf?.gerente_id) {
      await notifyUsers([pf.gerente_id], "Nuevo anticipo por autorizar",
        `${pf.nombre} solicitó ${fmtMXN(totalDesg)} — ${concepto.trim()}`, `/solicitudes/${id}`)
    }

    showToast("✓ Anticipo enviado a autorización")
    setTimeout(() => router.push("/solicitudes"), 1500)
  }

  return (
    <div className="form" style={{ maxWidth: 720 }}>
      <div className="page-head" style={{ marginBottom: 4 }}>
        <div>
          <h1 className="page-title">Solicitar anticipo</h1>
          <div className="page-sub">Tu gerente lo recibe para autorizarlo en cuanto lo envíes.</div>
        </div>
      </div>

      {/* Datos generales */}
      <div className="card form-section">
        <div className="form-section-head">
          <div className="card-title">Datos del viaje</div>
          <div className="form-section-desc">Motivo y fechas del desplazamiento.</div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="concepto">Motivo o concepto<span className="req">*</span></label>
            <input id="concepto" className="input" value={concepto}
              onChange={e => setConcepto(e.target.value)}
              placeholder="Ej: Visita a cliente en Monterrey" />
          </div>
          <div className="form-grid cols-2">
            <div className="field">
              <label htmlFor="salida">Fecha de salida</label>
              <input id="salida" className="input" type="date" value={salida} onChange={e => setSalida(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="regreso">Fecha de regreso</label>
              <input id="regreso" className="input" type="date" value={regreso} onChange={e => setRegreso(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Desglose */}
      <div className="card form-section" style={{ paddingBottom: 0, overflow: "hidden" }}>
        <div className="spread form-section-head" style={{ alignItems: "flex-start" }}>
          <div>
            <div className="card-title">Desglose estimado</div>
            <div className="form-section-desc">Una línea por tipo de gasto; el monto es un estimado.</div>
          </div>
          <button className="btn sm" onClick={() => setDesglose(prev => [...prev, newItem()])}>
            <Plus size={14} strokeWidth={2.25}/> Agregar línea
          </button>
        </div>
        <div style={{ margin: "0 -20px", overflowX: "auto" }}>
        <table className="t" style={{ minWidth: 560 }}>
          <thead>
            <tr>
              <th style={{ width: "45%" }}>Cuenta contable</th>
              <th>Descripción</th>
              <th style={{ width: 110 }} className="num">Monto</th>
              <th style={{ width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {desglose.map(d => (
              <tr key={d.id}>
                <td>
                  <select className="select" value={d.cuenta}
                    onChange={e => updItem(d.id, "cuenta", e.target.value)}
                    style={{
                      fontSize: 12, padding: "7px 30px 7px 8px", minHeight: 36,
                      borderColor: d.cuenta === "6121200001" ? "var(--warn)" : undefined,
                      background: d.cuenta === "6121200001" ? "var(--warn-soft)" : undefined,
                    }}>
                    {catalogoGastos.map(g => (
                      <option key={g.cuenta} value={g.cuenta}>{g.cuenta} · {g.nombre}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input className="input" style={{ fontSize: 12, padding: "7px 8px", minHeight: 36 }} value={d.desc}
                    onChange={e => updItem(d.id, "desc", e.target.value)}
                    placeholder="Descripción opcional" />
                </td>
                <td>
                  <input className="input" type="number" min="0" step="0.01" inputMode="decimal"
                    style={{ textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums" }}
                    value={d.monto || ""}
                    onChange={e => updItem(d.id, "monto", parseFloat(e.target.value) || 0)} />
                </td>
                <td>
                  {desglose.length > 1 && (
                    <button className="line-remove" aria-label="Quitar línea"
                      onClick={() => setDesglose(prev => prev.filter(x => x.id !== d.id))}>
                      <X size={14} strokeWidth={2}/>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan={2} className="total-label">Total solicitado</td>
              <td className="num total-value">{fmtMXN(totalDesg)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
        </div>
      </div>

      {/* Toast */}
      <Toast message={toast} style={{ marginBottom: 0 }}/>

      {/* Actions */}
      <div className="form-actions">
        <button className="btn ghost" onClick={() => router.push("/solicitudes")}>Cancelar</button>
        <button className="btn primary" onClick={handleEnviar}
          disabled={enviando || totalDesg <= 0}
          style={{ opacity: enviando || totalDesg <= 0 ? 0.5 : 1 }}>
          {enviando ? "Enviando…" : <><Send size={15} strokeWidth={2}/> Enviar a autorización</>}
        </button>
      </div>
    </div>
  )
}

