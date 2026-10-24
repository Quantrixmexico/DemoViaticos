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
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      ],
    }]
  },
}

export default nextConfig
