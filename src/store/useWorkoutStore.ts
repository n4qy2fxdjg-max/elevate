import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WorkoutPlan, WorkoutLog, UserPrefs } from '../types'
import { pushSync, pullSync } from '../lib/syncApi'

interface WorkoutStore {
  plans: WorkoutPlan[]
  logs: WorkoutLog[]
  prefs: UserPrefs
  activePlanId: string | null
  addPlan: (plan: WorkoutPlan) => void
  deletePlan: (id: string) => void
  addLog: (log: WorkoutLog) => void
  deleteLog: (id: string) => void
  setPrefs: (prefs: Partial<UserPrefs>) => void
  setActivePlanId: (id: string | null) => void
  syncPull: () => Promise<void>
}

function autoPush(get: () => WorkoutStore) {
  const { prefs, logs, plans } = get()
  if (!prefs.syncCode) return
  pushSync(prefs.syncCode, logs, plans)
    .then((synced) => {
      get().setPrefs({ lastSynced: synced })
    })
    .catch(console.error)
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      plans: [],
      logs: [],
      prefs: { name: 'Zain', weightKg: 0.5 },
      activePlanId: null,

      addPlan: (plan) => {
        set((s) => ({ plans: [...s.plans, plan] }))
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

      setPrefs: (prefs) => set((s) => ({ prefs: { ...s.prefs, ...prefs } })),
      setActivePlanId: (id) => set({ activePlanId: id }),

      syncPull: async () => {
        const { prefs, setPrefs } = get()
        if (!prefs.syncCode) return
        try {
          const { logs, plans } = await pullSync(prefs.syncCode)
          set({ logs, plans })
          setPrefs({ lastSynced: new Date().toISOString() })
        } catch (e) {
          console.error('Sync pull failed', e)
        }
      },
    }),
    {
      name: 'elevate-v1',
      version: 1,
      migrate: (persisted: any, version: number) => {
        if (version < 1 && persisted?.prefs?.name === 'Love') {
          return { ...persisted, prefs: { ...persisted.prefs, name: 'Zain' } }
        }
        return persisted
      },
    }
  )
)
