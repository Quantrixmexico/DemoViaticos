import Link from "next/link"
import { Compass } from "lucide-react"
import { EmptyState } from "@/components/ui/EmptyState"

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
      <div style={{ maxWidth: 420, width: "100%" }}>
        <EmptyState
          icon={Compass}
          tone="neutral"
          variant="plain"
          title="Página en construcción"
          text="Esta sección se está migrando a la nueva versión."
          action={<Link href="/dashboard" className="btn primary">Ir al inicio</Link>}
        />
      </div>
    </div>
  )
}

