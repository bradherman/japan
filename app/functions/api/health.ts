/**
 * Health check endpoint — verifies Pages Functions are deployed and working.
 * GET /api/health
 */

interface Env {
  ANTHROPIC_API_KEY: string
  BASIC_AUTH_PASS: string
}

export const onRequestGet: PagesFunction<Env, string, { user: string; role: string }> = async (context) => {
  return Response.json({
    ok: true,
    ts: new Date().toISOString(),
    user: context.data?.user || 'none',
    role: context.data?.role || 'none',
    hasApiKey: !!context.env.ANTHROPIC_API_KEY,
    hasAuthPass: !!context.env.BASIC_AUTH_PASS,
  })
}
