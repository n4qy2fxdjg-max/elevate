import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkoutStore } from '../store/useWorkoutStore'
import type { ActivityLog } from '../types'
import { fmtWeight, weightStep } from '../lib/units'

const ACTIVITY_EMOJI: Record<string, string> = {
  Pilates: '🩰', Squash: '🎾', Yoga: '🧘', Running: '🏃',
  Cycling: '🚴', Swimming: '🏊', Tennis: '🎾', Walking: '🚶',
  Gym: '💪', Dance: '💃', Hiking: '🥾', Other: '✏️',
}

function isoToDate(iso: string) {
  return new Date(iso)
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getStreak(logs: { date: string }[]) {
  if (!logs.length) return 0
  const today = new Date()
  const dates = [...new Set(logs.map((l) => new Date(l.date).toDateString()))]
  let streak = 0
  let check = new Date()
  if (!dates.includes(today.toDateString())) check.setDate(check.getDate() - 1)
  while (true) {
    if (dates.includes(check.toDateString())) {
      streak++
      check.setDate(check.getDate() - 1)
    } else break
  }
  return streak
}

export default function Progress() {
  const { logs, activityLogs, prefs, setPrefs, deleteLog, deleteActivityLog } = useWorkoutStore()
  const unit = prefs.unit ?? 'kg'
  const allDates = [...logs.map(l => ({ date: l.date })), ...activityLogs.map(l => ({ date: l.date }))]
  const streak = getStreak(allDates)

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
          { value: streak, label: 'Day Streak', accent: true },
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

      {/* Weight setting */}
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
        <div
          style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: 20,
            fontWeight: 500,
            color: '#3A2E28',
            marginBottom: 12,
          }}
        >
          Ankle Weight
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { const s = weightStep(unit); setPrefs({ weightKg: Math.max(s, parseFloat((prefs.weightKg - s).toFixed(4))) }) }}
            style={{
              width: 40,
              height: 40,
              background: '#F0EAE0',
              border: 'none',
              borderRadius: 12,
              fontSize: 20,
              color: '#7A6458',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            −
          </motion.button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div
              style={{
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontSize: 36,
                fontWeight: 300,
                color: '#3A2E28',
                lineHeight: 1,
              }}
            >
              {fmtWeight(prefs.weightKg, unit)}
            </div>
            <div style={{ fontSize: 12, color: '#C4A882', marginTop: 2 }}>{unit} per wrist</div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { const s = weightStep(unit); setPrefs({ weightKg: parseFloat((prefs.weightKg + s).toFixed(4)) }) }}
            style={{
              width: 40,
              height: 40,
              background: '#F0EAE0',
              border: 'none',
              borderRadius: 12,
              fontSize: 20,
              color: '#7A6458',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            +
          </motion.button>
        </div>
      </div>

      {/* History — workouts + activity logs merged */}
      {(logs.length > 0 || activityLogs.length > 0) && (() => {
        type HistoryItem =
          | { kind: 'workout'; id: string; label: string; date: string; sub: string; tag: string; green: boolean }
          | { kind: 'activity'; id: string; label: string; date: string; sub: string; notes?: string }

        const items: HistoryItem[] = [
          ...logs.map(l => ({
            kind: 'workout' as const, id: l.id,
            label: l.planName, date: l.date,
            sub: `${Math.round(l.durationSec / 60)} min`,
            tag: l.completed ? 'Done' : 'Partial',
            green: l.completed,
          })),
          ...activityLogs.map((l: ActivityLog) => ({
            kind: 'activity' as const, id: l.id,
            label: l.activityType, date: l.date,
            sub: `${l.durationMin} min`,
            notes: l.notes,
          })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15)

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
                    style={{
                      background: item.kind === 'activity' ? '#FDF5F0' : '#fff',
                      borderRadius: 16,
                      padding: '14px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: '1px solid ' + (item.kind === 'activity' ? 'rgba(242,196,176,0.3)' : 'rgba(196,168,130,0.12)'),
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {item.kind === 'activity' && (
                          <span style={{ fontSize: 13 }}>
                            {ACTIVITY_EMOJI[item.label] ?? '🏃'}
                          </span>
                        )}
                        <div style={{ fontSize: 15, fontWeight: 500, color: '#3A2E28' }}>{item.label}</div>
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
                        onClick={() => item.kind === 'workout' ? deleteLog(item.id) : deleteActivityLog(item.id)}
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
    </div>
  )
}
