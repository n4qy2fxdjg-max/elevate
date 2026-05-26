import type { WorkoutLog, WorkoutPlan, ActivityLog } from '../types'

export async function createSyncCode(): Promise<string> {
  const res = await fetch('/api/sync/create', { method: 'POST' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to create sync code')
  return data.code
}

export async function verifySyncCode(code: string): Promise<boolean> {
  const res = await fetch('/api/sync/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: code.toUpperCase().trim() }),
  })
  const data = await res.json()
  return !!data.exists
}

export async function pushSync(
  code: string,
  logs: WorkoutLog[],
  plans: WorkoutPlan[],
  activityLogs: ActivityLog[] = []
): Promise<string> {
  const res = await fetch(`/api/sync/${code}/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logs, plans, activityLogs }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Sync failed')
  return data.synced as string
}

export async function pullSync(
  code: string
): Promise<{ logs: WorkoutLog[]; plans: WorkoutPlan[]; activityLogs: ActivityLog[] }> {
  const res = await fetch(`/api/sync/${code}/pull`)
  if (!res.ok) throw new Error('Pull failed')
  return res.json()
}
