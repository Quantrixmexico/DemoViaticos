import { NextResponse } from "next/server"
import { PUBLIC_ENV_KEYS } from "@/lib/public-env"
import { serverEnv } from "@/lib/env-server"

/**
 * Expone las variables públicas en tiempo de ejecución para el navegador.
 * Solo claves NEXT_PUBLIC_*; nunca secretos. Ver src/lib/public-env.ts.
 */
export async function GET() {
  const env: Record<string, string> = {}
  for (const k of PUBLIC_ENV_KEYS) { const v = serverEnv(k); if (v) env[k] = v }
  return new NextResponse(`window.__ENV=${JSON.stringify(env)};`, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}
