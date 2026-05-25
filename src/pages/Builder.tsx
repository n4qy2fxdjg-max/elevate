import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { nanoid } from 'nanoid'
import { exercises as allExercises, categoryColors } from '../data/exercises'
import { useWorkoutStore } from '../store/useWorkoutStore'
import type { MuscleCategory } from '../types'

interface BuilderItem {
  uid: string
  exerciseId: string
  sets: number
  reps: number
  weightKg: number
}

const CATS: Array<MuscleCategory | 'all'> = [
  'all',
  'biceps', 'shoulders', 'triceps', 'back', 'chest', 'core',
  'glutes', 'hamstrings', 'quads', 'abductors', 'adductors', 'calves',
]

export default function Builder() {
  const navigate = useNavigate()
  const { plans, addPlan, prefs } = useWorkoutStore()
  const [name, setName] = useState('')
  const [items, setItems] = useState<BuilderItem[]>([])
  const [filter, setFilter] = useState<MuscleCategory | 'all'>('all')
  const [showPicker, setShowPicker] = useState(false)
  const [saved, setSaved] = useState(false)

  const filtered = filter === 'all' ? allExercises : allExercises.filter((e) => e.category === filter)

  function addExercise(exId: string) {
    const ex = allExercises.find((e) => e.id === exId)
    if (!ex) return
    setItems((prev) => [
      ...prev,
      { uid: nanoid(), exerciseId: exId, sets: ex.defaultSets, reps: ex.defaultReps, weightKg: prefs.weightKg },
    ])
    setShowPicker(false)
  }

  function removeItem(uid: string) {
    setItems((prev) => prev.filter((i) => i.uid !== uid))
  }

  function adjust(uid: string, field: 'sets' | 'reps', delta: number) {
    setItems((prev) =>
      prev.map((i) =>
        i.uid === uid ? { ...i, [field]: Math.max(1, i[field] + delta) } : i
      )
    )
  }

  function adjustWeight(uid: string, delta: number) {
    setItems((prev) =>
      prev.map((i) =>
        i.uid === uid ? { ...i, weightKg: Math.max(0, parseFloat((i.weightKg + delta).toFixed(2))) } : i
      )
    )
  }

  function fmtKg(kg: number) {
    return parseFloat(kg.toFixed(2)).toString()
  }

  function save() {
    if (!name.trim() || !items.length) return
    addPlan({
      id: nanoid(),
      name: name.trim(),
      exercises: items.map(({ exerciseId, sets, reps, weightKg }) => ({ exerciseId, sets, reps, weightKg })),
      createdAt: new Date().toISOString(),
    })
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      setName('')
      setItems([])
      navigate('/')
    }, 800)
  }

  return (
    <>
      <div style={{ padding: '0 20px 24px' }}>
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
          Build Your
          <br />
          <em>Routine</em>
        </h1>
        <p style={{ fontSize: 14, color: '#C4A882', margin: '0 0 24px' }}>
          {plans.length} saved {plans.length === 1 ? 'routine' : 'routines'}
        </p>

        {/* Name input */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: '#C4A882', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 8 }}>
            Routine Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Morning Sculpt"
            style={{
              width: '100%',
              background: '#fff',
              border: '1px solid rgba(196,168,130,0.3)',
              borderRadius: 14,
              padding: '14px 16px',
              fontSize: 16,
              color: '#3A2E28',
              fontFamily: '"DM Sans", system-ui, sans-serif',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Exercise list */}
        {items.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: '#C4A882', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 10 }}>
              Exercises · drag to reorder
            </label>
            <Reorder.Group
              axis="y"
              values={items}
              onReorder={setItems}
              style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              {items.map((item) => {
                const ex = allExercises.find((e) => e.id === item.exerciseId)
                if (!ex) return null
                return (
                  <Reorder.Item
                    key={item.uid}
                    value={item}
                    style={{
                      background: '#fff',
                      borderRadius: 16,
                      padding: '14px 14px',
                      listStyle: 'none',
                      boxShadow: '0 2px 8px rgba(58,46,40,0.06)',
                      cursor: 'grab',
                      border: '1px solid rgba(196,168,130,0.15)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: '#3A2E28' }}>{ex.name}</div>
                        <div
                          style={{
                            display: 'inline-flex',
                            background: categoryColors[ex.category].bg,
                            color: categoryColors[ex.category].text,
                            borderRadius: 6,
                            padding: '2px 7px',
                            fontSize: 11,
                            fontWeight: 500,
                            textTransform: 'capitalize',
                            marginTop: 3,
                          }}
                        >
                          {ex.category}
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.uid)}
                        style={{
                          background: '#F0EAE0',
                          border: 'none',
                          borderRadius: 8,
                          width: 28,
                          height: 28,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontSize: 16,
                          color: '#7A6458',
                          flexShrink: 0,
                        }}
                      >
                        ×
                      </button>
                    </div>

                    {/* Steppers */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                      {(['sets', 'reps'] as const).map((field) => (
                        <div key={field} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0, background: '#FAF7F2', borderRadius: 10, overflow: 'hidden' }}>
                          <button
                            onClick={() => adjust(item.uid, field, -1)}
                            style={{ padding: '8px 12px', background: 'none', border: 'none', fontSize: 18, color: '#7A6458', cursor: 'pointer', lineHeight: 1 }}
                          >
                            −
                          </button>
                          <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#3A2E28' }}>
                            {item[field]}
                            <span style={{ fontSize: 10, fontWeight: 400, color: '#C4A882', marginLeft: 3 }}>{field}</span>
                          </div>
                          <button
                            onClick={() => adjust(item.uid, field, 1)}
                            style={{ padding: '8px 12px', background: 'none', border: 'none', fontSize: 18, color: '#7A6458', cursor: 'pointer', lineHeight: 1 }}
                          >
                            +
                          </button>
                        </div>
                      ))}
                    </div>
                    {/* Weight */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: '#FAF7F2', borderRadius: 10, overflow: 'hidden', marginTop: 8 }}>
                      <button
                        onClick={() => adjustWeight(item.uid, -0.25)}
                        style={{ padding: '8px 12px', background: 'none', border: 'none', fontSize: 18, color: '#7A6458', cursor: 'pointer', lineHeight: 1 }}
                      >
                        −
                      </button>
                      <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#3A2E28' }}>
                        {fmtKg(item.weightKg)}
                        <span style={{ fontSize: 10, fontWeight: 400, color: '#C4A882', marginLeft: 3 }}>kg</span>
                      </div>
                      <button
                        onClick={() => adjustWeight(item.uid, 0.25)}
                        style={{ padding: '8px 12px', background: 'none', border: 'none', fontSize: 18, color: '#7A6458', cursor: 'pointer', lineHeight: 1 }}
                      >
                        +
                      </button>
                    </div>
                  </Reorder.Item>
                )
              })}
            </Reorder.Group>
          </div>
        )}

        {/* Add exercise button */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowPicker(true)}
          style={{
            width: '100%',
            background: '#fff',
            color: '#7A6458',
            border: '1.5px dashed rgba(196,168,130,0.5)',
            borderRadius: 16,
            padding: '14px',
            fontSize: 15,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: '"DM Sans", system-ui, sans-serif',
            marginBottom: 20,
          }}
        >
          + Add Exercise
        </motion.button>

        {/* Save button */}
        <AnimatePresence mode="wait">
          {saved ? (
            <motion.div
              key="saved"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{
                width: '100%',
                background: '#B8C4B0',
                borderRadius: 16,
                padding: '16px',
                textAlign: 'center',
                fontSize: 16,
                fontWeight: 500,
                color: '#2A4020',
              }}
            >
              Saved!
            </motion.div>
          ) : (
            <motion.button
              key="save"
              whileTap={{ scale: 0.96 }}
              onClick={save}
              disabled={!name.trim() || !items.length}
              style={{
                width: '100%',
                background: name.trim() && items.length ? '#3A2E28' : '#E8D8C4',
                color: name.trim() && items.length ? '#FAF7F2' : '#C4A882',
                border: 'none',
                borderRadius: 16,
                padding: '16px',
                fontSize: 16,
                fontWeight: 500,
                cursor: name.trim() && items.length ? 'pointer' : 'not-allowed',
                fontFamily: '"DM Sans", system-ui, sans-serif',
                transition: 'background 0.2s',
              }}
            >
              Save Routine
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Exercise picker sheet */}
      <AnimatePresence>
        {showPicker && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPicker(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(58,46,40,0.4)', zIndex: 1000 }}
            />
            <motion.div
              key="picker"
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
                padding: '20px 20px 0',
                paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
                zIndex: 1001,
                maxHeight: '80svh',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ width: 36, height: 4, background: '#E8D8C4', borderRadius: 2, margin: '0 auto 16px' }} />
              <h3 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 24, fontWeight: 500, color: '#3A2E28', margin: '0 0 14px' }}>
                Add Exercise
              </h3>

              {/* Filter tabs */}
              <div
                style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, marginBottom: 4, scrollbarWidth: 'none' }}
                className="scrollbar-hide"
              >
                {CATS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilter(cat)}
                    style={{
                      flexShrink: 0,
                      background: filter === cat ? '#3A2E28' : '#fff',
                      color: filter === cat ? '#FAF7F2' : '#7A6458',
                      border: '1px solid rgba(196,168,130,0.2)',
                      borderRadius: 10,
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      fontFamily: '"DM Sans", system-ui, sans-serif',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* List */}
              <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 16 }}>
                {filtered.map((ex) => {
                  const already = items.some((i) => i.exerciseId === ex.id)
                  return (
                    <motion.div
                      key={ex.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => !already && addExercise(ex.id)}
                      style={{
                        background: already ? '#F0EAE0' : '#fff',
                        borderRadius: 14,
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: already ? 'default' : 'pointer',
                        opacity: already ? 0.6 : 1,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: '#3A2E28' }}>{ex.name}</div>
                        <div style={{ fontSize: 12, color: '#7A6458', marginTop: 1 }}>
                          {ex.defaultSets} sets · {ex.defaultReps} reps
                        </div>
                      </div>
                      <div
                        style={{
                          background: already ? '#E8D8C4' : categoryColors[ex.category].bg,
                          color: already ? '#C4A882' : categoryColors[ex.category].text,
                          borderRadius: 8,
                          padding: '3px 8px',
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                      >
                        {already ? 'Added' : ex.category}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
