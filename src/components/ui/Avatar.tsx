/** Iniciales sobre el degradado aurora; el mismo en la barra lateral, el perfil y las listas. */
export function Avatar({ iniciales, size = 34, style }: { iniciales: string; size?: number; style?: React.CSSProperties }) {
  return (
    <div aria-hidden style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      display: "grid", placeItems: "center", fontSize: Math.round(size * .34), fontWeight: 700,
      color: "#04110d", letterSpacing: "-0.02em",
      background: "linear-gradient(135deg, var(--aurora-1), var(--aurora-2) 60%, var(--aurora-3))",
      ...style,
    }}>{iniciales}</div>
  )
}
