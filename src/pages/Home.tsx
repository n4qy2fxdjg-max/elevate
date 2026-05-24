import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkoutStore } from '../store/useWorkoutStore'
import WorkoutCard from '../components/WorkoutCard'
import type { WorkoutPlan } from '../types'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getStreak(logs: { date: string }[]) {
  if (!logs.length) return 0
  const today = new Date().toDateString()
  const dates = [...new Set(logs.map((l) => new Date(l.date).toDateString()))]
  let streak = 0
  let check = new Date()
  if (!dates.includes(today)) check.setDate(check.getDate() - 1)
  while (true) {
    if (dates.includes(check.toDateString())) {
      streak++
      check.setDate(check.getDate() - 1)
    } else break
  }
  return streak
}

export default function Home() {
  const navigate = useNavigate()
  const { plans, logs, prefs, setActivePlanId, setPrefs } = useWorkoutStore()
  const streak = getStreak(logs)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(prefs.name)

  const suggestedPlan = plans[0] ?? null

  function handleStart(plan: WorkoutPlan) {
    setActivePlanId(plan.id)
    navigate('/active')
  }

  const thisWeek = logs.filter((l) => {
    const d = new Date(l.date)
    const now = new Date()
    const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
    return d >= weekAgo
  }).length

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
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={() => { setPrefs({ name: nameInput || 'Love' }); setEditingName(false) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setPrefs({ name: nameInput || 'Love' }); setEditingName(false) } }}
                  style={{
                    fontFamily: '"Cormorant Garamond", Georgia, serif',
                    fontSize: 38,
                    fontWeight: 400,
                    color: '#3A2E28',
                    background: 'none',
                    border: 'none',
                    borderBottom: '2px solid #F2C4B0',
                    outline: 'none',
                    width: '100%',
                    padding: 0,
                    lineHeight: 1.1,
                  }}
                />
              ) : (
                <span
                  onClick={() => { setEditingName(true); setNameInput(prefs.name) }}
                  style={{ borderBottom: '2px dotted #F2C4B0', cursor: 'text', paddingBottom: 1 }}
                >
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
              <div style={{ fontSize: 22, fontWeight: 700, color: '#3A2E28', lineHeight: 1 }}>{streak}</div>
              <div style={{ fontSize: 10, color: '#7A3020', fontWeight: 500, marginTop: 2 }}>day streak</div>
            </motion.div>
          )}
        </div>
      </div>

      {/* This week stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'This week', value: thisWeek, unit: 'workouts' },
          { label: 'Weight', value: prefs.weightKg, unit: 'kg' },
          { label: 'Total', value: logs.length, unit: 'sessions' },
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
              <WorkoutCard plan={suggestedPlan} onStart={handleStart} />
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
              <WorkoutCard key={plan.id} plan={plan} onStart={handleStart} />
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {logs.length > 0 && (
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
            {logs.slice(0, 5).map((log) => (
              <div
                key={log.id}
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
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#3A2E28' }}>{log.planName}</div>
                  <div style={{ fontSize: 12, color: '#C4A882', marginTop: 2 }}>
                    {new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, color: '#7A6458' }}>
                    {Math.round(log.durationSec / 60)} min
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: log.completed ? '#2A6040' : '#C4A882',
                      background: log.completed ? '#C8E0C8' : '#F0EAE0',
                      borderRadius: 6,
                      padding: '2px 6px',
                      marginTop: 3,
                    }}
                  >
                    {log.completed ? 'Done' : 'Partial'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
