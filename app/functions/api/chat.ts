/**
 * Claude chat proxy — Cloudflare Pages Function.
 *
 * Secrets required: ANTHROPIC_API_KEY
 */

interface Env {
  ANTHROPIC_API_KEY: string
}

interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  dayContext?: string
}

export const onRequestPost: PagesFunction<Env, string, { user: string; role: string }> = async (context) => {
  const { request, env } = context

  try {
    if (!env.ANTHROPIC_API_KEY) {
      return Response.json({ error: 'API key not configured. Chat is unavailable.' })
    }

    let body: ChatRequest
    try {
      body = await request.json() as ChatRequest
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const authUser = context.data?.user || 'unknown'
    const authRole = context.data?.role || 'viewer'
    const isAdmin = authRole === 'admin'

    const roleInstruction = isAdmin
      ? 'The user is a trip organizer (Brad or Alyona). They can ask you to suggest schedule modifications, swap restaurants, adjust timing, and get recommendations.'
      : `The user (${authUser}) is a guest on this trip. They can ask questions about the itinerary but cannot modify the schedule.`

    const systemPrompt = `You are a helpful Japan trip assistant for Brad & Alyona's trip (April 25 - May 10, 2026).
Tokyo → Kyoto → Osaka → Hakone → Tokyo. Dave & Gail join for Tokyo only (Apr 25-30).

${roleInstruction}

Current user: ${authUser} (${authRole})

${body.dayContext ? `Here is today's schedule for context:\n${body.dayContext}` : ''}

Keep responses concise and practical — this is being read on a phone while walking around Japan.
Use specific details from the itinerary when relevant.
Format times in 12-hour format.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        system: systemPrompt,
        messages: body.messages,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      // Parse Anthropic error for a friendly message
      let friendlyError = `Chat unavailable (API error ${response.status})`
      try {
        const parsed = JSON.parse(errorBody)
        if (parsed.error?.message?.includes('credit balance')) {
          friendlyError = 'Anthropic API credits are depleted. Add credits at console.anthropic.com to enable chat.'
        } else if (parsed.error?.message) {
          friendlyError = parsed.error.message
        }
      } catch { /* use default */ }

      // Return as 200 so Cloudflare doesn't intercept with its own 502 page
      return Response.json({ error: friendlyError })
    }

    const data = await response.json() as { content: Array<{ text: string }> }
    return Response.json({
      response: data.content[0]?.text || 'No response',
      isAdmin,
      user: authUser,
    })
  } catch (e) {
    return Response.json({
      error: `Chat error: ${e instanceof Error ? e.message : String(e)}`,
    })
  }
}
