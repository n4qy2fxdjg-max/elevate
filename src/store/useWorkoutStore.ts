import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WorkoutPlan, WorkoutLog, UserPrefs, ActivityLog } from '../types'
import { pushSync, pullSync } from '../lib/syncApi'

interface WorkoutStore {
  plans: WorkoutPlan[]
  logs: WorkoutLog[]
  activityLogs: ActivityLog[]
  prefs: UserPrefs
  activePlanId: string | null
  addPlan: (plan: WorkoutPlan) => void
  updatePlan: (plan: WorkoutPlan) => void
  deletePlan: (id: string) => void
  addLog: (log: WorkoutLog) => void
  deleteLog: (id: string) => void
  addActivityLog: (log: ActivityLog) => void
  deleteActivityLog: (id: string) => void
  setPrefs: (prefs: Partial<UserPrefs>) => void
  setActivePlanId: (id: string | null) => void
  syncPull: () => Promise<void>
}

function autoPush(get: () => WorkoutStore) {
  const { prefs, logs, plans, activityLogs } = get()
  if (!prefs.syncCode) return
  pushSync(prefs.syncCode, logs, plans, activityLogs)
    .then((synced) => get().setPrefs({ lastSynced: synced }))
    .catch(console.error)
}

// ── Record-level last-write-wins merge ────────────────────────────────
// Keep the record with the higher updatedAt; tombstones (deleted) are carried
// through so a delete wins over a stale copy instead of being resurrected.
function mergeById<T extends { id: string; updatedAt?: number }>(a: T[], b: T[]): T[] {
  const map = new Map(a.map((x) => [x.id, x]))
  for (const x of b) {
    const cur = map.get(x.id)
    if (!cur || (x.updatedAt ?? 0) > (cur.updatedAt ?? 0)) map.set(x.id, x)
  }
  return Array.from(map.values())
}

function mergeLogs(a: WorkoutLog[], b: WorkoutLog[]): WorkoutLog[] {
  return mergeById(a, b).sort((x, y) => y.date.localeCompare(x.date))
}
function mergeActivities(a: ActivityLog[], b: ActivityLog[]): ActivityLog[] {
  return mergeById(a, b).sort((x, y) => y.date.localeCompare(x.date))
}
function mergePlans(a: WorkoutPlan[], b: WorkoutPlan[]): WorkoutPlan[] {
  return mergeById(a, b).sort((x, y) => y.createdAt.localeCompare(x.createdAt))
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      plans: [],
      logs: [],
      activityLogs: [],
      prefs: { name: 'Zain', weightKg: 0.5 },
      activePlanId: null,

      addPlan: (plan) => {
        set((s) => ({ plans: [...s.plans, { ...plan, updatedAt: Date.now() }] }))
        autoPush(get)
      },
      updatePlan: (plan) => {
        set((s) => ({
          plans: s.plans.map((p) => (p.id === plan.id ? { ...plan, updatedAt: Date.now() } : p)),
        }))
        autoPush(get)
      },
      deletePlan: (id) => {
        set((s) => ({
          plans: s.plans.map((p) =>
            p.id === id ? { ...p, deleted: true, updatedAt: Date.now() } : p
          ),
        }))
        autoPush(get)
      },
      addLog: (log) => {
        set((s) => ({ logs: [{ ...log, updatedAt: Date.now() }, ...s.logs] }))
        autoPush(get)
      },
      deleteLog: (id) => {
        set((s) => ({
          logs: s.logs.map((l) =>
            l.id === id ? { ...l, deleted: true, updatedAt: Date.now() } : l
          ),
        }))
        autoPush(get)
      },
      addActivityLog: (log) => {
        set((s) => ({ activityLogs: [{ ...log, updatedAt: Date.now() }, ...s.activityLogs] }))
        autoPush(get)
      },
      deleteActivityLog: (id) => {
        set((s) => ({
          activityLogs: s.activityLogs.map((l) =>
            l.id === id ? { ...l, deleted: true, updatedAt: Date.now() } : l
          ),
        }))
        autoPush(get)
      },

      setPrefs: (prefs) => set((s) => ({ prefs: { ...s.prefs, ...prefs } })),
      setActivePlanId: (id) => set({ activePlanId: id }),

      syncPull: async () => {
        const { prefs, setPrefs } = get()
        if (!prefs.syncCode) return
        try {
          const remote = await pullSync(prefs.syncCode)
          set((s) => ({
            logs: mergeLogs(s.logs, remote.logs ?? []),
            plans: mergePlans(s.plans, remote.plans ?? []),
            activityLogs: mergeActivities(s.activityLogs, remote.activityLogs ?? []),
          }))
          setPrefs({ lastSynced: new Date().toISOString() })
        } catch (e) {
          console.error('Sync pull failed', e)
        }
      },
    }),
    {
      name: 'elevate-v1',
      version: 3,
      migrate: (persisted: any, version: number) => {
        let data = persisted
        if (version < 1 && data?.prefs?.name === 'Love') {
          data = { ...data, prefs: { ...data.prefs, name: 'Zain' } }
        }
        if (version < 2) {
          data = { ...data, activityLogs: data.activityLogs ?? [] }
        }
        if (version < 3) {
          // Backfill updatedAt so pre-LWW records have a sane ordering / merge weight.
          const ts = (s?: string) => {
            const n = s ? Date.parse(s) : NaN
            return Number.isNaN(n) ? 0 : n
          }
          data = {
            ...data,
            logs: (data.logs ?? []).map((l: WorkoutLog) => ({ ...l, updatedAt: l.updatedAt ?? ts(l.date) })),
            plans: (data.plans ?? []).map((p: WorkoutPlan) => ({ ...p, updatedAt: p.updatedAt ?? ts(p.createdAt) })),
            activityLogs: (data.activityLogs ?? []).map((a: ActivityLog) => ({ ...a, updatedAt: a.updatedAt ?? ts(a.date) })),
          }
        }
        return data
      },
    }
  )
)
