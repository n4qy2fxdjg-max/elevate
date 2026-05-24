import { motion } from 'framer-motion'
import type { Exercise } from '../types'
import { categoryColors } from '../data/exercises'

interface ExerciseCardProps {
  exercise: Exercise
  onAdd?: (exercise: Exercise) => void
  compact?: boolean
  onTap?: (exercise: Exercise) => void
}

export default function ExerciseCard({ exercise, onAdd, compact, onTap }: ExerciseCardProps) {
  const colors = categoryColors[exercise.category]

  if (compact) {
    return (
      <motion.div
        whileTap={{ scale: 0.97 }}
        onClick={() => onTap?.(exercise)}
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(58,46,40,0.06)',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: '"DM Sans"', fontWeight: 500, fontSize: 15, color: '#3A2E28' }}>
            {exercise.name}
          </div>
          <div style={{ fontSize: 12, color: '#7A6458', marginTop: 2 }}>
            {exercise.defaultSets} sets · {exercise.defaultReps} reps
          </div>
        </div>
        <div
          style={{
            background: colors.bg,
            color: colors.text,
            borderRadius: 8,
            padding: '3px 8px',
            fontSize: 11,
            fontWeight: 500,
            textTransform: 'capitalize',
          }}
        >
          {exercise.category}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={() => onTap?.(exercise)}
      style={{
        background: '#fff',
        borderRadius: 20,
        padding: '18px 16px',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(58,46,40,0.06)',
        border: '1px solid rgba(196,168,130,0.15)',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          background: colors.bg,
          color: colors.text,
          borderRadius: 10,
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 500,
          textTransform: 'capitalize',
          marginBottom: 10,
        }}
      >
        {exercise.category}
      </div>
      <div
        style={{
          fontFamily: '"Cormorant Garamond", Georgia, serif',
          fontSize: 20,
          fontWeight: 500,
          color: '#3A2E28',
          lineHeight: 1.2,
          marginBottom: 6,
        }}
      >
        {exercise.name}
      </div>
      <div style={{ fontSize: 13, color: '#7A6458', lineHeight: 1.4, marginBottom: 12 }}>
        {exercise.cue}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: '#C4A882', fontWeight: 500 }}>
          {exercise.defaultSets}×{exercise.defaultReps}
        </span>
        {onAdd && (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={(e) => { e.stopPropagation(); onAdd(exercise) }}
            style={{
              background: '#3A2E28',
              color: '#FAF7F2',
              border: 'none',
              borderRadius: 12,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: '"DM Sans", system-ui, sans-serif',
            }}
          >
            Add
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}
