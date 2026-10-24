"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface Item { href: string; label: string }

/** Pestañas en píldora para moverse entre vistas hermanas de una sección. */
export function SegmentedNav({ items, ariaLabel }: { items: Item[]; ariaLabel: string }) {
  const pathname = usePathname()
  return (
    <nav className="segmented" aria-label={ariaLabel}>
      {items.map(it => (
        <Link key={it.href} href={it.href} aria-current={pathname === it.href ? "page" : undefined}>
          {it.label}
        </Link>
      ))}
    </nav>
  )
}

export const TESORERIA_TABS: Item[] = [
  { href: "/tesoreria",          label: "Por liberar" },
  { href: "/tesoreria/pagados",  label: "Pagados" },
  { href: "/tesoreria/deudores", label: "Deudores" },
]
