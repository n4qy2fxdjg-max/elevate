import { motion } from 'framer-motion'
import type { WorkoutPlan } from '../types'
import { exercises as allExercises, categoryColors } from '../data/exercises'

interface WorkoutCardProps {
  plan: WorkoutPlan
  onStart?: (plan: WorkoutPlan) => void
  onDelete?: (id: string) => void
  onTap?: (plan: WorkoutPlan) => void
}

export default function WorkoutCard({ plan, onStart, onDelete, onTap }: WorkoutCardProps) {
  const totalSets = plan.exercises.reduce((s, e) => s + e.sets, 0)
  const estMinutes = totalSets * 2

  // Unique muscle categories in order of appearance
  const categories = [...new Set(
    plan.exercises
      .map((e) => allExercises.find((ex) => ex.id === e.exerciseId)?.category)
      .filter(Boolean)
  )] as string[]

  // Accent strip colour from the first category
  const accentColor = categories.length > 0
    ? categoryColors[categories[0]]?.bg ?? '#F2C4B0'
    : '#F2C4B0'

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => onTap?.(plan)}
      style={{
        background: '#fff',
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(58,46,40,0.08)',
        border: '1px solid rgba(196,168,130,0.2)',
        cursor: onTap ? 'pointer' : 'default',
      }}
    >
      {/* Accent strip */}
      <div style={{ height: 4, background: accentColor }} />

      <div style={{ padding: '18px 20px 16px' }}>
        <div
          style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: 22,
            fontWeight: 500,
            color: '#3A2E28',
            marginBottom: 4,
          }}
        >
          {plan.name}
        </div>
        <div style={{ fontSize: 13, color: '#7A6458', marginBottom: 12 }}>
          {plan.exercises.length} exercises · ~{estMinutes} min
        </div>

        {/* Muscle group chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {categories.map((cat) => (
            <span
              key={cat}
              style={{
                background: categoryColors[cat]?.bg ?? '#F0EAE0',
                color: categoryColors[cat]?.text ?? '#7A6458',
                borderRadius: 8,
                padding: '3px 8px',
                fontSize: 12,
                fontWeight: 500,
                textTransform: 'capitalize',
              }}
            >
              {cat}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {onStart && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={(e) => { e.stopPropagation(); onStart(plan) }}
              style={{
                flex: 1,
                background: '#3A2E28',
                color: '#FAF7F2',
                border: 'none',
                borderRadius: 14,
                padding: '12px',
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: '"DM Sans", system-ui, sans-serif',
              }}
            >
              Start Workout
            </motion.button>
          )}
          {onDelete && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={(e) => { e.stopPropagation(); onDelete(plan.id) }}
              style={{
                background: '#F0EAE0',
                color: '#7A6458',
                border: 'none',
                borderRadius: 14,
                padding: '12px 16px',
                fontSize: 15,
                cursor: 'pointer',
                fontFamily: '"DM Sans", system-ui, sans-serif',
              }}
            >
              ×
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
