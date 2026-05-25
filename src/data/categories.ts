import type { MuscleCategory } from '../types'

export type BodyGroup = 'all' | 'upper' | 'lower' | 'core'

export const BODY_GROUPS: BodyGroup[] = ['all', 'upper', 'lower', 'core']

export const GROUP_CATS: Record<BodyGroup, MuscleCategory[]> = {
  all:   ['biceps', 'shoulders', 'triceps', 'back', 'chest', 'core', 'glutes', 'hamstrings', 'quads', 'abductors', 'adductors', 'calves'],
  upper: ['biceps', 'shoulders', 'triceps', 'back', 'chest'],
  lower: ['glutes', 'hamstrings', 'quads', 'abductors', 'adductors', 'calves'],
  core:  ['core'],
}
