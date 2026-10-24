"use client"
import { AlertTriangle, AlarmClock, Send, Paperclip, X, ChevronRight } from "lucide-react"
import { EmptyState } from "@/components/ui/EmptyState"
import { Toast } from "@/components/ui/Toast"

import { notifyUsers } from "@/lib/notify"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { notificarGerente, insertNotif, usuariosPorRol } from "@/lib/notificaciones"
import { fmtMXN, fmtFecha } from "@/lib/format"
import { CompUploader } from "@/components/ui/CompUploader"
import { useCatalogos } from "@/hooks/useCatalogos"
import { isComidas } from "@/lib/cuentaComidas"
import { normalizaCuentaAsync } from "@/lib/normalizaCuenta"
import type { CfdItem, Solicitud } from "@/types"
import { Suspense } from "react"
import { SkeletonPage } from "@/components/ui/Skeleton"

function NuevaComprobacionInner() {
  const router = useRouter()
  const params = useSearchParams()
  const anticipoId = params.get("anticipo")
  const { catalogoGastos } = useCatalogos()

  const [anticipo, setAnticipo] = useState<Solicitud | null>(null)
  const [anticipos, setAnticipos] = useState<Solicitud[]>([])
  const [anticipoSel, setAnticipoSel] = useState<Solicitud | null>(null)
  const [items, setItems] = useState<CfdItem[]>([])
  const [enviando, setEnviando] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  const itemsValidos = items.filter(i => !i.duplicado)
  const total = itemsValidos.reduce((a, i) => a + (i.total || 0), 0)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      sb.from("solicitudes")
        .select("id, concepto, monto, status, saldo_pendiente, fecha, tipo")
        .eq("usuario_id", user.id)
        .eq("tipo", "anticipo")
        .in("status", ["liberado", "parcial"])
        .gt("saldo_pendiente", 0)
        .order("fecha", { ascending: false })
        .then(({ data }) => {
          const mapped = (data || []).map(s => ({
            id: s.id, tipo: s.tipo as any, concepto: s.concepto, usuario: user.id,
            monto: parseFloat(s.monto) || 0, fecha: new Date(s.fecha), status: s.status as any,
            saldoPendiente: parseFloat(s.saldo_pendiente) || 0, cfdi: [],
          }))
          setAnticipos(mapped)
          if (anticipoId) {
            const found = mapped.find(a => a.id === anticipoId)
            if (found) setAnticipoSel(found)
          }
        })
    })
  }, [anticipoId])

  const handleAdd = (newItems: CfdItem[]) => {
    setItems(prev => [...prev, ...newItems])
  }

  const handleEnviar = async () => {
    if (!anticipoSel)              { showToast("⚠ Selecciona el anticipo a comprobar", false); return }
    if (itemsValidos.length === 0) { showToast("⚠ Agrega al menos un comprobante XML válido", false); return }
    if (total <= 0)                { showToast("⚠ El total es cero", false); return }
    const sinCom = itemsValidos.filter(it => isComidas(it.cuenta, catalogoGastos) && !(it as any).observaciones?.trim())
    if (sinCom.length > 0) { showToast("⚠ Indica número y nombre de comensales en gastos de alimentos", false); return }

    setEnviando(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { router.push("/login"); return }

    const nuevoSaldo = Math.max(0, anticipoSel.saldoPendiente - total)
    const nuevoStatus = nuevoSaldo <= 0 ? "comprobado" : "parcial"
    const id = "CMP-" + new Date().getFullYear() + "-" + String(Date.now()).slice(-4)

    const { error } = await sb.from("solicitudes").insert({
      id, tipo: "comprobacion", concepto: `Comprobación de ${anticipoSel.id}`,
      usuario_id: user.id, monto: total, status: "solicitado",
      anticipo_ref: anticipoSel.id, saldo_pendiente: 0,
      comprobantes: itemsValidos.length, fecha: new Date().toISOString(),
    })
    if (error) { showToast("⚠ Error: " + error.message, false); setEnviando(false); return }

    // Save CFDIs
    await sb.from("comprobantes_cfdi").insert(itemsValidos.map(it => ({
      solicitud_id: id, uuid: it.uuid || `SIN-UUID-${Date.now()}`,
      emisor: it.emisor, concepto: it.concepto,
      subtotal: it.subtotal, iva: it.iva, total: it.total,
      cuenta: it.cuenta, confianza: it.confianza, archivo_url: it.archivoUrl,
      rfc_emisor: it.rfcEmisor, rfc_receptor: it.rfcReceptor,
    })))

    // Update anticipo saldo
    await sb.from("solicitudes")
      .update({ saldo_pendiente: nuevoSaldo, status: nuevoStatus, comprobantes: (anticipoSel as any).comprobantes + 1 })
      .eq("id", anticipoSel.id)

    await sb.from("bitacora").insert({
      solicitud_id: id, accion: "solicitado", usuario_id: user.id,
      detalle: `Comprobación ${fmtMXN(total)} del anticipo ${anticipoSel.id}`,
      ts: new Date().toISOString(),
    })

    // Notify gerente
    const { data: pf } = await sb.from("usuarios").select("gerente_id, nombre").eq("id", user.id).single()
    if (pf?.gerente_id) {
      await notifyUsers([pf.gerente_id], "Nueva comprobación por autorizar",
        `${pf.nombre} comprobó ${fmtMXN(total)} del anticipo ${anticipoSel.id}`, `/solicitudes/${id}`)
    }

    showToast("✓ Comprobación enviada a autorización")
    setTimeout(() => router.push("/solicitudes"), 1500)
  }

  return (
    <div className="form" style={{ maxWidth: 900 }}>
      <div className="page-head" style={{ marginBottom: 4 }}>
        <div>
          <h1 className="page-title">Nueva comprobación</h1>
          <div className="page-sub">Elige el anticipo y sube los CFDIs que lo comprueban.</div>
        </div>
      </div>

      {/* Anticipo selector */}
      <div className="card form-section">
        <div className="form-section-head">
          <div className="card-title">Anticipo a comprobar</div>
          {!anticipoSel && anticipos.length > 0 && <div className="form-section-desc">Solo se muestran los anticipos liberados con saldo pendiente.</div>}
        </div>
        {anticipos.length === 0 ? (
          <EmptyState variant="plain" compact icon={Paperclip} title="Nada por comprobar" text="No tienes anticipos liberados pendientes de comprobar."
            action={<button className="btn sm" onClick={() => router.push("/solicitudes/anticipo")}>Solicitar anticipo</button>}/>
        ) : anticipoSel ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{anticipoSel.id}</div>
              <div style={{ fontSize: 13, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{anticipoSel.concepto}</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                <span style={{ color: "var(--text-3)" }}>Saldo pendiente </span>
                <strong style={{ color: "var(--warn)", fontVariantNumeric: "tabular-nums" }}>{fmtMXN(anticipoSel.saldoPendiente)}</strong>
              </div>
            </div>
            <button className="btn sm" onClick={() => setAnticipoSel(null)}>Cambiar</button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {anticipos.map(a => (
              <button key={a.id} type="button" className="row-press"
                style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left",
                  padding: "12px 14px", borderRadius: 14, border: "1px solid var(--border-soft)",
                  background: "var(--surface-2)", color: "inherit", font: "inherit", cursor: "pointer" }}
                onClick={() => setAnticipoSel(a)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{a.id}</div>
                  <div style={{ fontSize: 12.5, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.concepto}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ color: "var(--warn)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmtMXN(a.saldoPendiente)}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{fmtFecha(a.fecha)}</div>
                </div>
                <ChevronRight size={16} strokeWidth={2} color="var(--text-3)" style={{ flexShrink: 0 }}/>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Uploader */}
      <CompUploader solicitudId={anticipoSel?.id} catalogoGastos={catalogoGastos} onAdd={handleAdd} />

      {/* Items list */}
      {items.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "auto" }}>
          <table className="t cards" style={{ minWidth: 960 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 100 }}>UUID</th>
                <th style={{ minWidth: 120 }}>Emisor</th>
                <th style={{ minWidth: 140 }}>Concepto</th>
                <th style={{ minWidth: 220 }}>Cuenta</th>
                <th style={{ minWidth: 220 }}>Comentarios</th>
                <th className="num" style={{ minWidth: 90 }}>Total</th>
                <th style={{ width: 32 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} style={{ ...(it.duplicado ? { textDecoration: "line-through", opacity: 0.5 } : {}) }}>
                  <td className="uuid cell-hide" style={{ fontSize: 10.5, maxWidth: 120, color: "var(--text-3)" }}>
                    <span title={it.uuid} onClick={() => navigator.clipboard.writeText(it.uuid)}
                      style={{ cursor: "pointer" }}>
                      {it.uuid ? it.uuid.slice(0, 18) + "…" : "—"}
                    </span>
                  </td>
                  <td className="cell-title" style={{ fontSize: 12 }}>{it.emisor}</td>
                  <td className="cell-sub" style={{ fontSize: 11, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {it.concepto}
                    {it.duplicado && (
                      <span style={{
                        color: (it as any).vencida ? "#fbbf24" : "var(--danger)",
                        fontSize: 10, marginLeft: 6, fontWeight: 600,
                      }}>
                        {(it as any).vencida ? <AlarmClock size={12} strokeWidth={2} style={{ verticalAlign:"-0.15em" }}/> : <AlertTriangle size={12} strokeWidth={2} style={{ verticalAlign:"-0.15em" }}/>} {it.motivoDup}
                      </span>
                    )}
                  </td>
                  <td className="cell-field" data-label="Cuenta">
                    {it.duplicado ? (
                      <span style={{ fontSize: 11 }}>{catalogoGastos.find(g => g.cuenta === it.cuenta)?.nombre}</span>
                    ) : (
                      <select className="select" value={it.cuenta}
                        onChange={e => setItems(prev => prev.map((x, j) => j === i ? { ...x, cuenta: e.target.value } : x))}
                        style={{ fontSize: 11, padding: "5px 6px",
                          borderColor: it.cuenta === "6121200001" ? "var(--warn)" : "var(--border)",
                          background: it.cuenta === "6121200001" ? "rgba(245,158,11,.06)" : "var(--surface)" }}>
                        {catalogoGastos.map(g => <option key={g.cuenta} value={g.cuenta}>{g.cuenta} · {g.nombre}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="cell-field" data-label="Comentarios">
                    <div>
                      <input
                        className="input"
                        value={(it as any).observaciones || ""}
                        onChange={e => setItems(prev => prev.map((x,j) => j===i ? {...x, observaciones: e.target.value} : x))}
                        placeholder={isComidas(it.cuenta, catalogoGastos) ? "Requerido: nombres y número de comensales" : "Opcional"}
                        style={{
                          fontSize:11, padding:"5px 6px",
                          borderColor: isComidas(it.cuenta, catalogoGastos) && !(it as any).observaciones ? "var(--danger)" : "var(--border)",
                          background: isComidas(it.cuenta, catalogoGastos) && !(it as any).observaciones ? "var(--danger-soft)" : "var(--surface)",
                        }}
                      />
                      {isComidas(it.cuenta, catalogoGastos) && !(it as any).observaciones && (
                        <div style={{fontSize:10,color:"var(--danger)",marginTop:2}}><AlertTriangle size={12} strokeWidth={2} color="currentColor" style={{verticalAlign:"middle",marginRight:3,display:"inline"}}/>Favor de indicar número y nombre de los comensales
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="num cell-amount" data-label="Total">{fmtMXN(it.total)}</td>
                  <td className="cell-actions">
                    <button className="line-remove" aria-label="Quitar comprobante"
                      onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}><X size={14} strokeWidth={2}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td colSpan={5} className="total-label">Total a comprobar</td>
                <td className="num total-value">{fmtMXN(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Toast */}
      <Toast message={toast?.msg} style={{ marginBottom: 0 }}/>

      <div className="form-actions">
        <button className="btn ghost" onClick={() => router.push("/solicitudes")}>Cancelar</button>
        <button className="btn primary" onClick={handleEnviar}
          disabled={enviando || !anticipoSel || total <= 0}
          style={{ opacity: enviando || !anticipoSel || total <= 0 ? 0.5 : 1 }}>
          {enviando ? "Enviando…" : <><Send size={15} strokeWidth={2}/> Enviar comprobación</>}
        </button>
      </div>
    </div>
  )
}

export default function NuevaComprobacionPage() {
  return (
    <Suspense fallback={<SkeletonPage/>}>
      <NuevaComprobacionInner />
    </Suspense>
  )
}


