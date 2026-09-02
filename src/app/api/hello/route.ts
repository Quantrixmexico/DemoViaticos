export const runtime = "edge"

export async function GET() {
  return new Response(JSON.stringify({
    ok: true,
    timestamp: Date.now(),
    env_check: {
      supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  }), { headers: { "Content-Type": "application/json" } })
}
