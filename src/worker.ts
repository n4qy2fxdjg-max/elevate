export interface Env {
  DB: D1Database
  ASSETS: Fetcher
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })
}

function err(msg: string, status = 400): Response {
  return json({ error: msg }, status)
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() })
    }

    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, url)
    }

    return env.ASSETS.fetch(request)
  },
}

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.replace('/api', '')

  // POST /api/sync/create
  if (path === '/sync/create' && request.method === 'POST') {
    let code = generateCode()
    for (let i = 0; i < 5; i++) {
      const existing = await env.DB.prepare('SELECT code FROM sync_codes WHERE code = ?').bind(code).first()
      if (!existing) break
      code = generateCode()
    }
    await env.DB.prepare('INSERT INTO sync_codes (code, created_at) VALUES (?, ?)')
      .bind(code, new Date().toISOString())
      .run()
    return json({ code })
  }

  // POST /api/sync/verify
  if (path === '/sync/verify' && request.method === 'POST') {
    const body = (await request.json()) as { code: string }
    const row = await env.DB.prepare('SELECT code FROM sync_codes WHERE code = ?')
      .bind(body.code.toUpperCase().trim())
      .first()
    return json({ exists: !!row })
  }

  // /api/sync/:code/push  or  /api/sync/:code/pull
  const syncMatch = path.match(/^\/sync\/([A-Z0-9]+)\/(push|pull)$/)
  if (syncMatch) {
    const [, code, action] = syncMatch

    const codeRow = await env.DB.prepare('SELECT code FROM sync_codes WHERE code = ?').bind(code).first()
    if (!codeRow) return err('Invalid sync code', 404)

    if (action === 'push' && request.method === 'POST') {
      const { logs, plans, activityLogs = [] } = (await request.json()) as {
        logs: any[]
        plans: any[]
        activityLogs?: any[]
      }
      const now = new Date().toISOString()

      // Full replace for all three tables
      await env.DB.batch([
        env.DB.prepare('DELETE FROM workout_logs WHERE sync_code = ?').bind(code),
        env.DB.prepare('DELETE FROM workout_plans WHERE sync_code = ?').bind(code),
        env.DB.prepare('DELETE FROM activity_logs WHERE sync_code = ?').bind(code),
      ])

      const batches: D1PreparedStatement[] = []

      if (logs.length > 0) {
        const stmt = env.DB.prepare(
          'INSERT INTO workout_logs (id, sync_code, data, updated_at) VALUES (?, ?, ?, ?)'
        )
        for (const log of logs) batches.push(stmt.bind(log.id, code, JSON.stringify(log), now))
      }

      if (plans.length > 0) {
        const stmt = env.DB.prepare(
          'INSERT INTO workout_plans (id, sync_code, data, updated_at) VALUES (?, ?, ?, ?)'
        )
        for (const plan of plans) batches.push(stmt.bind(plan.id, code, JSON.stringify(plan), now))
      }

      if (activityLogs.length > 0) {
        const stmt = env.DB.prepare(
          'INSERT INTO activity_logs (id, sync_code, data, updated_at) VALUES (?, ?, ?, ?)'
        )
        for (const log of activityLogs) batches.push(stmt.bind(log.id, code, JSON.stringify(log), now))
      }

      if (batches.length > 0) await env.DB.batch(batches)

      return json({ ok: true, synced: now })
    }

    if (action === 'pull' && request.method === 'GET') {
      const [logsResult, plansResult, activityResult] = await env.DB.batch([
        env.DB.prepare('SELECT data FROM workout_logs WHERE sync_code = ? ORDER BY updated_at DESC').bind(code),
        env.DB.prepare('SELECT data FROM workout_plans WHERE sync_code = ?').bind(code),
        env.DB.prepare('SELECT data FROM activity_logs WHERE sync_code = ? ORDER BY updated_at DESC').bind(code),
      ])

      const logs = (logsResult.results ?? []).map((r) => JSON.parse(r.data as string))
      const plans = (plansResult.results ?? []).map((r) => JSON.parse(r.data as string))
      const activityLogs = (activityResult.results ?? []).map((r) => JSON.parse(r.data as string))

      return json({ logs, plans, activityLogs })
    }
  }

  return err('Not found', 404)
}
