import { urlsFirmadas } from "@/lib/archivos"
import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { fmtMXN, fmtFecha } from "@/lib/format"
import { StatusBadge, TipoBadge } from "@/components/ui/StatusBadge"
import { Stepper } from "@/components/ui/Stepper"
import Link from "next/link"
import { ArrowLeft, Landmark, XCircle, Download, Paperclip, CheckCircle2, ShieldCheck, Banknote, Pencil } from "lucide-react"
import { Timeline } from "@/components/ui/Timeline"

export default async function DetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect("/login")

  const { data: s } = await sb.from("solicitudes")
    .select("*, cfdi:comprobantes_cfdi(*), items:solicitud_items(*)")
    .eq("id", id)
    .single()

  if (!s) notFound()

  const { data: perfil } = await sb.from("usuarios")
    .select("nombre, iniciales, rol").eq("id", s.usuario_id).single()
  const { data: yo } = await sb.from("usuarios").select("rol").eq("id", user.id).single()
  const rol = yo?.rol || ""
  const esMia = s.usuario_id === user.id

  // Acción que le toca a quien está viendo la solicitud, según su rol y el estatus
  const acciones: { href: string; label: string; icon: typeof Paperclip; primary?: boolean }[] = []
  if (s.status === "solicitado" && ["gerente", "admin", "demo"].includes(rol))
    acciones.push({ href: "/gerente", label: "Revisar en bandeja", icon: CheckCircle2, primary: true })
  if (s.status === "autorizado" && ["admin", "demo"].includes(rol))
    acciones.push({ href: "/admin/validar", label: "Validar", icon: ShieldCheck, primary: true })
  if (s.status === "validado" && ["tesoreria", "admin", "demo"].includes(rol))
    acciones.push({ href: "/tesoreria", label: "Liberar pago", icon: Banknote, primary: true })
  if (["liberado", "parcial"].includes(s.status) && s.tipo === "anticipo" && (esMia || ["admin", "demo"].includes(rol)))
    acciones.push({ href: `/solicitudes/comprobacion?anticipo=${s.id}`, label: s.status === "parcial" ? "Comprobar saldo" : "Comprobar", icon: Paperclip, primary: true })
  if (s.status === "parcial" && s.tipo === "anticipo" && esMia)
    acciones.push({ href: `/solicitudes/cierre?anticipo=${s.id}`, label: "Cerrar anticipo", icon: Landmark })
  if (s.status === "devuelto" && esMia)
    acciones.push({ href: `/solicitudes/${s.id}/corregir`, label: "Corregir y reenviar", icon: Pencil, primary: true })


  const { data: bitacora } = await sb.from("bitacora")
    .select("*, actor:usuarios!usuario_id(nombre)")
    .eq("solicitud_id", id).order("ts", { ascending: true })

  const archivos = (s.cfdi || []).filter((c: any) => c.archivo_url)
  // URLs firmadas (1 h) para el bucket privado; las filas viejas guardan la URL pública y también se resuelven
  const descargas = await urlsFirmadas(sb, archivos.map((c: any) => c.archivo_url))

  const dates: Record<string, Date | null> = {}
  ;(bitacora || []).forEach((b: any) => { dates[b.accion] = new Date(b.ts) })

  return (
    <div className="form" style={{ maxWidth: 820 }}>
      {/* Encabezado */}
      <div className="page-head" style={{ marginBottom: 4 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <TipoBadge tipo={s.tipo} />
            <StatusBadge status={s.status} />
            {s.notas?.includes("CIERRE_DEPOSITO") && (
              <span className="badge autorizado"><Landmark size={11} strokeWidth={2}/> Cierre</span>
            )}
          </div>
          <h1 className="page-title" style={{ fontSize: 26 }}>{s.concepto}</h1>
          <p className="page-sub" style={{ fontVariantNumeric: "tabular-nums" }}>{id}</p>
        </div>
        <Link href="/solicitudes" className="btn ghost"><ArrowLeft size={15} strokeWidth={2}/> Mis solicitudes</Link>
      </div>

      {/* Avance */}
      <div className="card">
        <Stepper status={s.status} dates={dates} />
      </div>

      {/* Datos */}
      <div className="card">
        <dl className="info-grid">
          {[
            { label: "Solicitante", value: perfil?.nombre || "—" },
            { label: "Fecha", value: fmtFecha(s.fecha) },
            { label: "Monto", value: fmtMXN(parseFloat(s.monto)) },
            ...(s.tipo === "anticipo" && parseFloat(s.saldo_pendiente) > 0 ? [
              { label: "Saldo por comprobar", value: fmtMXN(parseFloat(s.saldo_pendiente)), color: "var(--warn)" }
            ] : []),
            ...(s.anticipo_ref ? [{ label: "Anticipo de origen", value: s.anticipo_ref }] : []),
          ].map(({ label, value, color }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd style={{ color }}>{value}</dd>
            </div>
          ))}
        </dl>
        {s.motivo_rechazo && (
          <div className="notice danger" style={{ marginTop: 16 }}>
            <XCircle size={16} strokeWidth={2}/>
            <div><b>Motivo de rechazo.</b> {s.motivo_rechazo}</div>
          </div>
        )}
      </div>

      {/* Comprobantes */}
      {s.cfdi && s.cfdi.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="form-section-head" style={{ padding: "18px 20px 0", marginBottom: 10 }}>
            <div className="card-title">{s.cfdi.length === 1 ? "1 comprobante" : `${s.cfdi.length} comprobantes`}</div>
            <div className="form-section-desc">
              {fmtMXN((s.cfdi as any[]).reduce((a, c) => a + (parseFloat(c.total) || 0), 0))} en total
              {archivos.length > 0 && `, ${archivos.length} con archivo adjunto`}
            </div>
          </div>
          <table className="t cards">
            <thead>
              <tr>
                <th>Emisor</th><th>Cuenta</th><th>Comentarios</th>
                <th className="num">Total</th><th>SAT</th><th></th>
              </tr>
            </thead>
            <tbody>
              {s.cfdi.map((cf: any) => (
                <tr key={cf.id}>
                  <td className="cell-title">
                    <div>{cf.emisor || "—"}</div>
                    {cf.uuid && <div className="uuid" style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 2 }} title={cf.uuid}>{cf.uuid.slice(0, 20)}…</div>}
                  </td>
                  <td data-label="Cuenta" style={{ fontSize: 12 }}>
                    <div style={{ fontVariantNumeric: "tabular-nums" }}>{cf.cuenta}</div>
                    {cf.nombre_cuenta && <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 1 }}>{cf.nombre_cuenta}</div>}
                  </td>
                  <td data-label="Comentarios" style={{ fontSize: 12.5, color: cf.observaciones ? "var(--text-2)" : "var(--text-3)", maxWidth: 200 }}>
                    {cf.observaciones || <span className="muted">—</span>}
                  </td>
                  <td className="num cell-amount" data-label="Total">{fmtMXN(parseFloat(cf.total))}</td>
                  <td data-label="SAT">
                    {cf.sat_estado && (
                      <span className={`badge ${cf.sat_estado === "Vigente" ? "comprobado" : "solicitado"}`}>{cf.sat_estado}</span>
                    )}
                  </td>
                  <td className="cell-actions">
                    {descargas.get(cf.archivo_url) && (
                      <a href={descargas.get(cf.archivo_url)} target="_blank" rel="noopener" className="btn sm ghost" title="Descargar" aria-label="Descargar">
                        <Download size={14} strokeWidth={2}/>
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Línea de tiempo */}
      {bitacora && bitacora.length > 0 && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Línea de tiempo</div>
          <Timeline eventos={bitacora.map((b: any) => ({ id: b.id, accion: b.accion, ts: b.ts, actor: b.actor?.nombre, detalle: b.detalle }))}/>
        </div>
      )}

      {/* Acciones del rol: fijas abajo en móvil */}
      {acciones.length > 0 && (
        <div className="form-actions">
          {acciones.map(a => {
            const Icon = a.icon
            return (
              <Link key={a.href} href={a.href} className={`btn ${a.primary ? "primary" : ""}`}>
                <Icon size={15} strokeWidth={2}/> {a.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
