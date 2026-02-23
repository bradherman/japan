/**
 * Agentic Claude chat — Cloudflare Pages Function.
 *
 * Claude uses tool_use to search the web (Brave), read itinerary files
 * (GitHub Contents API), and edit them (admin only, GitHub Contents API).
 *
 * Secrets required:
 *   ANTHROPIC_API_KEY, BRAVE_API_KEY, GITHUB_TOKEN
 */

interface Env {
  ANTHROPIC_API_KEY: string
  BRAVE_API_KEY: string
  GITHUB_TOKEN: string
}

interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  dayContext?: string
}

interface ChatResponse {
  response: string
  toolsUsed?: Array<{ name: string; input: Record<string, string> }>
  isAdmin?: boolean
  user?: string
  error?: string
}

// -- GitHub config ----------------------------------------------------------

const GITHUB_REPO = 'bradherman/japan'

// -- Allowed files ----------------------------------------------------------

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

// -- Tool definitions -------------------------------------------------------

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
    'Edit a trip planning file. ONLY available to admin users (Brad/Alyona). Makes a specific text replacement in the file. After editing, the app will auto-rebuild and redeploy in ~30 seconds.',
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

// -- Tool executors ---------------------------------------------------------

async function executeWebSearch(query: string, apiKey: string): Promise<string> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': apiKey,
    },
  })
  if (!res.ok) return `Search error: ${res.status}`
  const data = (await res.json()) as {
    web?: { results?: Array<{ title: string; url: string; description: string }> }
  }
  const results = data.web?.results
  if (!results?.length) return 'No results found.'
  return results
    .map((r) => `**${r.title}**\n${r.url}\n${r.description}`)
    .join('\n\n')
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

/** UTF-8-safe base64 decode (atob only handles Latin-1). */
function decodeBase64Utf8(base64: string): string {
  const binaryStr = atob(base64.replace(/\n/g, ''))
  const bytes = Uint8Array.from(binaryStr, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** UTF-8-safe base64 encode. */
function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

async function executeEditFile(
  filePath: string,
  oldText: string,
  newText: string,
  commitMessage: string,
  token: string
): Promise<string> {
  const headers = {
    Authorization: `token ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'japan-trip-bot',
  }

  // 1. GET current file (need sha + content)
  const getRes = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
    { headers }
  )
  if (!getRes.ok) return `Error reading file for edit: ${getRes.status}`

  const fileData = (await getRes.json()) as { content: string; sha: string }
  const content = decodeBase64Utf8(fileData.content)

  // 2. Apply edit
  if (!content.includes(oldText)) {
    return 'Error: The exact text to replace was not found in the file. Read the file first to get the precise text.'
  }
  const newContent = content.replace(oldText, newText)

  // 3. PUT updated file
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

  return 'File updated successfully. The app will auto-rebuild and redeploy in ~30 seconds.'
}

// -- Agentic loop -----------------------------------------------------------

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

const MAX_TOOL_ROUNDS = 5

async function executeTool(
  name: string,
  input: Record<string, string>,
  env: Env,
  isAdmin: boolean
): Promise<string> {
  switch (name) {
    case 'web_search':
      return executeWebSearch(input.query, env.BRAVE_API_KEY)
    case 'read_itinerary_file':
      return executeReadFile(input.file_path, env.GITHUB_TOKEN)
    case 'edit_itinerary_file':
      if (!isAdmin) return 'Permission denied: only admin users (Brad/Alyona) can edit files.'
      return executeEditFile(
        input.file_path,
        input.old_text,
        input.new_text,
        input.commit_message,
        env.GITHUB_TOKEN
      )
    default:
      return `Unknown tool: ${name}`
  }
}

export const onRequestPost: PagesFunction<Env, string, { user: string; role: string }> =
  async (context) => {
    const { request, env } = context

    try {
      if (!env.ANTHROPIC_API_KEY) {
        return Response.json({ error: 'API key not configured. Chat is unavailable.' } as ChatResponse)
      }

      let body: ChatRequest
      try {
        body = (await request.json()) as ChatRequest
      } catch {
        return Response.json({ error: 'Invalid request body' } as ChatResponse, { status: 400 })
      }

      const authUser = context.data?.user || 'unknown'
      const authRole = context.data?.role || 'viewer'
      const isAdmin = authRole === 'admin'

      // Build tools list — edit only for admins
      const tools = [WEB_SEARCH_TOOL, READ_FILE_TOOL]
      if (isAdmin) tools.push(EDIT_FILE_TOOL)

      const roleInstruction = isAdmin
        ? 'The user is a trip organizer (Brad or Alyona). They can ask you to modify the itinerary, swap restaurants, adjust timing, and get recommendations. Use the edit_itinerary_file tool to make changes when asked.'
        : `The user (${authUser}) is a guest on this trip. They can ask questions and search the web, but cannot modify the schedule.`

      const systemPrompt = `You are a helpful Japan trip assistant for Brad & Alyona's trip (April 25 – May 10, 2026).
Tokyo → Kyoto → Osaka → Hakone → Tokyo. Dave & Gail join for Tokyo only (Apr 25-30).

You have access to tools:
- **web_search**: Search the web for restaurants, events, activities, opening hours, reviews. Use this when users ask about specific places or want current info.
- **read_itinerary_file**: Read trip planning files to understand the current schedule, restaurant list, transport info, or reservations. Always read the relevant file before answering schedule questions.
${isAdmin ? '- **edit_itinerary_file**: Edit trip files to make changes. Read the file first, find the exact text, then make a precise replacement. Tell the user the app will rebuild in ~30 seconds after an edit.' : ''}

${roleInstruction}

Current user: ${authUser} (${authRole})

${body.dayContext ? `Here is today's schedule for context:\n${body.dayContext}` : ''}

Keep responses concise and practical — this is being read on a phone while walking around Japan.
Use specific details from the itinerary when relevant. Format times in 12-hour format.`

      // Convert simple text messages to Claude format
      const messages: Array<{ role: string; content: string | ContentBlock[] }> =
        body.messages.map((m) => ({ role: m.role, content: m.content }))

      const toolsUsed: Array<{ name: string; input: Record<string, string> }> = []

      // Agentic tool loop
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 2048,
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
              friendlyError =
                'Anthropic API credits are depleted. Add credits at console.anthropic.com to enable chat.'
            } else if (parsed.error?.message) {
              friendlyError = parsed.error.message
            }
          } catch {
            /* use default */
          }
          return Response.json({ error: friendlyError } as ChatResponse)
        }

        const data = (await response.json()) as ClaudeResponse

        // Check for final text response
        if (data.stop_reason === 'end_turn') {
          const textContent = data.content
            .filter((b) => b.type === 'text')
            .map((b) => b.text)
            .join('')
          return Response.json({
            response: textContent || 'No response',
            toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
            isAdmin,
            user: authUser,
          } as ChatResponse)
        }

        // Handle tool use
        if (data.stop_reason === 'tool_use') {
          const toolBlocks = data.content.filter((b) => b.type === 'tool_use')

          const toolResults = await Promise.all(
            toolBlocks.map(async (toolBlock) => {
              const input = toolBlock.input as Record<string, string>
              toolsUsed.push({ name: toolBlock.name!, input })
              const result = await executeTool(toolBlock.name!, input, env, isAdmin)
              return {
                type: 'tool_result' as const,
                tool_use_id: toolBlock.id!,
                content: result,
              }
            })
          )

          // Append assistant response + tool results to continue the loop
          messages.push({ role: 'assistant', content: data.content })
          messages.push({ role: 'user', content: toolResults as unknown as string })
        }
      }

      // Exhausted tool rounds — return whatever text we have
      return Response.json({
        response: 'I ran into a limit processing your request. Please try a simpler question.',
        toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
        isAdmin,
        user: authUser,
      } as ChatResponse)
    } catch (e) {
      return Response.json({
        error: `Chat error: ${e instanceof Error ? e.message : String(e)}`,
      } as ChatResponse)
    }
  }
