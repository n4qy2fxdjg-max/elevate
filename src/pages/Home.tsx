import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkoutStore } from '../store/useWorkoutStore'
import WorkoutCard from '../components/WorkoutCard'
import { exercises as allExercises, categoryColors } from '../data/exercises'
import type { WorkoutPlan, ActivityLog } from '../types'
import { fmtWeight, fmtVolume } from '../lib/units'

const ACTIVITY_TYPES = [
  { label: 'Pilates', emoji: '🩰' },
  { label: 'Squash', emoji: '🎾' },
  { label: 'Yoga', emoji: '🧘' },
  { label: 'Running', emoji: '🏃' },
  { label: 'Cycling', emoji: '🚴' },
  { label: 'Swimming', emoji: '🏊' },
  { label: 'Tennis', emoji: '🎾' },
  { label: 'Walking', emoji: '🚶' },
  { label: 'Gym', emoji: '💪' },
  { label: 'Dance', emoji: '💃' },
  { label: 'Hiking', emoji: '🥾' },
  { label: 'Other', emoji: '✏️' },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/** Week number (ISO-style Mon-Sun) as "YYYY-WW" */
function weekKey(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // Monday of this week
  return `${d.getFullYear()}-${String(Math.ceil((((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7)).padStart(2, '0')}`
}

function getWeekStreak(logs: { date: string }[]): number {
  if (!logs.length) return 0
  const activeWeeks = new Set(logs.map((l) => weekKey(new Date(l.date))))
  let streak = 0
  const now = new Date()
  let check = new Date(now)
  check.setDate(check.getDate() - ((check.getDay() + 6) % 7)) // this Monday
  // If current week has activity, start counting from here; else try last week
  if (!activeWeeks.has(weekKey(check))) {
    check.setDate(check.getDate() - 7)
  }
  while (activeWeeks.has(weekKey(check))) {
    streak++
    check.setDate(check.getDate() - 7)
  }
  return streak
}

export default function Home() {
  const navigate = useNavigate()
  const { plans, logs, activityLogs, prefs, setActivePlanId, setPrefs, deletePlan, addActivityLog } = useWorkoutStore()
  const unit = prefs.unit ?? 'kg'
  const allLogs = [...logs.map(l => ({ date: l.date })), ...activityLogs.map(l => ({ date: l.date }))]
  const streak = getWeekStreak(allLogs)

  // Plan detail sheet
  const [viewingPlan, setViewingPlan] = useState<WorkoutPlan | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(prefs.name)

  // Activity log sheet
  const [logOpen, setLogOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null)
  const [customActivity, setCustomActivity] = useState('')
  const [durationMin, setDurationMin] = useState(45)
  const [notes, setNotes] = useState('')

  function resetLogSheet() {
    setSelectedActivity(null)
    setCustomActivity('')
    setDurationMin(45)
    setNotes('')
  }

  function handleLogSession() {
    const actType = selectedActivity === 'Other' ? (customActivity.trim() || 'Other') : selectedActivity
    if (!actType) return
    const log: ActivityLog = {
      id: `act-${Date.now()}`,
      activityType: actType,
      durationMin,
      date: new Date().toISOString(),
      notes: notes.trim() || undefined,
    }
    addActivityLog(log)
    setLogOpen(false)
    resetLogSheet()
  }

  const suggestedPlan = plans[0] ?? null

  function handleStart(plan: WorkoutPlan) {
    setActivePlanId(plan.id)
    navigate('/active')
  }

  const now = new Date()
  const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
  const thisWeek = allLogs.filter((l) => new Date(l.date) >= weekAgo).length

  // Weekly volume: sum of (sets × reps × weightKg) for all workout logs this week
  const weeklyVolumeKg = logs
    .filter((l) => new Date(l.date) >= weekAgo)
    .reduce((total, l) => {
      const plan = plans.find((p) => p.id === l.planId)
      if (!plan) return total
      return total + plan.exercises.reduce((s, e) => {
        const w = l.exercises?.find((ex) => ex.exerciseId === e.exerciseId)?.weightKg ?? 0
        return s + e.sets * e.reps * w
      }, 0)
    }, 0)

  return (
    <div style={{ padding: '0 20px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 14, color: '#C4A882', margin: 0, fontWeight: 400 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1
              style={{
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontSize: 38,
                fontWeight: 400,
                color: '#3A2E28',
                margin: '4px 0 0',
                lineHeight: 1.1,
              }}
            >
              {getGreeting()},
              <br />
              {editingName ? (
                <>
                  <span style={{ color: '#C4A882', fontStyle: 'italic', fontSize: 32 }}>My love, </span>
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onBlur={() => { setPrefs({ name: nameInput || 'Zain' }); setEditingName(false) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { setPrefs({ name: nameInput || 'Zain' }); setEditingName(false) } }}
                    style={{
                      fontFamily: '"Cormorant Garamond", Georgia, serif',
                      fontSize: 38,
                      fontWeight: 400,
                      color: '#3A2E28',
                      background: 'none',
                      border: 'none',
                      borderBottom: '2px solid #F2C4B0',
                      outline: 'none',
                      width: '50%',
                      padding: 0,
                      lineHeight: 1.1,
                    }}
                  />
                </>
              ) : (
                <span
                  onClick={() => { setEditingName(true); setNameInput(prefs.name) }}
                  style={{ cursor: 'text', borderBottom: '2px solid #F2C4B0', paddingBottom: 1 }}
                >
                  <em style={{ color: '#C4A882', fontWeight: 300 }}>My love, </em>
                  {prefs.name}
                </span>
              )}
            </h1>
          </div>

          {/* Streak badge */}
          {streak > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                background: 'linear-gradient(135deg, #F2C4B0, #E8A88E)',
                borderRadius: 16,
                padding: '10px 14px',
                textAlign: 'center',
                flexShrink: 0,
                marginTop: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <svg width="14" height="16" viewBox="0 0 14 18" fill="none">
                  <path d="M7 0C7 0 4 4 4 7C4 7 2.5 5.5 3 3C1 5 0 7.5 0 10C0 14.4183 3.13401 18 7 18C10.866 18 14 14.4183 14 10C14 6 11 3 9.5 4.5C10 2.5 7 0 7 0Z" fill="#C8860A"/>
                  <path d="M7 7C7 7 5.5 9 5.5 11C5.5 11 4.5 10 4.8 8.5C3.8 9.5 3.5 10.5 3.5 11.5C3.5 13.4330 5.067 15 7 15C8.933 15 10.5 13.4330 10.5 11.5C10.5 9.5 8.5 7.5 8 8.5C8.5 7 7 7 7 7Z" fill="#F5C518"/>
                </svg>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#3A2E28', lineHeight: 1 }}>{streak}</span>
              </div>
              <div style={{ fontSize: 10, color: '#7A3020', fontWeight: 500, marginTop: 2 }}>week streak</div>
            </motion.div>
          )}
        </div>
      </div>

      {/* This week stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'This week', value: thisWeek, unit: 'workouts' },
          { label: 'Volume', value: fmtVolume(weeklyVolumeKg, unit), unit: unit },
          { label: 'Total', value: allLogs.length, unit: 'sessions' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              flex: 1,
              background: '#fff',
              borderRadius: 16,
              padding: '14px 12px',
              textAlign: 'center',
              boxShadow: '0 1px 4px rgba(58,46,40,0.05)',
              border: '1px solid rgba(196,168,130,0.15)',
            }}
          >
            <div
              style={{
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontSize: 28,
                fontWeight: 500,
                color: '#3A2E28',
                lineHeight: 1,
              }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: 11, color: '#C4A882', marginTop: 4 }}>{stat.unit}</div>
            <div style={{ fontSize: 10, color: '#C4A882', marginTop: 1 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Log Session button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => { resetLogSheet(); setLogOpen(true) }}
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, #F2C4B0 0%, #E8D8C4 100%)',
          border: 'none',
          borderRadius: 20,
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          marginBottom: 28,
          boxShadow: '0 2px 10px rgba(242,196,176,0.3)',
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 20, fontWeight: 500, color: '#3A2E28', lineHeight: 1.2 }}>
            Log a session
          </div>
          <div style={{ fontSize: 13, color: '#7A6458', marginTop: 3 }}>
            Pilates, squash, yoga & more
          </div>
        </div>
        <div style={{ width: 40, height: 40, background: '#3A2E28', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="#FAF7F2" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>
      </motion.button>

      {/* Suggested workout */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <h2
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontSize: 22,
              fontWeight: 500,
              color: '#3A2E28',
              margin: 0,
            }}
          >
            {suggestedPlan ? 'Your Workout' : 'Get Started'}
          </h2>
        </div>

        <AnimatePresence mode="wait">
          {suggestedPlan ? (
            <motion.div key={suggestedPlan.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <WorkoutCard plan={suggestedPlan} onStart={handleStart} onTap={setViewingPlan} />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                background: 'linear-gradient(135deg, #F2C4B0 0%, #E8D8C4 100%)',
                borderRadius: 24,
                padding: '24px 20px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: '"Cormorant Garamond", Georgia, serif',
                  fontSize: 20,
                  fontWeight: 400,
                  color: '#3A2E28',
                  marginBottom: 8,
                  fontStyle: 'italic',
                }}
              >
                Build your first workout
              </div>
              <p style={{ fontSize: 14, color: '#7A6458', margin: '0 0 16px' }}>
                Head to the Build tab to create a routine with your ankle weights.
              </p>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => navigate('/builder')}
                style={{
                  background: '#3A2E28',
                  color: '#FAF7F2',
                  border: 'none',
                  borderRadius: 14,
                  padding: '12px 24px',
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                }}
              >
                Create Workout
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* All plans */}
      {plans.length > 1 && (
        <div style={{ marginBottom: 24 }}>
          <h2
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontSize: 22,
              fontWeight: 500,
              color: '#3A2E28',
              margin: '0 0 12px',
            }}
          >
            All Routines
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {plans.slice(1).map((plan) => (
              <WorkoutCard key={plan.id} plan={plan} onStart={handleStart} onTap={setViewingPlan} />
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {allLogs.length > 0 && (
        <div>
          <h2
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontSize: 22,
              fontWeight: 500,
              color: '#3A2E28',
              margin: '0 0 12px',
            }}
          >
            Recent Activity
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ...logs.map(l => ({ date: l.date, label: l.planName, sub: `${Math.round(l.durationSec / 60)} min`, tag: l.completed ? 'Done' : 'Partial', tagGreen: l.completed })),
              ...activityLogs.map(l => ({ date: l.date, label: l.activityType, sub: `${l.durationMin} min`, tag: 'Logged', tagGreen: true })),
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map((item, i) => (
              <div
                key={i}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: '14px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 1px 3px rgba(58,46,40,0.04)',
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#3A2E28' }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: '#C4A882', marginTop: 2 }}>
                    {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, color: '#7A6458' }}>{item.sub}</div>
                  <div style={{ fontSize: 11, color: item.tagGreen ? '#2A6040' : '#C4A882', background: item.tagGreen ? '#C8E0C8' : '#F0EAE0', borderRadius: 6, padding: '2px 6px', marginTop: 3 }}>
                    {item.tag}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan Detail sheet */}
      {createPortal(
        <AnimatePresence>
          {viewingPlan && (
            <>
              <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setViewingPlan(null)}
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
                <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 28, fontWeight: 500, color: '#3A2E28', margin: '0 0 4px' }}>
                  {viewingPlan.name}
                </h2>
                <p style={{ fontSize: 13, color: '#C4A882', margin: '0 0 20px' }}>
                  {viewingPlan.exercises.length} exercises · ~{Math.round(viewingPlan.exercises.reduce((s, e) => s + e.sets, 0) * 0.8)} min
                </p>

                {/* Exercise list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {viewingPlan.exercises.map((we, i) => {
                    const ex = allExercises.find((e) => e.id === we.exerciseId)
                    if (!ex) return null
                    return (
                      <div key={we.exerciseId} style={{ background: '#fff', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid rgba(196,168,130,0.12)' }}>
                        <div style={{ width: 28, height: 28, background: '#F0EAE0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#C4A882', flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#3A2E28' }}>{ex.name}</div>
                          <div style={{ fontSize: 12, color: '#C4A882', marginTop: 2 }}>
                            {we.sets} sets · {we.reps} reps
                            {we.weightKg ? ` · ${fmtWeight(we.weightKg, unit)} ${unit}` : ''}
                          </div>
                        </div>
                        <div style={{ fontSize: 11, background: categoryColors[ex.category]?.bg, color: categoryColors[ex.category]?.text, borderRadius: 7, padding: '3px 8px', textTransform: 'capitalize', flexShrink: 0 }}>
                          {ex.category}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <motion.button whileTap={{ scale: 0.96 }}
                    onClick={() => { setViewingPlan(null); handleStart(viewingPlan) }}
                    style={{ flex: 2, background: '#3A2E28', color: '#FAF7F2', border: 'none', borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                    Start Workout
                  </motion.button>
                  {plans.some(p => p.id === viewingPlan.id) && (
                    <motion.button whileTap={{ scale: 0.96 }}
                      onClick={() => { setViewingPlan(null); navigate(`/builder?edit=${viewingPlan.id}`) }}
                      style={{ flex: 1, background: '#F0EAE0', color: '#7A6458', border: 'none', borderRadius: 14, padding: '14px', fontSize: 15, cursor: 'pointer', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                      Edit
                    </motion.button>
                  )}
                </div>
                {plans.some(p => p.id === viewingPlan.id) && (
                  <motion.button whileTap={{ scale: 0.96 }}
                    onClick={() => { deletePlan(viewingPlan.id); setViewingPlan(null) }}
                    style={{ width: '100%', background: 'transparent', color: '#C0504D', border: '1px solid rgba(192,80,77,0.3)', borderRadius: 14, padding: '12px', fontSize: 14, cursor: 'pointer', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                    Delete Plan
                  </motion.button>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Log Session sheet */}
      {createPortal(
        <AnimatePresence>
          {logOpen && (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setLogOpen(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(58,46,40,0.4)', zIndex: 1000 }}
              />
              <motion.div
                key="sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                style={{
                  position: 'fixed', bottom: 0, left: 0, right: 0,
                  margin: '0 auto', width: '100%', maxWidth: 430,
                  background: '#FAF7F2', borderRadius: '28px 28px 0 0',
                  padding: '28px 24px',
                  paddingBottom: 'max(32px, calc(env(safe-area-inset-bottom) + 16px))',
                  zIndex: 1001, maxHeight: '90svh', overflowY: 'auto',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                <div style={{ width: 36, height: 4, background: '#E8D8C4', borderRadius: 2, margin: '0 auto 24px' }} />
                <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 28, fontWeight: 500, color: '#3A2E28', margin: '0 0 20px', lineHeight: 1.1 }}>
                  Log a session
                </h2>

                {/* Activity grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
                  {ACTIVITY_TYPES.map((a) => (
                    <motion.button
                      key={a.label}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => setSelectedActivity(a.label)}
                      style={{
                        background: selectedActivity === a.label ? '#3A2E28' : '#fff',
                        color: selectedActivity === a.label ? '#FAF7F2' : '#3A2E28',
                        border: '1px solid ' + (selectedActivity === a.label ? 'transparent' : 'rgba(196,168,130,0.25)'),
                        borderRadius: 14,
                        padding: '12px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        fontFamily: '"DM Sans", system-ui, sans-serif',
                      }}
                    >
                      <span style={{ fontSize: 20 }}>{a.emoji}</span>
                      <span style={{ fontSize: 11, fontWeight: 500 }}>{a.label}</span>
                    </motion.button>
                  ))}
                </div>

                {/* Custom activity input */}
                {selectedActivity === 'Other' && (
                  <input
                    value={customActivity}
                    onChange={(e) => setCustomActivity(e.target.value)}
                    placeholder="Activity name…"
                    style={{
                      width: '100%', background: '#fff', border: '1px solid rgba(196,168,130,0.3)',
                      borderRadius: 12, padding: '12px 14px', fontSize: 15, color: '#3A2E28',
                      fontFamily: '"DM Sans", system-ui, sans-serif', boxSizing: 'border-box',
                      outline: 'none', marginBottom: 16,
                    }}
                  />
                )}

                {/* Duration */}
                <div style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 14, border: '1px solid rgba(196,168,130,0.15)' }}>
                  <div style={{ fontSize: 11, color: '#C4A882', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Duration</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setDurationMin(Math.max(15, durationMin - 15))}
                      style={{ width: 40, height: 40, background: '#FAF7F2', border: '1px solid rgba(196,168,130,0.3)', borderRadius: 12, fontSize: 20, color: '#3A2E28', cursor: 'pointer' }}>
                      −
                    </motion.button>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <span style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 36, fontWeight: 400, color: '#3A2E28' }}>{durationMin}</span>
                      <span style={{ fontSize: 14, color: '#C4A882', marginLeft: 4 }}>min</span>
                    </div>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setDurationMin(durationMin + 15)}
                      style={{ width: 40, height: 40, background: '#FAF7F2', border: '1px solid rgba(196,168,130,0.3)', borderRadius: 12, fontSize: 20, color: '#3A2E28', cursor: 'pointer' }}>
                      +
                    </motion.button>
                  </div>
                </div>

                {/* Notes */}
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a note… (optional)"
                  style={{
                    width: '100%', background: '#fff', border: '1px solid rgba(196,168,130,0.2)',
                    borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#3A2E28',
                    fontFamily: '"DM Sans", system-ui, sans-serif', boxSizing: 'border-box',
                    outline: 'none', marginBottom: 16,
                  }}
                />

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleLogSession}
                  disabled={!selectedActivity}
                  style={{
                    width: '100%', background: selectedActivity ? '#3A2E28' : '#C4A882',
                    color: '#FAF7F2', border: 'none', borderRadius: 16, padding: '16px',
                    fontSize: 16, fontWeight: 500, cursor: selectedActivity ? 'pointer' : 'default',
                    fontFamily: '"DM Sans", system-ui, sans-serif', transition: 'background 0.15s',
                  }}
                >
                  Log Session
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
