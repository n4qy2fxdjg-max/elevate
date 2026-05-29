import type { WorkoutPlan } from '../types'

/** Estimated workout duration — a flat 2 minutes per set (work + rest). */
export function estimateMinutes(plan: WorkoutPlan): number {
  const totalSets = plan.exercises.reduce((s, e) => s + e.sets, 0)
  return totalSets * 2
}
