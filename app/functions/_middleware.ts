/**
 * Cloudflare Pages middleware: HTTP Basic Auth with role-based access.
 *
 * Passes auth info to downstream functions via context.data.
 *
 * Secrets required (set via `wrangler pages secret put --project-name bherms-japan`):
 * - BASIC_AUTH_PASS  — shared password for all users
 * - ADMIN_USERS      — comma-separated admin usernames, e.g. "brad,alyona"
 * - VIEWER_USERS     — comma-separated viewer usernames, e.g. "dave,gail"
 */

interface Env {
  BASIC_AUTH_PASS: string
  ADMIN_USERS?: string
  VIEWER_USERS?: string
}

function parseList(csv: string | undefined): string[] {
  return (csv || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean)
}

export const onRequest: PagesFunction<Env, string, { user: string; role: string }> = async (context) => {
  const { request, env } = context

  try {
    // Skip auth if secrets aren't configured (local dev)
    if (!env.BASIC_AUTH_PASS) {
      context.data.user = 'dev'
      context.data.role = 'admin'
      return await context.next()
    }

    const admins = parseList(env.ADMIN_USERS || 'brad,alyona')
    const viewers = parseList(env.VIEWER_USERS || 'dave,gail')
    const allUsers = [...admins, ...viewers]

    const auth = request.headers.get('Authorization')
    if (!auth || !auth.startsWith('Basic ')) {
      return new Response('Authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Japan Trip"' },
      })
    }

    const decoded = atob(auth.slice(6))
    const colonIdx = decoded.indexOf(':')
    const user = decoded.slice(0, colonIdx).toLowerCase()
    const pass = decoded.slice(colonIdx + 1)

    if (!allUsers.includes(user) || pass !== env.BASIC_AUTH_PASS) {
      return new Response('Invalid credentials', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Japan Trip"' },
      })
    }

    const role = admins.includes(user) ? 'admin' : 'viewer'

    // Pass auth info to downstream functions via context.data
    context.data.user = user
    context.data.role = role

    return await context.next()
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Middleware error', detail: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
