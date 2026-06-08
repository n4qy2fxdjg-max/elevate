export interface Env {
  DB: D1Database
  ASSETS: Fetcher
  REMINDER: DurableObjectNamespace
  VAPID_PUBLIC: string
  VAPID_PRIVATE_JWK: string
  VAPID_SUBJECT: string
}

// ── Web Push (VAPID, bodyless) ────────────────────────────────────────
function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlStr(str: string): string {
  return b64url(new TextEncoder().encode(str))
}

let _vapidKey: CryptoKey | null = null
async function vapidKey(env: Env): Promise<CryptoKey> {
  if (_vapidKey) return _vapidKey
  _vapidKey = await crypto.subtle.importKey(
    'jwk',
    JSON.parse(env.VAPID_PRIVATE_JWK),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
  return _vapidKey
}

async function signVapid(aud: string, env: Env): Promise<string> {
  const header = b64urlStr(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  const payload = b64urlStr(JSON.stringify({
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: env.VAPID_SUBJECT,
  }))
  const data = `${header}.${payload}`
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    await vapidKey(env),
    new TextEncoder().encode(data)
  )
  return `${data}.${b64url(sig)}`
}

/** Send a bodyless web push (the SW fetches the text). iOS vibrates on delivery. */
async function sendPush(subscription: { endpoint: string }, env: Env): Promise<void> {
  const endpoint = subscription.endpoint
  const aud = new URL(endpoint).origin
  const jwt = await signVapid(aud, env)
  await fetch(endpoint, {
    method: 'POST',
    headers: {
      TTL: '120',
      Urgency: 'high',
      Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC}`,
    },
  })
}

// ── Durable Object: one alarm per (device endpoint + kind) ────────────
// Schedules a single reminder; the alarm fires a web push at the set time,
// even when the PWA is backgrounded or the screen is off.
export class ReminderScheduler {
  state: DurableObjectState
  env: Env
  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
  }

  async fetch(req: Request): Promise<Response> {
    const action = new URL(req.url).pathname.split('/').pop()
    if (action === 'schedule') {
      const { subscription, fireAt, title, body, endpoint } = (await req.json()) as {
        subscription: { endpoint: string }
        fireAt: number
        title: string
        body: string
        endpoint: string
      }
      await this.state.storage.put('sub', subscription)
      await this.state.storage.put('endpoint', endpoint)
      await this.state.storage.put('msg', { title, body })
      const when = Number(fireAt)
      if (when && when > Date.now()) await this.state.storage.setAlarm(when)
      else await this.fire()
      return new Response('ok')
    }
    if (action === 'cancel') {
      await this.state.storage.deleteAlarm()
      return new Response('ok')
    }
    return new Response('not found', { status: 404 })
  }

  async alarm(): Promise<void> {
    await this.fire()
  }

  async fire(): Promise<void> {
    const sub = (await this.state.storage.get('sub')) as { endpoint: string } | undefined
    const endpoint = (await this.state.storage.get('endpoint')) as string | undefined
    const msg = (await this.state.storage.get('msg')) as { title: string; body: string } | undefined
    if (!sub || !endpoint) return
    // Record the message so the service worker can show the right text.
    try {
      await this.env.DB.prepare(
        'INSERT INTO push_pending (endpoint, title, body, updated_at) VALUES (?, ?, ?, ?) ' +
          'ON CONFLICT(endpoint) DO UPDATE SET title = excluded.title, body = excluded.body, updated_at = excluded.updated_at'
      ).bind(endpoint, msg?.title ?? 'Elevate', msg?.body ?? 'Back to your workout', Date.now()).run()
    } catch { /* ignore */ }
    try { await sendPush(sub, this.env) } catch { /* push endpoint may be gone */ }
  }
}

// ── CORS ──────────────────────────────────────────────────────────────
// App and API are same-origin, so this is defense-in-depth: it stops an
// arbitrary third-party site from calling the API with a stolen code from a
// victim's browser. Non-browser callers ignore CORS — the codes + rate
// limiting are the real protection.
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  try {
    const host = new URL(origin).host
    return (
      host === 'elevate.n4qy2fxdjg.workers.dev' ||
      host === 'localhost' ||
      host.startsWith('localhost:') ||
      host.startsWith('127.0.0.1')
    )
  } catch {
    return false
  }
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
  if (isAllowedOrigin(origin)) headers['Access-Control-Allow-Origin'] = origin as string
  return headers
}

function json(data: unknown, origin: string | null, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  })
}

function err(msg: string, origin: string | null, status = 400): Response {
  return json({ error: msg }, origin, status)
}

// ── Sync code generation (CSPRNG) ─────────────────────────────────────
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 31 chars, no I/O for readability

function generateCode(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  let s = ''
  for (let i = 0; i < 6; i++) s += CODE_CHARS[bytes[i] % CODE_CHARS.length]
  return s // 6-char, no hyphen — matches existing codes + the join input
}

// ── Input limits ──────────────────────────────────────────────────────
const MAX_BODY_BYTES = 2_000_000
const MAX_LOGS = 5000
const MAX_PLANS = 500
const MAX_ACTIVITIES = 5000

/** Parse a JSON body, returning null on malformed/oversized input (never throws). */
async function readJson(request: Request): Promise<unknown | null> {
  const len = Number(request.headers.get('Content-Length') ?? '0')
  if (len > MAX_BODY_BYTES) return null
  try {
    return await request.json()
  } catch {
    return null
  }
}

const isStr = (v: unknown): v is string => typeof v === 'string'
const hasStrId = (v: unknown): v is { id: string } =>
  typeof v === 'object' && v !== null && isStr((v as { id: unknown }).id)

// ── Basic fixed-window rate limit (per IP) ────────────────────────────
const RL_WINDOW_MS = 60_000
const RL_MAX = 30

async function rateLimited(env: Env, request: Request): Promise<boolean> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const now = Date.now()
  try {
    const row = await env.DB.prepare(
      'SELECT window_start, count FROM rate_limits WHERE ip = ?'
    ).bind(ip).first<{ window_start: number; count: number }>()

    let windowStart = now
    let count = 1
    if (row && now - row.window_start < RL_WINDOW_MS) {
      windowStart = row.window_start
      count = row.count + 1
      if (count > RL_MAX) return true
    }
    await env.DB.prepare(
      'INSERT INTO rate_limits (ip, window_start, count) VALUES (?, ?, ?) ' +
        'ON CONFLICT(ip) DO UPDATE SET window_start = excluded.window_start, count = excluded.count'
    ).bind(ip, windowStart, count).run()
    return false
  } catch {
    return false // never let the limiter break the API
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin')

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) })
    }

    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, url, origin)
    }

    return env.ASSETS.fetch(request)
  },
}

async function handleApi(request: Request, env: Env, url: URL, origin: string | null): Promise<Response> {
  const path = url.pathname.replace('/api', '')

  // ── Push: schedule / cancel a backgrounded reminder ───────────────
  // One Durable Object per (endpoint + kind) so the rest-end and the
  // 2-minute reminders are independent and don't cancel each other.
  if (path === '/push/schedule' && request.method === 'POST') {
    const body = (await readJson(request)) as {
      subscription?: { endpoint?: string }
      fireAt?: number
      title?: string
      body?: string
      kind?: string
    } | null
    const endpoint = body?.subscription?.endpoint
    if (!body || !isStr(endpoint)) return err('Invalid subscription', origin)
    const kind = body.kind === 'set' ? 'set' : 'rest'
    const stub = env.REMINDER.get(env.REMINDER.idFromName(`${endpoint}:${kind}`))
    await stub.fetch('https://do/schedule', {
      method: 'POST',
      body: JSON.stringify({
        subscription: body.subscription,
        endpoint,
        fireAt: body.fireAt,
        title: body.title ?? 'Elevate',
        body: body.body ?? 'Back to your workout',
      }),
    })
    return json({ ok: true }, origin)
  }

  if (path === '/push/cancel' && request.method === 'POST') {
    const body = (await readJson(request)) as { endpoint?: string; kind?: string } | null
    const endpoint = body?.endpoint
    if (!body || !isStr(endpoint)) return err('Invalid endpoint', origin)
    const kind = body.kind === 'set' ? 'set' : 'rest'
    const stub = env.REMINDER.get(env.REMINDER.idFromName(`${endpoint}:${kind}`))
    await stub.fetch('https://do/cancel', { method: 'POST' })
    return json({ ok: true }, origin)
  }

  // GET /api/push/pending?endpoint=… — the SW fetches the text to show
  if (path === '/push/pending' && request.method === 'GET') {
    const endpoint = url.searchParams.get('endpoint')
    if (!endpoint) return json({ title: 'Elevate', body: 'Back to your workout' }, origin)
    const row = await env.DB.prepare('SELECT title, body FROM push_pending WHERE endpoint = ?')
      .bind(endpoint).first<{ title: string; body: string }>()
    return json(row ?? { title: 'Elevate', body: 'Back to your workout' }, origin)
  }

  // ── POST /api/sync/create ─────────────────────────────────────────
  if (path === '/sync/create' && request.method === 'POST') {
    if (await rateLimited(env, request)) return err('Too many requests — slow down', origin, 429)
    let code = generateCode()
    for (let i = 0; i < 8; i++) {
      const existing = await env.DB.prepare('SELECT code FROM sync_codes WHERE code = ?')
        .bind(code).first()
      if (!existing) break
      code = generateCode()
    }
    await env.DB.prepare('INSERT INTO sync_codes (code, created_at) VALUES (?, ?)')
      .bind(code, new Date().toISOString())
      .run()
    return json({ code }, origin)
  }

  // ── POST /api/sync/verify ─────────────────────────────────────────
  if (path === '/sync/verify' && request.method === 'POST') {
    if (await rateLimited(env, request)) return err('Too many requests — slow down', origin, 429)
    const body = await readJson(request)
    const code = (body as { code?: unknown })?.code
    const normalised = isStr(code) ? code.trim().toUpperCase() : ''
    if (!normalised) return err('Missing code', origin)
    const row = await env.DB.prepare('SELECT code FROM sync_codes WHERE code = ?')
      .bind(normalised).first()
    return json({ exists: !!row }, origin)
  }

  // ── /api/sync/:code/push  or  /api/sync/:code/pull ───────────────
  const syncMatch = path.match(/^\/sync\/([A-Z0-9]+)\/(push|pull)$/)
  if (syncMatch) {
    const [, code, action] = syncMatch

    const codeRow = await env.DB.prepare('SELECT code FROM sync_codes WHERE code = ?')
      .bind(code).first()
    if (!codeRow) return err('Invalid sync code', origin, 404)

    // ── push: per-record upsert, last-write-wins, single atomic batch ──
    if (action === 'push' && request.method === 'POST') {
      const body = await readJson(request)
      if (!body || typeof body !== 'object') return err('Invalid request body', origin)

      const { logs, plans, activityLogs } = body as {
        logs?: unknown
        plans?: unknown
        activityLogs?: unknown
      }

      if (logs !== undefined && !Array.isArray(logs)) return err('logs must be an array', origin)
      if (plans !== undefined && !Array.isArray(plans)) return err('plans must be an array', origin)
      if (activityLogs !== undefined && !Array.isArray(activityLogs)) return err('activityLogs must be an array', origin)
      const logsArr = (logs as unknown[]) ?? []
      const plansArr = (plans as unknown[]) ?? []
      const actArr = (activityLogs as unknown[]) ?? []
      if (logsArr.length > MAX_LOGS || plansArr.length > MAX_PLANS || actArr.length > MAX_ACTIVITIES) {
        return err('Payload too large', origin, 413)
      }

      const nowIso = new Date().toISOString()
      const stmts: D1PreparedStatement[] = []

      const upsert = (table: string, rec: unknown) => {
        if (!hasStrId(rec)) return
        const updatedMs = Number((rec as { updatedAt?: unknown }).updatedAt) || 0
        const deleted = (rec as { deleted?: unknown }).deleted ? 1 : 0
        stmts.push(
          env.DB.prepare(
            `INSERT INTO ${table} (id, sync_code, data, updated_at, updated_ms, deleted) ` +
              'VALUES (?, ?, ?, ?, ?, ?) ' +
              'ON CONFLICT(id) DO UPDATE SET data = excluded.data, sync_code = excluded.sync_code, ' +
              `updated_at = excluded.updated_at, updated_ms = excluded.updated_ms, deleted = excluded.deleted ` +
              `WHERE excluded.updated_ms > ${table}.updated_ms`
          ).bind((rec as { id: string }).id, code, JSON.stringify(rec), nowIso, updatedMs, deleted)
        )
      }

      for (const log of logsArr) upsert('workout_logs', log)
      for (const plan of plansArr) upsert('workout_plans', plan)
      for (const act of actArr) upsert('activity_logs', act)

      if (stmts.length > 0) await env.DB.batch(stmts)

      return json({ ok: true, synced: nowIso }, origin)
    }

    // ── pull: return everything, incl. tombstones so deletions propagate ──
    if (action === 'pull' && request.method === 'GET') {
      const [logsResult, plansResult, activityResult] = await env.DB.batch([
        env.DB.prepare('SELECT data FROM workout_logs WHERE sync_code = ? ORDER BY updated_ms DESC').bind(code),
        env.DB.prepare('SELECT data FROM workout_plans WHERE sync_code = ?').bind(code),
        env.DB.prepare('SELECT data FROM activity_logs WHERE sync_code = ? ORDER BY updated_ms DESC').bind(code),
      ])

      const parse = (res: D1Result) =>
        ((res.results ?? []) as Array<{ data: string }>).map((r) => JSON.parse(r.data))

      return json(
        { logs: parse(logsResult), plans: parse(plansResult), activityLogs: parse(activityResult) },
        origin
      )
    }
  }

  return err('Not found', origin, 404)
}
