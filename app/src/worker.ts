/**
 * Unified Worker entry point.
 * Handles auth + API routes, falls through to static assets for everything else.
 */

interface Env {
  ASSETS: Fetcher
  TRIP_KV?: KVNamespace
  BASIC_AUTH_PASS: string
  ADMIN_USERS?: string
  VIEWER_USERS?: string
  ANTHROPIC_API_KEY: string
  BRAVE_API_KEY: string
  GITHUB_TOKEN: string
}

interface AuthInfo {
  user: string
  role: 'admin' | 'viewer'
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function parseList(csv: string | undefined): string[] {
  return (csv || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean)
}

function authenticate(request: Request, env: Env): AuthInfo | Response {
  // Skip auth if secrets aren't configured (local dev)
  if (!env.BASIC_AUTH_PASS) {
    return { user: 'dev', role: 'admin' }
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

  return { user, role: admins.includes(user) ? 'admin' : 'viewer' }
}

// ---------------------------------------------------------------------------
// /api/health
// ---------------------------------------------------------------------------

function handleHealth(auth: AuthInfo, env: Env): Response {
  return Response.json({
    ok: true,
    ts: new Date().toISOString(),
    user: auth.user,
    role: auth.role,
    hasApiKey: !!env.ANTHROPIC_API_KEY,
    hasAuthPass: !!env.BASIC_AUTH_PASS,
  })
}

// ---------------------------------------------------------------------------
// /api/state/:key
// ---------------------------------------------------------------------------

async function handleStateGet(key: string, env: Env): Promise<Response> {
  if (!env.TRIP_KV) {
    return Response.json({ value: null, source: 'no-kv' })
  }
  const value = await env.TRIP_KV.get(key)
  return Response.json({ value: value ? JSON.parse(value) : null })
}

async function handleStatePut(key: string, request: Request, env: Env): Promise<Response> {
  if (!env.TRIP_KV) {
    return Response.json({ ok: false, error: 'KV not configured' }, { status: 500 })
  }
  const body = await request.json() as { value: unknown }
  await env.TRIP_KV.put(key, JSON.stringify(body.value))
  return Response.json({ ok: true })
}

// ---------------------------------------------------------------------------
// /api/chat — Agentic Claude with tools
// ---------------------------------------------------------------------------

const GITHUB_REPO = 'bradherman/japan'

const READABLE_FILES = [
  'notes/finalized/itinerary.md',
  'notes/finalized/daily-schedule.md',
  'notes/finalized/reservation-tracker.md',
  'notes/finalized/transport-cheatsheet.md',
  'notes/restaurant-guide.md',
  'data/nightlife-guide.md',
] as const

const EDITABLE_FILES = [
  'notes/finalized/itinerary.md',
  'notes/finalized/daily-schedule.md',
  'notes/finalized/reservation-tracker.md',
  'notes/restaurant-guide.md',
  'data/nightlife-guide.md',
] as const

const WEB_SEARCH_TOOL = {
  name: 'web_search',
  description:
    'Search the web for restaurants, bars, activities, events, or other travel info in Japan. Use for current/real-time information like opening hours, reviews, or events.',
  input_schema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Search query, e.g. "best ramen near Shibuya station"',
      },
    },
    required: ['query'],
  },
}

const READ_FILE_TOOL = {
  name: 'read_itinerary_file',
  description:
    'Read a trip planning file to understand the current schedule, restaurant list, or other trip details. Always read the file before answering questions about the itinerary.',
  input_schema: {
    type: 'object' as const,
    properties: {
      file_path: {
        type: 'string',
        enum: READABLE_FILES,
        description: 'Which file to read',
      },
    },
    required: ['file_path'],
  },
}

const EDIT_FILE_TOOL = {
  name: 'edit_itinerary_file',
  description:
    'Edit a trip planning file. ONLY available to admin users (Brad/Alyona). Makes a specific text replacement in the file. After editing, GitHub Actions will auto-rebuild and redeploy in ~2 minutes.',
  input_schema: {
    type: 'object' as const,
    properties: {
      file_path: {
        type: 'string',
        enum: EDITABLE_FILES,
        description: 'Which file to edit',
      },
      old_text: {
        type: 'string',
        description: 'Exact text to find and replace',
      },
      new_text: {
        type: 'string',
        description: 'Replacement text',
      },
      commit_message: {
        type: 'string',
        description: 'Short description of the change',
      },
    },
    required: ['file_path', 'old_text', 'new_text', 'commit_message'],
  },
}

async function executeWebSearch(query: string, apiKey: string): Promise<string> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey },
  })
  if (!res.ok) return `Search error: ${res.status}`
  const data = (await res.json()) as {
    web?: { results?: Array<{ title: string; url: string; description: string }> }
  }
  const results = data.web?.results
  if (!results?.length) return 'No results found.'
  return results.map(r => `**${r.title}**\n${r.url}\n${r.description}`).join('\n\n')
}

async function executeReadFile(filePath: string, token: string): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3.raw',
        'User-Agent': 'japan-trip-bot',
      },
    }
  )
  if (!res.ok) return `Error reading file: ${res.status}`
  return await res.text()
}

function decodeBase64Utf8(base64: string): string {
  const binaryStr = atob(base64.replace(/\n/g, ''))
  const bytes = Uint8Array.from(binaryStr, c => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

async function executeEditFile(
  filePath: string, oldText: string, newText: string,
  commitMessage: string, token: string
): Promise<string> {
  const headers = {
    Authorization: `token ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'japan-trip-bot',
  }

  const getRes = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
    { headers }
  )
  if (!getRes.ok) return `Error reading file for edit: ${getRes.status}`

  const fileData = (await getRes.json()) as { content: string; sha: string }
  const content = decodeBase64Utf8(fileData.content)

  if (!content.includes(oldText)) {
    return 'Error: The exact text to replace was not found in the file. Read the file first to get the precise text.'
  }
  const newContent = content.replace(oldText, newText)

  const putRes = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: commitMessage,
        content: encodeBase64Utf8(newContent),
        sha: fileData.sha,
      }),
    }
  )
  if (!putRes.ok) {
    const errBody = await putRes.text()
    return `Error updating file (${putRes.status}): ${errBody.slice(0, 200)}`
  }

  return 'File updated successfully. GitHub Actions will auto-rebuild and redeploy in ~2 minutes.'
}

interface ContentBlock {
  type: 'text' | 'tool_use'
  text?: string
  id?: string
  name?: string
  input?: Record<string, string>
}

interface ClaudeResponse {
  content: ContentBlock[]
  stop_reason: string
}

const MAX_TOOL_ROUNDS = 15

async function executeTool(
  name: string, input: Record<string, string>, env: Env, isAdmin: boolean
): Promise<string> {
  switch (name) {
    case 'web_search':
      return executeWebSearch(input.query, env.BRAVE_API_KEY)
    case 'read_itinerary_file':
      return executeReadFile(input.file_path, env.GITHUB_TOKEN)
    case 'edit_itinerary_file':
      if (!isAdmin) return 'Permission denied: only admin users (Brad/Alyona) can edit files.'
      return executeEditFile(input.file_path, input.old_text, input.new_text, input.commit_message, env.GITHUB_TOKEN)
    default:
      return `Unknown tool: ${name}`
  }
}

interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  dayContext?: string
}

const TRIP_START_UTC = Date.UTC(2026, 3, 25) // Apr 25, 2026 = Day 1
const TRIP_END_UTC = Date.UTC(2026, 4, 10)   // May 10, 2026 = Day 16

function getJSTContext(): string {
  // JST = UTC+9. Shift now into JST and read with UTC accessors so we get the JST clock.
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  const dayOfWeek = dayNames[jst.getUTCDay()]
  const month = monthNames[jst.getUTCMonth()]
  const day = jst.getUTCDate()
  const year = jst.getUTCFullYear()
  let h = jst.getUTCHours()
  const m = jst.getUTCMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  const time = `${h}:${m.toString().padStart(2, '0')} ${ampm}`

  const todayUTC = Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate())
  const dayDiff = Math.floor((todayUTC - TRIP_START_UTC) / 86_400_000)
  const tripDay = dayDiff + 1
  let tripStatus: string
  if (todayUTC < TRIP_START_UTC) {
    const daysOut = Math.ceil((TRIP_START_UTC - todayUTC) / 86_400_000)
    tripStatus = `Trip starts in ${daysOut} day(s) (Apr 25, 2026)`
  } else if (todayUTC > TRIP_END_UTC) {
    const daysSince = Math.floor((todayUTC - TRIP_END_UTC) / 86_400_000)
    tripStatus = `Trip ended ${daysSince} day(s) ago (May 10, 2026)`
  } else {
    tripStatus = `Day ${tripDay} of 16 of the trip (Apr 25 = Day 1, May 10 = Day 16)`
  }

  return `Current date/time in Japan (JST, UTC+9): ${dayOfWeek}, ${month} ${day}, ${year} at ${time}.
${tripStatus}.`
}

async function handleChat(request: Request, auth: AuthInfo, env: Env): Promise<Response> {
  if (!env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'API key not configured. Chat is unavailable.' })
  }

  let body: ChatRequest
  try {
    body = (await request.json()) as ChatRequest
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const isAdmin = auth.role === 'admin'
  const tools: Record<string, unknown>[] = [WEB_SEARCH_TOOL, READ_FILE_TOOL]
  if (isAdmin) tools.push(EDIT_FILE_TOOL)

  const roleInstruction = isAdmin
    ? 'The user is a trip organizer (Brad or Alyona). They can ask you to modify the itinerary, swap restaurants, adjust timing, and get recommendations. Use the edit_itinerary_file tool to make changes when asked.'
    : `The user (${auth.user}) is a guest on this trip. They can ask questions and search the web, but cannot modify the schedule.`

  const jstContext = getJSTContext()

  const systemPrompt = `You are a helpful Japan trip assistant for Brad & Alyona's trip (April 25 – May 10, 2026).
Tokyo → Kyoto → Osaka → Hakone → Tokyo. Dave & Gail join for Tokyo only (Apr 25-30).

${jstContext}
Use this date/time as ground truth — do NOT guess what day it is. When the user says "today", "tomorrow", "tonight", or "this morning", anchor to the JST date above. If a planning file lists a wrong day-of-week for a date, trust the calendar (the date) over the label.

VERIFY BEFORE RECOMMENDING — Restaurant hours, weekly closures, and event availability change. Before suggesting a place or scheduling something, use web_search to verify:
1. Open hours for the specific day-of-week we'd be going (many Japanese spots close Sun, Mon, Wed, or holidays).
2. Whether the place is open on the actual JST date in question (check Golden Week Apr 29 – May 6 closures, Showa Day Apr 29, Constitution Day May 3, Greenery Day May 4, Children's Day May 5).
3. Current reservation availability if relevant.
Never recommend a time slot without first confirming the place is open then. If web_search results are ambiguous, say so explicitly rather than guessing.

You have access to tools:
- **web_search**: Search the web for restaurants, events, activities, opening hours, reviews. Use this when users ask about specific places or want current info — and ALWAYS to verify hours/closures before adding something to the schedule.
- **read_itinerary_file**: Read trip planning files to understand the current schedule, restaurant list, transport info, or reservations. Always read the relevant file before answering schedule questions.
${isAdmin ? `- **edit_itinerary_file**: Edit trip files to make changes. Read the file first, find the exact text, then make a precise replacement. Tell the user the app will rebuild and redeploy via GitHub Actions in ~2 minutes after an edit.

IMPORTANT — File sync rules when editing:
1. The three finalized files (itinerary.md, daily-schedule.md, reservation-tracker.md) MUST stay in sync. When you edit one, read and update the other two.
2. When adding a restaurant to "ALREADY BOOKED", you MUST also strike through (~~text~~) the old entry in its original section (Book Now, Book 1 Week Ahead, etc.) AND strike through any related Calendar Alarm entries.
3. When confirming a booking, update the corresponding day in itinerary.md (make it the primary option, not a backup) and daily-schedule.md (adjust timing to match the reservation time).
4. When changing departure times or transport, update ALL of: daily-schedule.md, transport-cheatsheet.md, reservation-tracker.md (Shinkansen section), and itinerary.md.
5. Always read each file BEFORE editing to get the exact text for replacement.
6. Before scheduling or confirming any new venue, web_search its hours for that specific weekday and verify it isn't closed for Golden Week / a national holiday.` : ''}

${roleInstruction}

Current user: ${auth.user} (${auth.role})

${body.dayContext ? `Here is today's schedule for context:\n${body.dayContext}` : ''}

Keep responses concise and practical — this is being read on a phone while walking around Japan.
Use specific details from the itinerary when relevant. Format times in 12-hour format.`

  const messages: Array<{ role: string; content: string | ContentBlock[] }> =
    body.messages.map(m => ({ role: m.role, content: m.content }))

  const toolsUsed: Array<{ name: string; input: Record<string, string> }> = []

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: systemPrompt,
        tools,
        messages,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      let friendlyError = `Chat unavailable (API error ${response.status})`
      try {
        const parsed = JSON.parse(errorBody)
        if (parsed.error?.message?.includes('credit balance')) {
          friendlyError = 'Anthropic API credits are depleted. Add credits at console.anthropic.com to enable chat.'
        } else if (parsed.error?.message) {
          friendlyError = parsed.error.message
        }
      } catch { /* use default */ }
      return Response.json({ error: friendlyError })
    }

    const data = (await response.json()) as ClaudeResponse

    if (data.stop_reason === 'end_turn') {
      const textContent = data.content.filter(b => b.type === 'text').map(b => b.text).join('')
      return Response.json({
        response: textContent || 'No response',
        toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
        isAdmin,
        user: auth.user,
      })
    }

    if (data.stop_reason === 'tool_use') {
      const toolBlocks = data.content.filter(b => b.type === 'tool_use')
      const toolResults = await Promise.all(
        toolBlocks.map(async toolBlock => {
          const input = toolBlock.input as Record<string, string>
          toolsUsed.push({ name: toolBlock.name!, input })
          const result = await executeTool(toolBlock.name!, input, env, isAdmin)
          return { type: 'tool_result' as const, tool_use_id: toolBlock.id!, content: result }
        })
      )
      messages.push({ role: 'assistant', content: data.content })
      messages.push({ role: 'user', content: toolResults as unknown as string })
    }
  }

  return Response.json({
    response: 'I ran into a limit processing your request. Please try a simpler question.',
    toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
    isAdmin,
    user: auth.user,
  })
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // API routes require auth
    if (url.pathname.startsWith('/api/')) {
      const authResult = authenticate(request, env)
      if (authResult instanceof Response) return authResult
      const auth = authResult

      try {
        // /api/health
        if (url.pathname === '/api/health' && request.method === 'GET') {
          return handleHealth(auth, env)
        }

        // /api/chat
        if (url.pathname === '/api/chat' && request.method === 'POST') {
          return handleChat(request, auth, env)
        }

        // /api/state/:key
        const stateMatch = url.pathname.match(/^\/api\/state\/(.+)$/)
        if (stateMatch) {
          const key = stateMatch[1]
          if (request.method === 'GET') return handleStateGet(key, env)
          if (request.method === 'PUT') return handleStatePut(key, request, env)
        }

        return Response.json({ error: 'Not found' }, { status: 404 })
      } catch (e) {
        return Response.json(
          { error: 'Server error', detail: e instanceof Error ? e.message : String(e) },
          { status: 500 }
        )
      }
    }

    // Non-API routes: auth then serve static assets
    const authResult = authenticate(request, env)
    if (authResult instanceof Response) return authResult

    return env.ASSETS.fetch(request)
  },
}
