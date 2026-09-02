import { getCloudflareContext } from "@opennextjs/cloudflare"

export async function GET() {
  let cfEnv: any = {}
  let cfError = null
  try {
    cfEnv = getCloudflareContext().env || {}
  } catch (e: any) {
    cfError = e.message
  }
  return new Response(JSON.stringify({
    ok: true,
    timestamp: Date.now(),
    via_process_env: {
      supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    via_cloudflare_context: {
      supabase_url: !!cfEnv.NEXT_PUBLIC_SUPABASE_URL,
      anon_key: !!cfEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      service_key: !!cfEnv.SUPABASE_SERVICE_ROLE_KEY,
      all_keys: Object.keys(cfEnv),
      error: cfError,
    },
  }, null, 2), { headers: { "Content-Type": "application/json" } })
}
