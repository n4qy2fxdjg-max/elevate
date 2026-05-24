export type MuscleCategory = 'biceps' | 'triceps' | 'shoulders' | 'back' | 'chest' | 'core'

export interface Exercise {
  id: string
  name: string
  category: MuscleCategory
  cue: string
  defaultReps: number
  defaultSets: number
}

export interface WorkoutExercise {
  exerciseId: string
  sets: number
  reps: number
}

export interface WorkoutPlan {
  id: string
  name: string
  exercises: WorkoutExercise[]
  createdAt: string
}

export interface WorkoutLog {
  id: string
  planId: string
  planName: string
  date: string
  durationSec: number
  completed: boolean
}

export interface UserPrefs {
  name: string
  weightKg: number
}
