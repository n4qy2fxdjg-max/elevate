import { motion } from 'framer-motion'
import type { WorkoutPlan } from '../types'
import { exercises as allExercises } from '../data/exercises'

interface WorkoutCardProps {
  plan: WorkoutPlan
  onStart?: (plan: WorkoutPlan) => void
  onDelete?: (id: string) => void
  onTap?: (plan: WorkoutPlan) => void
}

export default function WorkoutCard({ plan, onStart, onDelete, onTap }: WorkoutCardProps) {
  const totalSets = plan.exercises.reduce((s, e) => s + e.sets, 0)
  const estMinutes = Math.round(totalSets * 0.8)

  const names = plan.exercises
    .slice(0, 3)
    .map((e) => allExercises.find((ex) => ex.id === e.exerciseId)?.name ?? '')
    .filter(Boolean)

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => onTap?.(plan)}
      style={{
        background: 'linear-gradient(135deg, #fff 0%, #FAF7F2 100%)',
        borderRadius: 24,
        padding: '20px 20px 16px',
        boxShadow: '0 2px 12px rgba(58,46,40,0.08)',
        border: '1px solid rgba(196,168,130,0.2)',
        cursor: onTap ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {names.map((name) => (
              <span
                key={name}
                style={{
                  background: '#F0EAE0',
                  color: '#7A6458',
                  borderRadius: 8,
                  padding: '3px 8px',
                  fontSize: 12,
                }}
              >
                {name}
              </span>
            ))}
            {plan.exercises.length > 3 && (
              <span
                style={{
                  background: '#F0EAE0',
                  color: '#7A6458',
                  borderRadius: 8,
                  padding: '3px 8px',
                  fontSize: 12,
                }}
              >
                +{plan.exercises.length - 3} more
              </span>
            )}
          </div>
        </div>
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
    </motion.div>
  )
}
