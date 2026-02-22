/**
 * Claude chat proxy — Cloudflare Pages Function.
 *
 * Injects the current day's itinerary as context.
 * Respects user roles from middleware headers:
 *   - admin (Brad/Alyona): can request schedule modifications
 *   - viewer (Dave/Gail): can ask questions only
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

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  if (!env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const body = await request.json() as ChatRequest
  const authUser = request.headers.get('X-Auth-User') || 'unknown'
  const authRole = request.headers.get('X-Auth-Role') || 'viewer'
  const isAdmin = authRole === 'admin'

  const roleInstruction = isAdmin
    ? 'The user is a trip organizer (Brad or Alyona). They can ask you to suggest schedule modifications, swap restaurants, adjust timing, and get recommendations. When they ask to change something, provide specific suggestions.'
    : `The user (${authUser}) is a guest on this trip. They can ask questions about the itinerary, get directions, restaurant info, and general recommendations. However, they CANNOT modify the schedule — only Brad and Alyona can do that. If they ask to change or skip something, politely explain this is Brad & Alyona's itinerary and suggest they discuss any changes with them directly.`

  const systemPrompt = `You are a helpful Japan trip assistant for Brad & Alyona's trip (April 25 - May 10, 2026).
Tokyo → Kyoto → Osaka → Hakone → Tokyo. Dave & Gail join for Tokyo only (Apr 25-30).

${roleInstruction}

Current user: ${authUser} (${authRole})

${body.dayContext ? `Here is today's schedule for context:\n${body.dayContext}` : ''}

Keep responses concise and practical — this is being read on a phone while walking around Japan.
Use specific details from the itinerary when relevant.
If suggesting restaurants or bars, mention the ones already on the itinerary first.
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
    return Response.json({ error: `Claude API error: ${response.status}` }, { status: 502 })
  }

  const data = await response.json() as { content: Array<{ text: string }> }
  return Response.json({
    response: data.content[0]?.text || 'No response',
    isAdmin,
    user: authUser,
  })
}
