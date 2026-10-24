import { requireRol, AREA_ROLES } from "@/lib/auth-server"

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireRol(AREA_ROLES.admin)
  return children
}
