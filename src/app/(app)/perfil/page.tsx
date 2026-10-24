import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { fmtMXN } from "@/lib/format"
import { NotifButton } from "@/components/ui/NotifButton"
import { Avatar } from "@/components/ui/Avatar"
import { StatCards } from "@/components/ui/StatCards"
import { Apariencia } from "@/components/ui/Apariencia"
import { Building2, Users, Landmark, Info } from "lucide-react"

const ROL_LABEL: Record<string, string> = {
  admin: "Administración", gerente: "Gerente", tesoreria: "Tesorería", contador: "Contador", usuario: "Colaborador", demo: "Invitado (demo)",
}

export default async function PerfilPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: u }, { data: sols }] = await Promise.all([
    sb.from("usuarios").select("*, centro:centros(*), gerente:usuarios!gerente_id(nombre)").eq("id", user.id).single(),
    sb.from("solicitudes").select("id, tipo, status, monto, saldo_pendiente").eq("usuario_id", user.id),
  ])

  if (!u) redirect("/login")

  const totalAbierto = (sols || [])
    .filter(s => ["liberado","parcial"].includes(s.status) && parseFloat(s.saldo_pendiente) > 0)
    .reduce((a, s) => a + parseFloat(s.saldo_pendiente), 0)

  const abiertos = (sols || []).filter(s => s.tipo === "anticipo" && parseFloat(s.saldo_pendiente) > 0).length

  return (
    <div className="form" style={{ maxWidth: 680 }}>
      <div className="page-head" style={{ marginBottom: 4 }}>
        <div><h1 className="page-title">Mi perfil</h1><div className="page-sub">Tu cuenta, tus notificaciones y cómo se ve la app en este dispositivo.</div></div>
      </div>

      {/* Identidad */}
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <Avatar iniciales={u.iniciales} size={64}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>{u.nombre}</div>
          <div style={{ fontSize: 13.5, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis" }}>{u.correo}</div>
        </div>
        <span className={`badge rol ${u.rol}`}>{ROL_LABEL[u.rol] || u.rol}</span>
      </div>

      {/* Actividad */}
      <StatCards style={{ marginBottom: 0 }} items={[
        { label: "Solicitudes", value: (sols || []).length },
        { label: "Anticipos abiertos", value: abiertos, color: abiertos > 0 ? "var(--warn)" : undefined },
        { label: "Saldo por comprobar", value: fmtMXN(totalAbierto), color: totalAbierto > 0 ? "var(--warn)" : "var(--success)" },
      ]}/>

      {/* Cuenta */}
      <div className="card form-section">
        <div className="form-section-head">
          <div className="card-title">Cuenta</div>
          <div className="form-section-desc">Datos que administra tu organización.</div>
        </div>
        <dl className="info-grid">
          {[
            { label: "Centro de beneficio", value: u.centro ? `${u.centro.id}, ${u.centro.nombre}` : "—", icon: Building2 },
            { label: "Departamento", value: u.centro?.depto || "—" },
            { label: "Gerente", value: (u.gerente as any)?.nombre || "—", icon: Users },
            { label: "División SAP", value: u.division || "4105" },
            { label: "Banco", value: u.banco || "—", icon: Landmark },
            { label: "CLABE", value: u.clabe ? "•••• " + u.clabe.slice(-4) : "—" },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label}>
              <dt style={{ display: "flex", alignItems: "center", gap: 5 }}>{Icon && <Icon size={12} strokeWidth={2}/>}{label}</dt>
              <dd style={{ fontSize: 14 }}>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="field-hint" style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 14 }}>
          <Info size={13} strokeWidth={2}/> Para cambiar banco o CLABE, escribe a Tesorería.
        </div>
      </div>

      {/* Notificaciones */}
      <div className="card form-section">
        <div className="form-section-head">
          <div className="card-title">Notificaciones</div>
          <div className="form-section-desc">Avisos en este dispositivo cuando cambie una de tus solicitudes.</div>
        </div>
        <NotifButton/>
      </div>

      {/* Apariencia */}
      <div className="card form-section">
        <div className="form-section-head">
          <div className="card-title">Apariencia</div>
        </div>
        <Apariencia/>
      </div>
    </div>
  )
}
