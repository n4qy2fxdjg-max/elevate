import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { exercises, categoryColors } from '../data/exercises'
import ExerciseCard from '../components/ExerciseCard'
import type { Exercise, MuscleCategory } from '../types'

const CATEGORIES: Array<MuscleCategory | 'all'> = ['all', 'biceps', 'shoulders', 'triceps', 'back', 'chest', 'core']

export default function Library() {
  const [active, setActive] = useState<MuscleCategory | 'all'>('all')
  const [selected, setSelected] = useState<Exercise | null>(null)

  const filtered = active === 'all' ? exercises : exercises.filter((e) => e.category === active)

  return (
    <>
      <div style={{ padding: '0 20px 24px' }}>
        {/* Header */}
        <h1
          style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: 38,
            fontWeight: 400,
            color: '#3A2E28',
            margin: '0 0 4px',
            lineHeight: 1.1,
          }}
        >
          Exercise
          <br />
          <em>Library</em>
        </h1>
        <p style={{ fontSize: 14, color: '#C4A882', margin: '0 0 20px' }}>
          {exercises.length} ankle-weight moves
        </p>

        {/* Category filter */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 4,
            marginBottom: 20,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          className="scrollbar-hide"
        >
          {CATEGORIES.map((cat) => {
            const isActive = active === cat
            const colors = cat !== 'all' ? categoryColors[cat] : null
            return (
              <motion.button
                key={cat}
                whileTap={{ scale: 0.94 }}
                onClick={() => setActive(cat)}
                style={{
                  flexShrink: 0,
                  background: isActive ? (colors?.bg ?? '#3A2E28') : '#fff',
                  color: isActive ? (colors?.text ?? '#FAF7F2') : '#7A6458',
                  border: '1px solid ' + (isActive ? 'transparent' : 'rgba(196,168,130,0.25)'),
                  borderRadius: 12,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat}
              </motion.button>
            )
          })}
        </div>

        {/* Grid */}
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
        >
          {filtered.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              onTap={setSelected}
            />
          ))}
        </motion.div>
      </div>

      {/* Detail sheet */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(58,46,40,0.4)',
                zIndex: 200,
              }}
            />
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                margin: '0 auto',
                width: '100%',
                maxWidth: 430,
                background: '#FAF7F2',
                borderRadius: '28px 28px 0 0',
                padding: '28px 24px',
                paddingBottom: 'max(32px, calc(env(safe-area-inset-bottom) + 16px))',
                zIndex: 201,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 4,
                  background: '#E8D8C4',
                  borderRadius: 2,
                  margin: '0 auto 24px',
                }}
              />
              <div
                style={{
                  display: 'inline-flex',
                  background: categoryColors[selected.category].bg,
                  color: categoryColors[selected.category].text,
                  borderRadius: 10,
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                  textTransform: 'capitalize',
                  marginBottom: 12,
                }}
              >
                {selected.category}
              </div>
              <h2
                style={{
                  fontFamily: '"Cormorant Garamond", Georgia, serif',
                  fontSize: 32,
                  fontWeight: 500,
                  color: '#3A2E28',
                  margin: '0 0 12px',
                  lineHeight: 1.1,
                }}
              >
                {selected.name}
              </h2>
              <div
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: '16px',
                  marginBottom: 20,
                  border: '1px solid rgba(196,168,130,0.15)',
                }}
              >
                <div style={{ fontSize: 12, color: '#C4A882', fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Form Cue
                </div>
                <p style={{ fontSize: 15, color: '#3A2E28', margin: 0, lineHeight: 1.5 }}>
                  {selected.cue}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                {[
                  { label: 'Sets', value: selected.defaultSets },
                  { label: 'Reps', value: selected.defaultReps },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      flex: 1,
                      background: '#fff',
                      borderRadius: 14,
                      padding: '14px',
                      textAlign: 'center',
                      border: '1px solid rgba(196,168,130,0.15)',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: '"Cormorant Garamond", Georgia, serif',
                        fontSize: 36,
                        fontWeight: 400,
                        color: '#3A2E28',
                        lineHeight: 1,
                      }}
                    >
                      {s.value}
                    </div>
                    <div style={{ fontSize: 12, color: '#C4A882', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setSelected(null)}
                style={{
                  width: '100%',
                  background: '#3A2E28',
                  color: '#FAF7F2',
                  border: 'none',
                  borderRadius: 16,
                  padding: '16px',
                  fontSize: 16,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                }}
              >
                Close
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
