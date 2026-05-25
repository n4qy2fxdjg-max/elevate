import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WorkoutPlan, WorkoutLog, UserPrefs } from '../types'

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
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set) => ({
      plans: [],
      logs: [],
      prefs: { name: 'Love', weightKg: 0.5 },
      activePlanId: null,
      addPlan: (plan) => set((s) => ({ plans: [...s.plans, plan] })),
      deletePlan: (id) =>
        set((s) => ({ plans: s.plans.filter((p) => p.id !== id) })),
      addLog: (log) => set((s) => ({ logs: [log, ...s.logs] })),
      deleteLog: (id) => set((s) => ({ logs: s.logs.filter((l) => l.id !== id) })),
      setPrefs: (prefs) => set((s) => ({ prefs: { ...s.prefs, ...prefs } })),
      setActivePlanId: (id) => set({ activePlanId: id }),
    }),
    { name: 'elevate-v1' }
  )
)
