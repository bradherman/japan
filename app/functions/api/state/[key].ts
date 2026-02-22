/**
 * KV state read/write — Cloudflare Pages Function.
 *
 * GET /api/state/:key — Read a value
 * PUT /api/state/:key — Write a value (body: { value: any })
 *
 * Used for: packing checklist sync, chat history, schedule overrides.
 */

interface Env {
  TRIP_KV?: KVNamespace
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const key = context.params.key as string

  if (!context.env.TRIP_KV) {
    return Response.json({ value: null, source: 'no-kv' })
  }

  const value = await context.env.TRIP_KV.get(key)
  return Response.json({ value: value ? JSON.parse(value) : null })
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const key = context.params.key as string

  if (!context.env.TRIP_KV) {
    return Response.json({ ok: false, error: 'KV not configured' }, { status: 500 })
  }

  const body = await context.request.json() as { value: unknown }
  await context.env.TRIP_KV.put(key, JSON.stringify(body.value))
  return Response.json({ ok: true })
}
