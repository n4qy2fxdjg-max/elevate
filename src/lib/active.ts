// Tombstone filters. The synced arrays carry soft-deleted records (deleted: true)
// so a delete on one device propagates instead of being resurrected on the next
// pull. UI and stats must read through these so tombstones never show up.

import type { WorkoutLog, WorkoutPlan, ActivityLog } from '../types'

export const activeLogs = (logs: WorkoutLog[]): WorkoutLog[] =>
  logs.filter((l) => !l.deleted)

export const activePlans = (plans: WorkoutPlan[]): WorkoutPlan[] =>
  plans.filter((p) => !p.deleted)

export const activeActivities = (a: ActivityLog[]): ActivityLog[] =>
  a.filter((x) => !x.deleted)
