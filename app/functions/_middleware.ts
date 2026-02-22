/**
 * Cloudflare Pages middleware: HTTP Basic Auth with role-based access.
 *
 * Supports multiple users, each with their own username and shared password.
 * Users are classified as "admin" (Brad/Alyona — can modify schedule) or
 * "viewer" (Dave/Gail — can view everything, ask questions, but can't modify).
 *
 * Secrets required (set via `wrangler secret put`):
 * - BASIC_AUTH_PASS  — shared password for all users
 * - ADMIN_USERS      — comma-separated admin usernames, e.g. "brad,alyona"
 * - VIEWER_USERS     — comma-separated viewer usernames, e.g. "dave,gail"
 */

interface Env {
  BASIC_AUTH_PASS: string
  ADMIN_USERS?: string   // "brad,alyona"
  VIEWER_USERS?: string  // "dave,gail"
}

function parseList(csv: string | undefined): string[] {
  return (csv || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean)
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  // Skip auth if secrets aren't configured (local dev)
  if (!env.BASIC_AUTH_PASS) {
    const response = await context.next()
    const newResponse = new Response(response.body, response)
    newResponse.headers.set('X-Auth-User', 'dev')
    newResponse.headers.set('X-Auth-Role', 'admin')
    return newResponse
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

  const response = await context.next()
  const newResponse = new Response(response.body, response)
  newResponse.headers.set('X-Auth-User', user)
  newResponse.headers.set('X-Auth-Role', role)
  return newResponse
}
