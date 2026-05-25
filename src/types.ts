export type MuscleCategory =
  | 'biceps' | 'triceps' | 'shoulders' | 'back' | 'chest' | 'core'
  | 'glutes' | 'hamstrings' | 'quads' | 'abductors' | 'adductors' | 'calves'

export interface Exercise {
  id: string
  name: string
  category: MuscleCategory
  cue: string
  defaultReps: number
  defaultSets: number
  weightOptional?: boolean
}

export interface WorkoutExercise {
  exerciseId: string
  sets: number
  reps: number
  weightKg?: number
}

export interface ExercisePerformance {
  exerciseId: string
  weightKg: number
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
  exercises?: ExercisePerformance[]
}

export interface UserPrefs {
  name: string
  weightKg: number
}
