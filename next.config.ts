import type { NextConfig } from "next"
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"

// Permite usar bindings de Cloudflare (IMAGES, etc.) en `next dev`
initOpenNextCloudflareForDev()

const nextConfig: NextConfig = {
  experimental: {
    // La caché persistente de Turbopack (activa por defecto en builds desde
    // Next 16.3) reutilizó un globals.css viejo en Cloudflare Workers Builds:
    // el CSS compilado no se invalida al cambiar el archivo. Desactivada.
    turbopackFileSystemCacheForBuild: false,
    // Mismo problema en `next dev`: servía el CSS anterior tras editar globals.css.
    turbopackFileSystemCacheForDev: false,
    serverActions: {
      allowedOrigins: [
        "zapata.mx",
        "*.zapata.mx",
        "demoviaticos.consultoriaconfia.com",
        "*.consultoriaconfia.com",
        "demoviaticos.quantrixmexico.workers.dev",
      ],
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
}

export default nextConfig
