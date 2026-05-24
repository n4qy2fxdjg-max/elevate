import type { Exercise } from '../types'

export const exercises: Exercise[] = [
  // Biceps
  {
    id: 'b1',
    name: 'Standing Curl',
    category: 'biceps',
    cue: 'Keep elbows pinned to your sides, lift with slow control',
    defaultReps: 15,
    defaultSets: 3,
  },
  {
    id: 'b2',
    name: 'Hammer Curl',
    category: 'biceps',
    cue: 'Thumbs up, wrists neutral throughout the movement',
    defaultReps: 15,
    defaultSets: 3,
  },
  {
    id: 'b3',
    name: 'Concentration Curl',
    category: 'biceps',
    cue: 'Rest elbow on inner thigh, squeeze at the top',
    defaultReps: 12,
    defaultSets: 3,
  },

  // Shoulders
  {
    id: 's1',
    name: 'Lateral Raise',
    category: 'shoulders',
    cue: 'Slight bend in elbows, lead with your pinky finger',
    defaultReps: 20,
    defaultSets: 3,
  },
  {
    id: 's2',
    name: 'Front Raise',
    category: 'shoulders',
    cue: 'Raise to shoulder height only, control the descent',
    defaultReps: 15,
    defaultSets: 3,
  },
  {
    id: 's3',
    name: 'Reverse Fly',
    category: 'shoulders',
    cue: 'Hinge forward 45°, open arms wide like wings',
    defaultReps: 15,
    defaultSets: 3,
  },
  {
    id: 's4',
    name: 'Arnold Press',
    category: 'shoulders',
    cue: 'Rotate palms as you press, open chest at the top',
    defaultReps: 12,
    defaultSets: 3,
  },
  {
    id: 's5',
    name: 'Upright Row',
    category: 'shoulders',
    cue: 'Lead with elbows, keep weights close to your body',
    defaultReps: 15,
    defaultSets: 3,
  },

  // Triceps
  {
    id: 't1',
    name: 'Overhead Extension',
    category: 'triceps',
    cue: 'Keep upper arms still, extend fully overhead',
    defaultReps: 15,
    defaultSets: 3,
  },
  {
    id: 't2',
    name: 'Tricep Kickback',
    category: 'triceps',
    cue: 'Hinge forward, upper arm stays parallel to floor',
    defaultReps: 15,
    defaultSets: 3,
  },
  {
    id: 't3',
    name: 'Floor Skull Crusher',
    category: 'triceps',
    cue: 'Lie down, lower slowly to temples, press straight up',
    defaultReps: 12,
    defaultSets: 3,
  },

  // Back
  {
    id: 'bk1',
    name: 'Bent-Over Row',
    category: 'back',
    cue: 'Hinge at hips, squeeze shoulder blades together',
    defaultReps: 15,
    defaultSets: 3,
  },
  {
    id: 'bk2',
    name: 'Pull-Apart',
    category: 'back',
    cue: 'Arms straight out front, pull apart until fully open',
    defaultReps: 20,
    defaultSets: 3,
  },
  {
    id: 'bk3',
    name: 'Single-Arm Row',
    category: 'back',
    cue: 'Support on knee, drive elbow toward the ceiling',
    defaultReps: 12,
    defaultSets: 3,
  },

  // Chest
  {
    id: 'c1',
    name: 'Standing Chest Fly',
    category: 'chest',
    cue: 'Slight bend in elbows, meet hands in front of chest',
    defaultReps: 15,
    defaultSets: 3,
  },
  {
    id: 'c2',
    name: 'Floor Chest Press',
    category: 'chest',
    cue: 'Lie down, press directly above chest, full lockout',
    defaultReps: 15,
    defaultSets: 3,
  },
  {
    id: 'c3',
    name: 'Floor Chest Fly',
    category: 'chest',
    cue: 'Wide arc to feel the stretch, squeeze at the top',
    defaultReps: 12,
    defaultSets: 3,
  },

  // Core
  {
    id: 'co1',
    name: 'Pilates Swim Arms',
    category: 'core',
    cue: 'Lie prone, lift chest, flutter arms with control',
    defaultReps: 30,
    defaultSets: 3,
  },
  {
    id: 'co2',
    name: 'Bear Crawl Reach',
    category: 'core',
    cue: 'Knees hover 2 inches, extend one arm at a time',
    defaultReps: 10,
    defaultSets: 3,
  },
  {
    id: 'co3',
    name: 'Dead Bug Arms',
    category: 'core',
    cue: 'Press low back to floor, extend arms slowly overhead',
    defaultReps: 10,
    defaultSets: 3,
  },
]

export const categoryColors: Record<string, { bg: string; text: string }> = {
  biceps: { bg: '#F2C4B0', text: '#7A3020' },
  shoulders: { bg: '#B8C4B0', text: '#2A4020' },
  triceps: { bg: '#E8D8C4', text: '#6A4820' },
  back: { bg: '#D8C8E8', text: '#4A2878' },
  chest: { bg: '#F8D8D8', text: '#882030' },
  core: { bg: '#C8E0E8', text: '#1A4860' },
}
