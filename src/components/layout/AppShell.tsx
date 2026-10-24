"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { UsuarioProvider } from "@/lib/UsuarioContext"
import { useTheme } from "@/contexts/ThemeContext"
import type { LucideIcon } from "lucide-react"
import {
  Home, LayoutDashboard, CheckCircle2, ShieldCheck, Banknote, HandCoins,
  Receipt, Paperclip, ClipboardList, FolderOpen, Users, Building2,
  BookOpen, Gauge, Settings, FileSpreadsheet, BarChart3, UserCircle,
  CircleCheckBig, Flag, UsersRound, Search, GitCompare, Bell, LogOut,
  Menu as MenuIcon, Palette, Moon, Sun,
  Layers, Eye,
} from "lucide-react"

interface NavItem  { id: string; label: string; icon: LucideIcon; href: string }
interface NavGroup { label?: string; items: NavItem[] }

const NAV_BY_ROL: Record<string, NavGroup[]> = {
  get demo() { return this.admin },
  usuario: [
    { items: [{ id:"dashboard", label:"Inicio", icon: Home, href:"/dashboard" }]},
    { label:"Solicitudes", items: [
      { id:"anticipo",    label:"Solicitar anticipo", icon: HandCoins,     href:"/solicitudes/anticipo" },
      { id:"reembolso",   label:"Reembolso",          icon: Receipt,       href:"/solicitudes/reembolso" },
      { id:"solicitudes", label:"Mis solicitudes",    icon: ClipboardList, href:"/solicitudes" },
    ]},
    { items: [{ id:"perfil", label:"Mi perfil", icon: UserCircle, href:"/perfil" }]},
  ],
  gerente: [
    { label:"Flujo de autorizaciones", items: [
      { id:"bandeja", label:"Por aprobar", icon: CheckCircle2, href:"/gerente" },
    ]},
    { label:"Solicitudes", items: [
      { id:"anticipo",     label:"Solicitar anticipo", icon: HandCoins,     href:"/solicitudes/anticipo" },
      { id:"reembolso",    label:"Reembolso",          icon: Receipt,       href:"/solicitudes/reembolso" },
      { id:"comprobacion", label:"Comprobaciones",     icon: Paperclip,     href:"/solicitudes/comprobacion" },
      { id:"solicitudes",  label:"Mis solicitudes",    icon: ClipboardList, href:"/solicitudes" },
    ]},
    { label:"Reportes", items: [
      { id:"reportes", label:"Reportes",   icon: BarChart3,  href:"/gerente/reportes" },
      { id:"equipo",   label:"Mi equipo",  icon: UsersRound, href:"/gerente/equipo" },
    ]},
    { items: [{ id:"perfil", label:"Mi perfil", icon: UserCircle, href:"/perfil" }]},
  ],
  tesoreria: [
    { items: [{ id:"workflow", label:"Workflow", icon: LayoutDashboard, href:"/dashboard" }]},
    { label:"Gestión", items: [
      { id:"todas",    label:"Todas las sol.", icon: FolderOpen,     href:"/solicitudes/todas" },
      { id:"liberar",  label:"Liberar pagos",  icon: Banknote,       href:"/tesoreria" },
      { id:"pagados",  label:"Pagados",        icon: CircleCheckBig, href:"/tesoreria/pagados" },
      { id:"deudores", label:"Deudores",       icon: Flag,           href:"/tesoreria/deudores" },
    ]},
    { label:"Reportes", items: [
      { id:"reportes", label:"Reportes", icon: BarChart3, href:"/tesoreria/reportes" },
    ]},
    { items: [{ id:"perfil", label:"Mi perfil", icon: UserCircle, href:"/perfil" }]},
  ],
  contador: [
    { items: [{ id:"workflow", label:"Workflow", icon: LayoutDashboard, href:"/dashboard" }]},
    { label:"Gestión", items: [
      { id:"todas",            label:"Todas las sol.",     icon: FolderOpen,      href:"/solicitudes/todas" },
      { id:"polizas",          label:"Pólizas contables",  icon: FileSpreadsheet, href:"/contador/polizas" },
      { id:"trazabilidad",     label:"Trazabilidad",       icon: Search,          href:"/contador/trazabilidad" },
      { id:"validacion-sat",   label:"Validación SAT",     icon: ShieldCheck,     href:"/contador/validacion-sat" },
      { id:"conciliacion-sat", label:"Conciliación SAT",   icon: GitCompare,      href:"/contador/conciliacion-sat" },
      { id:"catalogo",         label:"Catálogo",           icon: BookOpen,        href:"/contador/catalogo" },
    ]},
    { label:"Reportes", items: [
      { id:"reportes", label:"Reportes", icon: BarChart3, href:"/contador/reportes" },
    ]},
    { items: [{ id:"perfil", label:"Mi perfil", icon: UserCircle, href:"/perfil" }]},
  ],
  admin: [
    { items: [{ id:"dashboard", label:"Inicio", icon: Home, href:"/dashboard" }]},
    { label:"Flujo de autorizaciones", items: [
      { id:"bandeja", label:"Por aprobar",     icon: CheckCircle2, href:"/gerente" },
      { id:"validar", label:"Validar (Admin)", icon: ShieldCheck,  href:"/admin/validar" },
      { id:"liberar", label:"Liberar pagos",   icon: Banknote,     href:"/tesoreria" },
    ]},
    { label:"Solicitudes", items: [
      { id:"anticipo",     label:"Solicitar anticipo", icon: HandCoins,     href:"/solicitudes/anticipo" },
      { id:"reembolso",    label:"Reembolso",          icon: Receipt,       href:"/solicitudes/reembolso" },
      { id:"comprobacion", label:"Comprobaciones",     icon: Paperclip,     href:"/solicitudes/comprobacion" },
      { id:"solicitudes",  label:"Mis solicitudes",    icon: ClipboardList, href:"/solicitudes" },
      { id:"todas",        label:"Todas las sol.",     icon: FolderOpen,    href:"/solicitudes/todas" },
    ]},
    { label:"Gestión", items: [
      { id:"usuarios", label:"Usuarios",         icon: Users,           href:"/admin/usuarios" },
      { id:"centros",  label:"Centros",          icon: Building2,       href:"/admin/centros" },
      { id:"divisiones", label:"Divisiones SAP",  icon: Layers,          href:"/admin/divisiones" },
      { id:"catalogo", label:"Catálogo",         icon: BookOpen,        href:"/admin/catalogo" },
      { id:"limites",  label:"Límites de gasto", icon: Gauge,           href:"/admin/limites" },
      { id:"ajustes",  label:"Ajustes sistema",  icon: Settings,        href:"/admin/ajustes" },
      { id:"polizas",  label:"Pólizas",          icon: FileSpreadsheet, href:"/contador/polizas" },
    ]},
    { label:"Reportes", items: [
      { id:"reportes", label:"Reportes", icon: BarChart3, href:"/admin/reportes" },
    ]},
    { items: [{ id:"perfil", label:"Mi perfil", icon: UserCircle, href:"/perfil" }]},
  ],
}

interface Props {
  user: { nombre: string; rol: string; iniciales: string }
  children: React.ReactNode
}

export function AppShell({ user, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const { mode, setMode } = useTheme()
  const dark = mode === "dark"
  const navGroups = NAV_BY_ROL[user.rol] || []
  const navItems  = navGroups.flatMap(g => g.items)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [textColor, setTextColor] = useState<string | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const isActive = (href: string) => {
    // Rutas que requieren match exacto (rutas "índice" con hijos)
    const exactMatch = ["/dashboard", "/solicitudes", "/solicitudes/todas", "/gerente", "/perfil", "/notificaciones"]
    if (exactMatch.includes(href)) return pathname === href
    // El resto: match exacto o si es un prefix seguido de "/"
    return pathname === href || pathname.startsWith(href + "/")
  }

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    const c = localStorage.getItem("textColor")
    if (c) {
      setTextColor(c)
      document.documentElement.style.setProperty("--text", c)
    }
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const cerrarSesion = async () => {
    const sb = createClient()
    await sb.auth.signOut()
    router.push("/login")
  }

  const cambiarColor = (color: string | null) => {
    setTextColor(color)
    if (color) {
      document.documentElement.style.setProperty("--text", color)
      localStorage.setItem("textColor", color)
    } else {
      document.documentElement.style.removeProperty("--text")
      localStorage.removeItem("textColor")
    }
    setShowColorPicker(false)
  }

  const toggleTheme = () => setMode(dark ? "light" : "dark")

  // Estilos inline garantizan el layout — no dependen de globals.css
  const containerStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "248px 1fr",
    minHeight: "100vh",
  }
  const sidebarStyle: React.CSSProperties = {
    display: isMobile ? "none" : "flex",
    flexDirection: "column",
    width: 248,
    padding: "18px 14px 14px",
    gap: 8,
    height: "100vh",
    position: "sticky",
    top: 0,
    overflowY: "auto",
    zIndex: 20,
  }
  const mainStyle: React.CSSProperties = {
    padding: isMobile ? "68px 16px 96px" : "36px 44px 48px",
    overflowX: "hidden",
    minWidth: 0,
  }
  const mobileNavStyle: React.CSSProperties = {
    display: isMobile ? "flex" : "none",
    position: "fixed",
    bottom: 0, left: 0, right: 0,
    height: "calc(64px + env(safe-area-inset-bottom, 0px))",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
    borderTop: "1px solid var(--border-soft)",
    zIndex: 100,
    justifyContent: "space-around",
    alignItems: "center",
  }
  const mobileTopbarStyle: React.CSSProperties = {
    display: isMobile ? "flex" : "none",
    position: "fixed",
    top: 0, left: 0, right: 0,
    height: 52,
    borderBottom: "1px solid var(--border-soft)",
    zIndex: 99,
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 16px",
  }

  const colorPicker = showColorPicker && (
    <>
      <div style={{ position:"fixed", inset:0, zIndex:999 }} onClick={() => setShowColorPicker(false)}/>
      <div className="popover glass" style={{
        position: isMobile ? "fixed" : "absolute",
        top: isMobile ? 58 : 44, left: isMobile ? "auto" : 0, right: isMobile ? 12 : "auto",
        zIndex:1000, borderRadius:16, padding:14,
        border:"1px solid var(--border-soft)", boxShadow:"var(--shadow-pop)", width:232,
      }}>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>Color de texto</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(6, 1fr)", gap:8, marginBottom:10 }}>
          {[
            { color:null,        label:"Predeterminado", bg:"transparent", border:"var(--border)" },
            { color:"#ffffff",   label:"Blanco",  bg:"#ffffff" },
            { color:"#f5e6d3",   label:"Crema",   bg:"#f5e6d3" },
            { color:"#5ee6c3",   label:"Aurora",  bg:"#5ee6c3" },
            { color:"#a8d5f0",   label:"Cielo",   bg:"#a8d5f0" },
            { color:"#f5c0c0",   label:"Rosa",    bg:"#f5c0c0" },
            { color:"#c0f5d5",   label:"Menta",   bg:"#c0f5d5" },
            { color:"#e8d5f5",   label:"Lila",    bg:"#e8d5f5" },
            { color:"#fbbf24",   label:"Ámbar",   bg:"#fbbf24" },
            { color:"#f97316",   label:"Naranja", bg:"#f97316" },
            { color:"#ef4444",   label:"Rojo",    bg:"#ef4444" },
            { color:"#94a3b8",   label:"Gris",    bg:"#94a3b8" },
          ].map((c, i) => {
            const selected = (textColor === c.color) || (!textColor && c.color === null)
            return (
              <button key={i} onClick={() => cambiarColor(c.color)}
                title={c.label} aria-label={c.label} aria-pressed={selected}
                style={{
                  width:26, height:26, borderRadius:"50%", padding:0, cursor:"pointer",
                  border: `1px solid ${c.border || "rgba(0,0,0,0.15)"}`,
                  background: c.bg, position:"relative",
                  boxShadow: selected ? "0 0 0 2px var(--surface), 0 0 0 4px var(--accent)" : "none",
                  transition:"box-shadow .2s, transform .25s var(--ease-spring)",
                }}>
                {c.color === null && (
                  <span style={{ position:"absolute", inset:0, display:"grid", placeItems:"center",
                    fontSize:11, color:"var(--text-3)" }}>×</span>
                )}
              </button>
            )
          })}
        </div>
        <input type="color"
          value={textColor || "#ffffff"}
          onChange={(e) => cambiarColor(e.target.value)}
          style={{ width:"100%", height:30, border:"1px solid var(--border)", borderRadius:10,
            cursor:"pointer", background:"transparent" }}
          title="Color personalizado"
        />
      </div>
    </>
  )

  return (
    <div style={containerStyle}>
      {/* SIDEBAR DESKTOP */}
      <aside style={sidebarStyle} className="sidebar glass">
        <div style={{ display:"flex", alignItems:"center", gap:11, padding:"2px 6px 14px" }}>
          <Image src="/logo.png" alt="Logo" width={36} height={36}
            style={{ borderRadius:10, boxShadow:"0 0 0 1px var(--border-soft), 0 6px 18px -6px rgba(0,0,0,.5)" }}/>
          <div style={{ lineHeight:1.2 }}>
            <div style={{ fontSize:14, fontWeight:650, letterSpacing:"-0.02em" }}>Demo Viáticos</div>
            <div style={{ fontSize:12, color:"var(--text-3)" }}>Gastos de viaje</div>
          </div>
        </div>

        <div style={{ display:"flex", gap:8, padding:"0 4px 4px", position:"relative" }}>
          <button className="icon-btn" onClick={() => router.push("/notificaciones")} title="Notificaciones" aria-label="Notificaciones">
            <Bell size={16} strokeWidth={1.75}/>
          </button>
          <button className="icon-btn" onClick={() => setShowColorPicker(!showColorPicker)} title="Color de texto" aria-label="Color de texto">
            <Palette size={16} strokeWidth={1.75} color={textColor || undefined}/>
          </button>
          <button className="icon-btn" onClick={toggleTheme} title={dark ? "Usar tema claro" : "Usar tema oscuro"} aria-label="Cambiar tema">
            <span key={mode} className="popover" style={{ display:"grid" }}>
              {dark ? <Sun size={16} strokeWidth={1.75}/> : <Moon size={16} strokeWidth={1.75}/>}
            </span>
          </button>
          {!isMobile && colorPicker}
        </div>

        <nav style={{ flex:1, display:"flex", flexDirection:"column", overflowY:"auto", overflowX:"visible", marginTop:4, gap:1 }}>
          {navGroups.map((group, gi) => (
            <div key={gi} style={{ display:"flex", flexDirection:"column", gap:1 }}>
              {group.label && <div className="nav-group-label">{group.label}</div>}
              {group.items.map(item => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link key={item.id} href={item.href}
                    className={`nav-item ${active ? "active" : ""}`}
                    aria-current={active ? "page" : undefined}>
                    <Icon size={18} strokeWidth={active ? 2 : 1.75} style={{ flexShrink:0 }}/>
                    <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div style={{ borderTop:"1px solid var(--border-soft)", paddingTop:12, marginTop:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"4px 6px", marginBottom:6 }}>
            <Avatar iniciales={user.iniciales} size={34}/>
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.nombre}</div>
              <div style={{ fontSize:12, color:"var(--text-3)", textTransform:"capitalize" }}>{user.rol}</div>
            </div>
          </div>
          <button onClick={cerrarSesion} className="nav-item"
            style={{ width:"100%", border:"none", background:"transparent", font:"inherit", fontSize:13 }}>
            <LogOut size={16} strokeWidth={1.75}/> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* TOP BAR MOBILE */}
      <div style={mobileTopbarStyle} className="glass">
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <Image src="/logo.png" alt="Logo" width={28} height={28} style={{ borderRadius:8 }}/>
          <span style={{ fontSize:16, fontWeight:650, letterSpacing:"-0.02em" }}>Viáticos</span>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button className="icon-btn" onClick={() => router.push("/notificaciones")} aria-label="Notificaciones">
            <Bell size={16} strokeWidth={1.75}/>
          </button>
          <button className="icon-btn" onClick={() => setShowColorPicker(!showColorPicker)} title="Color de texto" aria-label="Color de texto">
            <Palette size={16} strokeWidth={1.75} color={textColor || undefined}/>
          </button>
          <button className="icon-btn" onClick={toggleTheme} aria-label="Cambiar tema">
            <span key={mode} className="popover" style={{ display:"grid" }}>
              {dark ? <Sun size={16} strokeWidth={1.75}/> : <Moon size={16} strokeWidth={1.75}/>}
            </span>
          </button>
        </div>
        {isMobile && colorPicker}
      </div>

      {/* MAIN */}
      <main style={mainStyle}>
        {user.rol === "demo" && (
          <div className="demo-strip" role="note">
            <Eye size={14} strokeWidth={2}/>
            <span><b>Modo demo.</b> Puedes explorar y crear registros; borrar y desactivar están bloqueados.</span>
          </div>
        )}
        <div key={pathname} className="page-enter" style={{ maxWidth: 1280, margin: "0 auto" }}>
          <UsuarioProvider usuario={user}>{children}</UsuarioProvider>
        </div>
      </main>

      {/* BOTTOM NAV MOBILE */}
      <nav style={mobileNavStyle} className="glass">
        {navItems.slice(0, 4).map(item => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link key={item.id} href={item.href}
              className={`mobile-nav-item ${active ? "active" : ""}`}
              aria-current={active ? "page" : undefined}
              style={{
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                gap:3, flex:1, padding:"6px 2px", textDecoration:"none",
                color: active ? "var(--accent)" : "var(--text-3)",
              }}>
              <Icon size={22} strokeWidth={active ? 2.1 : 1.75}/>
              <span style={{ fontSize:10, fontWeight: active ? 600 : 500 }}>{item.label.split(" ")[0]}</span>
            </Link>
          )
        })}
        <button onClick={() => setShowUserMenu(!showUserMenu)}
          className={`mobile-nav-item ${showUserMenu ? "active" : ""}`}
          style={{
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            gap:3, flex:1, padding:"6px 2px", background:"transparent", border:"none",
            color: showUserMenu ? "var(--accent)" : "var(--text-3)", cursor:"pointer", font:"inherit",
          }}>
          <MenuIcon size={22} strokeWidth={1.75}/>
          <span style={{ fontSize:10, fontWeight:500 }}>Más</span>
        </button>
      </nav>

      {/* DRAWER MOBILE */}
      {showUserMenu && (
        <div onClick={() => setShowUserMenu(false)} className="sheet-backdrop"
          style={{
            position:"fixed", inset:0, background:"rgba(0,0,0,0.45)",
            WebkitBackdropFilter:"blur(6px)", backdropFilter:"blur(6px)",
            zIndex:200, display:"flex", alignItems:"flex-end",
          }}>
          <div onClick={e => e.stopPropagation()} className="sheet"
            style={{
              width:"100%", background:"var(--surface)",
              borderTopLeftRadius:24, borderTopRightRadius:24,
              padding:"10px 16px calc(20px + env(safe-area-inset-bottom, 0px))",
              maxHeight:"82vh", overflowY:"auto",
              boxShadow:"0 -20px 60px -20px rgba(0,0,0,.5)",
            }}>
            <div style={{ width:38, height:5, borderRadius:3, background:"var(--border)", margin:"0 auto 16px" }}/>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14, padding:"0 4px" }}>
              <Avatar iniciales={user.iniciales} size={44}/>
              <div>
                <div style={{ fontSize:16, fontWeight:600, letterSpacing:"-0.02em" }}>{user.nombre}</div>
                <div style={{ fontSize:13, color:"var(--text-3)", textTransform:"capitalize" }}>{user.rol}</div>
              </div>
            </div>

            <Link href="/perfil" onClick={() => setShowUserMenu(false)}
              className={`nav-item ${isActive("/perfil") ? "active" : ""}`}
              style={{ padding:"11px 12px", fontSize:15, marginBottom:6 }}>
              <UserCircle size={20} strokeWidth={1.75}/>
              <span>Mi perfil</span>
            </Link>

            {(() => {
              const bottomIds = new Set(navItems.slice(0, 4).map(i => i.id))
              return navGroups.map((group, gi) => {
                const visibleItems = group.items.filter(i => !bottomIds.has(i.id) && i.id !== "perfil")
                if (!visibleItems.length) return null
                return (
                  <div key={gi} style={{ marginBottom:6 }}>
                    {group.label && <div className="nav-group-label">{group.label}</div>}
                    {visibleItems.map(item => {
                      const Icon = item.icon
                      return (
                        <Link key={item.id} href={item.href}
                          onClick={() => setShowUserMenu(false)}
                          className={`nav-item ${isActive(item.href) ? "active" : ""}`}
                          style={{ padding:"11px 12px", fontSize:15 }}>
                          <Icon size={20} strokeWidth={1.75}/>
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )
              })
            })()}

            <button onClick={cerrarSesion} className="btn"
              style={{ width:"100%", justifyContent:"center", marginTop:12, padding:"12px" }}>
              <LogOut size={15} strokeWidth={1.75}/> Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Avatar({ iniciales, size }: { iniciales: string; size: number }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%", flexShrink:0,
      display:"grid", placeItems:"center", fontSize: Math.round(size * .34), fontWeight:700,
      color:"#04110d", letterSpacing:"-0.02em",
      background:"linear-gradient(135deg, var(--aurora-1), var(--aurora-2) 60%, var(--aurora-3))",
    }}>{iniciales}</div>
  )
}

export default AppShell
