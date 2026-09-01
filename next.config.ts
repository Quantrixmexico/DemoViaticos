import type { NextConfig } from "next"
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"

// Permite usar bindings de Cloudflare (IMAGES, etc.) en `next dev`
initOpenNextCloudflareForDev()

const nextConfig: NextConfig = {
  experimental: {
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
