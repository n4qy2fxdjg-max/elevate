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

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      plans: [],
      logs: [],
      activityLogs: [],
      prefs: { name: 'Zain', weightKg: 0.5 },
      activePlanId: null,

      addPlan: (plan) => {
        set((s) => ({ plans: [...s.plans, plan] }))
        autoPush(get)
      },
      updatePlan: (plan) => {
        set((s) => ({ plans: s.plans.map((p) => (p.id === plan.id ? plan : p)) }))
        autoPush(get)
      },
      deletePlan: (id) => {
        set((s) => ({ plans: s.plans.filter((p) => p.id !== id) }))
        autoPush(get)
      },
      addLog: (log) => {
        set((s) => ({ logs: [log, ...s.logs] }))
        autoPush(get)
      },
      deleteLog: (id) => {
        set((s) => ({ logs: s.logs.filter((l) => l.id !== id) }))
        autoPush(get)
      },
      addActivityLog: (log) => {
        set((s) => ({ activityLogs: [log, ...s.activityLogs] }))
        autoPush(get)
      },
      deleteActivityLog: (id) => {
        set((s) => ({ activityLogs: s.activityLogs.filter((l) => l.id !== id) }))
        autoPush(get)
      },

      setPrefs: (prefs) => set((s) => ({ prefs: { ...s.prefs, ...prefs } })),
      setActivePlanId: (id) => set({ activePlanId: id }),

      syncPull: async () => {
        const { prefs, setPrefs } = get()
        if (!prefs.syncCode) return
        try {
          const { logs, plans, activityLogs } = await pullSync(prefs.syncCode)
          set({ logs, plans, activityLogs: activityLogs ?? [] })
          setPrefs({ lastSynced: new Date().toISOString() })
        } catch (e) {
          console.error('Sync pull failed', e)
        }
      },
    }),
    {
      name: 'elevate-v1',
      version: 2,
      migrate: (persisted: any, version: number) => {
        let data = persisted
        if (version < 1 && data?.prefs?.name === 'Love') {
          data = { ...data, prefs: { ...data.prefs, name: 'Zain' } }
        }
        if (version < 2) {
          data = { ...data, activityLogs: data.activityLogs ?? [] }
        }
        return data
      },
    }
  )
)
