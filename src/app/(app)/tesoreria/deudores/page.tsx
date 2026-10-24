"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { fmtMXN } from "@/lib/format"
import { SegmentedNav, TESORERIA_TABS } from "@/components/ui/SegmentedNav"
import { EmptyState } from "@/components/ui/EmptyState"
import { CheckCircle2 } from "lucide-react"

export default function TesoreriaDeudoresPage() {
  const [deudores, setDeudores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = createClient()
    // Get all anticipos with pending balance
    sb.from("solicitudes")
      .select("usuario_id, saldo_pendiente, id, concepto, usuarios!usuario_id(nombre, iniciales)")
      .in("status", ["liberado","parcial"])
      .gt("saldo_pendiente", 0)
      .eq("tipo", "anticipo")
      .order("saldo_pendiente", { ascending: false })
      .then(({ data }) => {
        // Group by usuario
        const byUser: Record<string, any> = {}
        ;(data || []).forEach((s: any) => {
          const uid = s.usuario_id
          if (!byUser[uid]) byUser[uid] = {
            userId: uid, nombre: s.usuarios?.nombre || "—",
            iniciales: s.usuarios?.iniciales || "??",
            total: 0, solicitudes: [],
          }
          byUser[uid].total += parseFloat(s.saldo_pendiente) || 0
          byUser[uid].solicitudes.push({ id: s.id, concepto: s.concepto, saldo: parseFloat(s.saldo_pendiente) })
        })
        setDeudores(Object.values(byUser).sort((a, b) => b.total - a.total))
        setLoading(false)
      })
  }, [])

  const totalGeneral = deudores.reduce((a, d) => a + d.total, 0)

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Deudores</h1>
          <div className="page-sub">
            {loading ? "Empleados con saldo de anticipo pendiente" : <>Saldo pendiente total: <strong style={{ color: "var(--warn)" }}>{fmtMXN(totalGeneral)}</strong></>}
          </div>
        </div>
        <SegmentedNav items={TESORERIA_TABS} ariaLabel="Vistas de tesorería"/>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>Cargando…</div>
      ) : deudores.length === 0 ? (
        <EmptyState icon={CheckCircle2} tone="success" title="Sin deudores" text="Todos los anticipos están comprobados."/>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {deudores.map(d => (
            <div key={d.userId} className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--danger-soft)",
                  color: "var(--danger)", display: "grid", placeItems: "center",
                  fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  {d.iniciales}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{d.nombre}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                    {d.solicitudes.length} anticipo{d.solicitudes.length > 1 ? "s" : ""} abierto{d.solicitudes.length > 1 ? "s" : ""}
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 18, color: "var(--danger)" }}>
                  {fmtMXN(d.total)}
                </div>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                {d.solicitudes.map((s: any) => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span className="mono" style={{ color: "var(--text-3)" }}>{s.id}</span>
                    <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, margin: "0 12px" }}>
                      {s.concepto}
                    </span>
                    <span style={{ fontWeight: 600, color: "var(--warn)" }}>{fmtMXN(s.saldo)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

