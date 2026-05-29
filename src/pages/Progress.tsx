import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkoutStore } from '../store/useWorkoutStore'
import type { ActivityLog, WorkoutLog } from '../types'
import { fmtWeight } from '../lib/units'
import { exercises as allExercises } from '../data/exercises'

const ACTIVITY_EMOJI: Record<string, string> = {
  Pilates: '🩰', Squash: '🎾', Yoga: '🧘', Running: '🏃',
  Cycling: '🚴', Swimming: '🏊', Tennis: '🎾', Walking: '🚶',
  Gym: '💪', Dance: '💃', Hiking: '🥾', Other: '✏️',
}

function isoToDate(iso: string) { return new Date(iso) }

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function weekKey(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return `${d.getFullYear()}-${String(Math.ceil((((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7)).padStart(2, '0')}`
}

function getWeekStreak(logs: { date: string }[]): number {
  if (!logs.length) return 0
  const activeWeeks = new Set(logs.map((l) => weekKey(new Date(l.date))))
  let streak = 0
  const check = new Date()
  check.setDate(check.getDate() - ((check.getDay() + 6) % 7))
  if (!activeWeeks.has(weekKey(check))) check.setDate(check.getDate() - 7)
  const cur = new Date(check)
  while (activeWeeks.has(weekKey(cur))) { streak++; cur.setDate(cur.getDate() - 7) }
  return streak
}

export default function Progress() {
  const { logs, activityLogs, prefs, deleteLog, deleteActivityLog } = useWorkoutStore()
  const unit = prefs.unit ?? 'kg'
  const allDates = [...logs.map(l => ({ date: l.date })), ...activityLogs.map(l => ({ date: l.date }))]
  const streak = getWeekStreak(allDates)
  const [detailLog, setDetailLog] = useState<WorkoutLog | null>(null)

  const heatmap = useMemo(() => {
    const weeks = 12
    const days: Array<{ date: Date; count: number }> = []
    const now = new Date()
    const start = new Date(now)
    start.setDate(start.getDate() - (weeks * 7 - 1))

    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      const count = allDates.filter((l) => sameDay(isoToDate(l.date), d)).length
      days.push({ date: d, count })
    }
    return days
  }, [logs, activityLogs])

  const weekRows = useMemo(() => {
    const rows: typeof heatmap[] = []
    for (let i = 0; i < heatmap.length; i += 7) {
      rows.push(heatmap.slice(i, i + 7))
    }
    return rows
  }, [heatmap])

  const thisWeekLogs = allDates.filter((l) => {
    const d = new Date(l.date)
    const now = new Date()
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 6)
    return d >= weekAgo
  })

  const totalMinutes =
    logs.reduce((s, l) => s + Math.round(l.durationSec / 60), 0) +
    activityLogs.reduce((s, l) => s + l.durationMin, 0)

  function getHeatColor(count: number) {
    if (count === 0) return 'rgba(196,168,130,0.12)'
    if (count === 1) return '#F2C4B0'
    if (count === 2) return '#E8A88E'
    return '#D4845E'
  }

  return (
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
        Your
        <br />
        <em>Progress</em>
      </h1>
      <p style={{ fontSize: 14, color: '#C4A882', margin: '0 0 24px' }}>
        {logs.length + activityLogs.length} total sessions
      </p>

      {/* Big stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        {[
          { value: streak, label: 'Week Streak', accent: true },
          { value: thisWeekLogs.length, label: 'This Week' },
          { value: totalMinutes, label: 'Total Minutes' },
          { value: logs.filter((l) => l.completed).length + activityLogs.length, label: 'Completed' },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: s.accent ? 'linear-gradient(135deg, #F2C4B0, #E8A88E)' : '#fff',
              borderRadius: 20,
              padding: '18px 16px',
              border: '1px solid rgba(196,168,130,0.15)',
              boxShadow: '0 2px 8px rgba(58,46,40,0.05)',
            }}
          >
            <div
              style={{
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontSize: 44,
                fontWeight: 300,
                color: s.accent ? '#3A2E28' : '#3A2E28',
                lineHeight: 1,
              }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: s.accent ? '#7A3020' : '#C4A882', marginTop: 4, fontWeight: 500 }}>
              {s.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Heatmap */}
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: '18px 16px',
          marginBottom: 24,
          border: '1px solid rgba(196,168,130,0.15)',
          boxShadow: '0 2px 8px rgba(58,46,40,0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <div
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontSize: 20,
              fontWeight: 500,
              color: '#3A2E28',
            }}
          >
            Activity
          </div>
          <div style={{ fontSize: 11, color: '#C4A882' }}>Last 12 weeks</div>
        </div>

        {/* Day labels */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 4, paddingLeft: 0 }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: '#C4A882' }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 3 }}>
          {weekRows.map((week, wi) => (
            <div key={wi} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {week.map((day, di) => (
                <div
                  key={di}
                  title={`${day.date.toDateString()}: ${day.count} workout(s)`}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 3,
                    background: getHeatColor(day.count),
                    transition: 'background 0.2s',
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 10, color: '#C4A882' }}>Less</span>
          {[0, 1, 2, 3].map((c) => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: 2, background: getHeatColor(c) }} />
          ))}
          <span style={{ fontSize: 10, color: '#C4A882' }}>More</span>
        </div>
      </div>

      {/* History — workouts + activity logs merged */}
      {(logs.length > 0 || activityLogs.length > 0) && (() => {
        type HistoryItem =
          | { kind: 'workout'; id: string; label: string; date: string; sub: string; tag: string; green: boolean; prCount: number }
          | { kind: 'activity'; id: string; label: string; date: string; sub: string; notes?: string }

        const items: HistoryItem[] = [
          ...logs.map(l => ({
            kind: 'workout' as const, id: l.id,
            label: l.planName, date: l.date,
            sub: `${Math.round(l.durationSec / 60)} min`,
            tag: l.completed ? 'Done' : 'Partial',
            green: l.completed,
            prCount: l.prs?.length ?? 0,
          })),
          ...activityLogs.map((l: ActivityLog) => ({
            kind: 'activity' as const, id: l.id,
            label: l.activityType, date: l.date,
            sub: `${l.durationMin} min`,
            notes: l.notes,
          })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20)

        return (
          <div>
            <div style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 22, fontWeight: 500, color: '#3A2E28', margin: '0 0 12px' }}>
              History
            </div>
            <AnimatePresence>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    onClick={() => {
                      if (item.kind === 'workout') {
                        const log = logs.find(l => l.id === item.id)
                        if (log) setDetailLog(log)
                      }
                    }}
                    style={{
                      background: item.kind === 'activity' ? '#FDF5F0' : '#fff',
                      borderRadius: 16,
                      padding: '14px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: '1px solid ' + (item.kind === 'activity' ? 'rgba(242,196,176,0.3)' : 'rgba(196,168,130,0.12)'),
                      cursor: item.kind === 'workout' ? 'pointer' : 'default',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {item.kind === 'activity' && (
                          <span style={{ fontSize: 13 }}>{ACTIVITY_EMOJI[item.label] ?? '🏃'}</span>
                        )}
                        <div style={{ fontSize: 15, fontWeight: 500, color: '#3A2E28' }}>{item.label}</div>
                        {item.kind === 'workout' && item.prCount > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#FFF3CD', borderRadius: 6, padding: '2px 6px' }}>
                            <span style={{ fontSize: 10 }}>⭐</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#8B6914' }}>{item.prCount} PR</span>
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#C4A882', marginTop: 2 }}>
                        {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {item.kind === 'activity' && item.notes && (
                          <span style={{ color: '#B09080' }}> · {item.notes}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, color: '#7A6458' }}>{item.sub}</div>
                        {item.kind === 'workout' && (
                          <div style={{ fontSize: 11, color: item.green ? '#2A6040' : '#C4A882', background: item.green ? '#C8E0C8' : '#F0EAE0', borderRadius: 6, padding: '2px 6px', marginTop: 3 }}>
                            {item.tag}
                          </div>
                        )}
                        {item.kind === 'activity' && (
                          <div style={{ fontSize: 11, color: '#7A4020', background: '#F2C4B0', borderRadius: 6, padding: '2px 6px', marginTop: 3 }}>
                            Activity
                          </div>
                        )}
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={(e) => { e.stopPropagation(); item.kind === 'workout' ? deleteLog(item.id) : deleteActivityLog(item.id) }}
                        style={{ width: 30, height: 30, background: '#F0EAE0', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: '#B09080', flexShrink: 0 }}
                      >
                        ×
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          </div>
        )
      })()}

      {logs.length === 0 && activityLogs.length === 0 && (
        <div
          style={{
            background: '#fff',
            borderRadius: 20,
            padding: '32px 20px',
            textAlign: 'center',
            border: '1px solid rgba(196,168,130,0.15)',
          }}
        >
          <div
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontSize: 20,
              fontStyle: 'italic',
              color: '#C4A882',
              marginBottom: 8,
            }}
          >
            No workouts yet
          </div>
          <p style={{ fontSize: 14, color: '#C4A882', margin: 0 }}>
            Complete your first session and your progress will appear here.
          </p>
        </div>
      )}

      {/* Workout Detail Sheet */}
      {createPortal(
        <AnimatePresence>
          {detailLog && (
            <>
              <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setDetailLog(null)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(58,46,40,0.4)', zIndex: 1000 }} />
              <motion.div key="sh" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                style={{
                  position: 'fixed', bottom: 0, left: 0, right: 0, margin: '0 auto',
                  width: '100%', maxWidth: 430, background: '#FAF7F2',
                  borderRadius: '28px 28px 0 0', padding: '28px 24px',
                  paddingBottom: 'max(32px, calc(env(safe-area-inset-bottom) + 16px))',
                  zIndex: 1001, maxHeight: '88svh', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
                }}
              >
                <div style={{ width: 36, height: 4, background: '#E8D8C4', borderRadius: 2, margin: '0 auto 24px' }} />

                {/* Header */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 26, fontWeight: 500, color: '#3A2E28', margin: 0 }}>
                      {detailLog.planName}
                    </h2>
                    {(detailLog.prs?.length ?? 0) > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#FFF3CD', borderRadius: 8, padding: '4px 8px' }}>
                        <span style={{ fontSize: 12 }}>🏆</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#8B6914' }}>{detailLog.prs!.length} PR</span>
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: '#C4A882', margin: 0 }}>
                    {new Date(detailLog.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    {' · '}{Math.round(detailLog.durationSec / 60)} min
                  </p>
                </div>

                {/* Exercise list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {(detailLog.exercises ?? []).map((perf) => {
                    const ex = allExercises.find((e) => e.id === perf.exerciseId)
                    if (!ex) return null
                    const isPR = detailLog.prs?.includes(perf.exerciseId)
                    return (
                      <div key={perf.exerciseId} style={{
                        background: isPR ? '#FFFBEF' : '#fff',
                        borderRadius: 14, padding: '12px 16px',
                        display: 'flex', alignItems: 'center', gap: 12,
                        border: '1px solid ' + (isPR ? 'rgba(255,215,0,0.3)' : 'rgba(196,168,130,0.12)'),
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 500, color: '#3A2E28' }}>{ex.name}</span>
                            {isPR && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: '#FFF3CD', borderRadius: 5, padding: '1px 5px' }}>
                                <span style={{ fontSize: 9 }}>⭐</span>
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#8B6914' }}>PR</span>
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: '#C4A882', marginTop: 2 }}>
                            {fmtWeight(perf.weightKg, unit)} {unit}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <motion.button whileTap={{ scale: 0.96 }} onClick={() => setDetailLog(null)}
                  style={{ width: '100%', background: '#3A2E28', color: '#FAF7F2', border: 'none', borderRadius: 16, padding: '14px', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  Close
                </motion.button>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
