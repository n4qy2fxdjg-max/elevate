import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { exercises, categoryColors } from '../data/exercises'
import { BODY_GROUPS, GROUP_CATS, type BodyGroup } from '../data/categories'
import ExerciseCard from '../components/ExerciseCard'
import { useWorkoutStore } from '../store/useWorkoutStore'
import { activeLogs } from '../lib/active'
import type { Exercise, MuscleCategory } from '../types'
import { fmtWeight } from '../lib/units'

interface ChartPoint { date: string; weightKg: number }

function OverloadChart({ data, unit }: { data: ChartPoint[]; unit: 'kg' | 'lb' }) {
  if (data.length === 0) return null

  const W = 300, H = 90
  const padL = 36, padR = 8, padT = 8, padB = 24

  const xs = data.map((d) => new Date(d.date).getTime())
  const ys = data.map((d) => d.weightKg)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.max(0, Math.min(...ys) - 0.25)
  const maxY = Math.max(...ys) + 0.25

  const sx = (x: number) =>
    xs.length === 1 ? padL + (W - padL - padR) / 2 : padL + ((x - minX) / (maxX - minX)) * (W - padL - padR)
  const sy = (y: number) =>
    padT + (1 - (y - minY) / (maxY - minY)) * (H - padT - padB)

  const pts = data.map((d) => ({ x: sx(new Date(d.date).getTime()), y: sy(d.weightKg), w: d.weightKg, date: d.date }))
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  // y-axis ticks
  const ticks = [...new Set([minY + 0.25, (minY + maxY) / 2, maxY - 0.25].map((v) => parseFloat(v.toFixed(2))))]

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      {/* grid lines */}
      {ticks.map((t) => (
        <line key={t} x1={padL} x2={W - padR} y1={sy(t)} y2={sy(t)} stroke="rgba(196,168,130,0.15)" strokeWidth={1} />
      ))}
      {/* y labels */}
      {ticks.map((t) => (
        <text key={t} x={padL - 4} y={sy(t) + 3.5} fontSize={8} fill="#C4A882" textAnchor="end">
          {fmtWeight(t, unit)}
        </text>
      ))}
      {/* line */}
      {pts.length > 1 && (
        <path d={path} fill="none" stroke="#F2C4B0" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {/* dots + weight labels */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3.5} fill="#F2C4B0" />
          {(i === pts.length - 1 || pts.length <= 4) && (
            <text x={p.x} y={p.y - 7} fontSize={8} fill="#C4A882" textAnchor="middle">
              {fmtWeight(p.w, unit)}{unit}
            </text>
          )}
        </g>
      ))}
      {/* x date labels — first and last */}
      {pts.length > 1 && (
        <>
          <text x={pts[0].x} y={H - 4} fontSize={7.5} fill="#C4A882" textAnchor="start">
            {new Date(pts[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </text>
          <text x={pts[pts.length - 1].x} y={H - 4} fontSize={7.5} fill="#C4A882" textAnchor="end">
            {new Date(pts[pts.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </text>
        </>
      )}
    </svg>
  )
}

export default function Library() {
  const { logs: rawLogs, prefs } = useWorkoutStore()
  const logs = activeLogs(rawLogs)
  const unit = prefs.unit ?? 'kg'
  const [bodyGroup, setBodyGroup] = useState<BodyGroup>('all')
  const [active, setActive] = useState<MuscleCategory | 'all'>('all')
  const [selected, setSelected] = useState<Exercise | null>(null)

  function selectGroup(g: BodyGroup) {
    setBodyGroup(g)
    setActive('all')
  }

  const groupCats = GROUP_CATS[bodyGroup]

  function getOverloadData(exerciseId: string): ChartPoint[] {
    return logs
      .filter((l) => l.exercises?.some((e) => e.exerciseId === exerciseId))
      .map((l) => ({
        date: l.date,
        weightKg: l.exercises!.find((e) => e.exerciseId === exerciseId)!.weightKg,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const filtered = exercises.filter((e) => {
    if (!groupCats.includes(e.category)) return false
    if (active !== 'all' && e.category !== active) return false
    return true
  })

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

        {/* Row 1 — body group */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {BODY_GROUPS.map((g) => (
            <motion.button
              key={g}
              whileTap={{ scale: 0.94 }}
              onClick={() => selectGroup(g)}
              style={{
                flex: 1,
                background: bodyGroup === g ? '#3A2E28' : '#fff',
                color: bodyGroup === g ? '#FAF7F2' : '#7A6458',
                border: '1px solid ' + (bodyGroup === g ? 'transparent' : 'rgba(196,168,130,0.25)'),
                borderRadius: 12,
                padding: '9px 0',
                fontSize: 13,
                fontWeight: bodyGroup === g ? 600 : 400,
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontFamily: '"DM Sans", system-ui, sans-serif',
              }}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </motion.button>
          ))}
        </div>

        {/* Row 2 — muscle chips */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            flexShrink: 0,
            paddingTop: 2,
            paddingBottom: 4,
            marginBottom: 20,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          className="scrollbar-hide"
        >
          {groupCats.map((cat) => {
            const isActive = active === cat
            const colors = categoryColors[cat]
            return (
              <motion.button
                key={cat}
                whileTap={{ scale: 0.94 }}
                onClick={() => setActive(isActive ? 'all' : cat)}
                style={{
                  flexShrink: 0,
                  background: isActive ? colors.bg : '#fff',
                  color: isActive ? colors.text : '#7A6458',
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

      {/* Detail sheet — rendered into document.body via portal */}
      {createPortal(<AnimatePresence>
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
                zIndex: 1000,
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
                zIndex: 1001,
                maxHeight: '88svh',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
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
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
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

              {/* Progressive overload chart */}
              {(() => {
                const chartData = getOverloadData(selected.id)
                if (chartData.length === 0) return null
                return (
                  <div
                    style={{
                      background: '#fff',
                      borderRadius: 16,
                      padding: '14px 16px 10px',
                      marginBottom: 20,
                      border: '1px solid rgba(196,168,130,0.15)',
                    }}
                  >
                    <div style={{ fontSize: 11, color: '#C4A882', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                      Weight Progress
                    </div>
                    <OverloadChart data={chartData} unit={unit} />
                    {chartData.length === 1 && (
                      <p style={{ fontSize: 11, color: '#C4A882', margin: '8px 0 0', textAlign: 'center', fontStyle: 'italic' }}>
                        Complete more sessions to see your progression.
                      </p>
                    )}
                  </div>
                )
              })()}

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
      </AnimatePresence>, document.body)}
    </>
  )
}
