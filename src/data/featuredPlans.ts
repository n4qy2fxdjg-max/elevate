import type { WorkoutPlan } from '../types'

export const featuredPlans: WorkoutPlan[] = [
  {
    id: 'featured-sculpted-arms',
    name: 'Sculpted Arms',
    exercises: [
      { exerciseId: 's1', sets: 3, reps: 20 }, // Lateral Raise
      { exerciseId: 's2', sets: 3, reps: 15 }, // Front Raise
      { exerciseId: 'b1', sets: 3, reps: 15 }, // Standing Curl
      { exerciseId: 'b2', sets: 3, reps: 15 }, // Hammer Curl
      { exerciseId: 't1', sets: 3, reps: 15 }, // Overhead Extension
      { exerciseId: 't2', sets: 3, reps: 15 }, // Tricep Kickback
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'featured-tone-and-lengthen',
    name: 'Tone & Lengthen',
    exercises: [
      { exerciseId: 's3', sets: 3, reps: 15 }, // Reverse Fly
      { exerciseId: 's4', sets: 3, reps: 12 }, // Arnold Press
      { exerciseId: 'bk1', sets: 3, reps: 15 }, // Bent-Over Row
      { exerciseId: 'gl1', sets: 3, reps: 15 }, // Donkey Kick
      { exerciseId: 'gl2', sets: 3, reps: 15 }, // Fire Hydrant
      { exerciseId: 'ad1', sets: 3, reps: 20 }, // Inner Thigh Lift
      { exerciseId: 'co3', sets: 3, reps: 10 }, // Dead Bug Arms
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
]

export const featuredMeta: Record<string, { subtitle: string; accentBg: string; accentText: string }> = {
  'featured-sculpted-arms': {
    subtitle: 'Shoulders, biceps & triceps for that long, lean look.',
    accentBg: '#F2C4B0',
    accentText: '#7A3020',
  },
  'featured-tone-and-lengthen': {
    subtitle: 'Full-body flow to tone, lengthen and feel your best.',
    accentBg: '#B8C4B0',
    accentText: '#2A4020',
  },
}
