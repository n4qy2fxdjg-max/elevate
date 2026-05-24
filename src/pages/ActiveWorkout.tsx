import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { nanoid } from 'nanoid'
import { exercises as allExercises } from '../data/exercises'
import { useWorkoutStore } from '../store/useWorkoutStore'
import ProgressRing from '../components/ProgressRing'

const REST_SECONDS = 30

type Phase = 'exercise' | 'rest' | 'done'

export default function ActiveWorkout() {
  const navigate = useNavigate()
  const { plans, activePlanId, addLog, setActivePlanId } = useWorkoutStore()
  const plan = plans.find((p) => p.id === activePlanId)

  const startTime = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [exIdx, setExIdx] = useState(0)
  const [setIdx, setSetIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('exercise')
  const [restRemaining, setRestRemaining] = useState(REST_SECONDS)

  const currentItem = plan?.exercises[exIdx]
  const currentEx = currentItem ? allExercises.find((e) => e.id === currentItem.exerciseId) : null
  const nextItem = plan?.exercises[exIdx + 1]
  const nextEx = nextItem ? allExercises.find((e) => e.id === nextItem.exerciseId) : null

  const totalSets = plan?.exercises.reduce((s, e) => s + e.sets, 0) ?? 0
  const completedSets = plan?.exercises
    .slice(0, exIdx)
    .reduce((s, e) => s + e.sets, 0) ?? 0
  const overallProgress = completedSets + setIdx

  const finishWorkout = useCallback(
    (completed: boolean) => {
      if (timerRef.current) clearInterval(timerRef.current)
      addLog({
        id: nanoid(),
        planId: activePlanId ?? '',
        planName: plan?.name ?? 'Workout',
        date: new Date().toISOString(),
        durationSec: Math.round((Date.now() - startTime.current) / 1000),
        completed,
      })
      setActivePlanId(null)
      navigate('/')
    },
    [activePlanId, addLog, navigate, plan, setActivePlanId]
  )

  useEffect(() => {
    if (!plan) { navigate('/'); return }
  }, [plan, navigate])

  useEffect(() => {
    if (phase !== 'rest') return
    setRestRemaining(REST_SECONDS)
    timerRef.current = setInterval(() => {
      setRestRemaining((r) => {
        if (r <= 1) {
          clearInterval(timerRef.current!)
          setPhase('exercise')
          return REST_SECONDS
        }
        return r - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  function completeSet() {
    if (!plan || !currentItem) return
    const isLastSet = setIdx + 1 >= currentItem.sets
    const isLastEx = exIdx + 1 >= plan.exercises.length

    if (isLastSet && isLastEx) {
      setPhase('done')
    } else if (isLastSet) {
      setPhase('rest')
      setExIdx((i) => i + 1)
      setSetIdx(0)
    } else {
      setPhase('rest')
      setSetIdx((i) => i + 1)
    }
  }

  function skipRest() {
    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('exercise')
    setRestRemaining(REST_SECONDS)
  }

  if (!plan || !currentEx) return null

  if (phase === 'done') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          minHeight: '100svh',
          background: 'linear-gradient(160deg, #3A2E28 0%, #5A4438 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 32px',
          paddingTop: 'max(80px, env(safe-area-inset-top))',
          paddingBottom: 'max(48px, env(safe-area-inset-bottom))',
        }}
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          style={{
            width: 80,
            height: 80,
            background: '#F2C4B0',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 28,
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L19 7" stroke="#3A2E28" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
        <h1
          style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: 44,
            fontWeight: 400,
            color: '#FAF7F2',
            margin: '0 0 8px',
            textAlign: 'center',
          }}
        >
          Beautiful work.
        </h1>
        <p style={{ fontSize: 15, color: '#C4A882', margin: '0 0 12px', textAlign: 'center' }}>
          {plan.name} complete
        </p>
        <p style={{ fontSize: 14, color: '#E8D8C4', margin: '0 0 48px', textAlign: 'center' }}>
          {Math.round((Date.now() - startTime.current) / 60000)} minutes · {totalSets} sets
        </p>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => finishWorkout(true)}
          style={{
            background: '#F2C4B0',
            color: '#3A2E28',
            border: 'none',
            borderRadius: 18,
            padding: '18px 48px',
            fontSize: 17,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: '"DM Sans", system-ui, sans-serif',
          }}
        >
          Save & Finish
        </motion.button>
      </motion.div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100svh',
        background: 'linear-gradient(160deg, #3A2E28 0%, #5A4438 60%, #7A5A48 100%)',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 'max(54px, env(safe-area-inset-top))',
        paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
        overflow: 'hidden',
      }}
    >
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px 20px' }}>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => finishWorkout(false)}
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: 'none',
            borderRadius: 12,
            padding: '10px 16px',
            color: '#E8D8C4',
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: '"DM Sans", system-ui, sans-serif',
          }}
        >
          End
        </motion.button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#C4A882', fontWeight: 400 }}>{plan.name}</div>
          <div style={{ fontSize: 12, color: '#7A6458' }}>
            {overallProgress}/{totalSets} sets
          </div>
        </div>
        <div style={{ width: 60 }} />
      </div>

      {/* Progress bar */}
      <div style={{ padding: '0 20px 32px' }}>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.12)', borderRadius: 2, overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${totalSets > 0 ? (overallProgress / totalSets) * 100 : 0}%` }}
            transition={{ duration: 0.4 }}
            style={{ height: '100%', background: '#F2C4B0', borderRadius: 2 }}
          />
        </div>
      </div>

      {/* Exercise phase */}
      <AnimatePresence mode="wait">
        {phase === 'exercise' && (
          <motion.div
            key={`ex-${exIdx}-${setIdx}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 28px' }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: '#C4A882', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Exercise {exIdx + 1} of {plan.exercises.length}
              </div>
              <h1
                style={{
                  fontFamily: '"Cormorant Garamond", Georgia, serif',
                  fontSize: 52,
                  fontWeight: 300,
                  color: '#FAF7F2',
                  margin: '0 0 12px',
                  lineHeight: 1.05,
                }}
              >
                {currentEx.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontFamily: '"Cormorant Garamond", Georgia, serif',
                      fontSize: 40,
                      fontWeight: 300,
                      color: '#F2C4B0',
                      lineHeight: 1,
                    }}
                  >
                    {currentItem?.reps}
                  </div>
                  <div style={{ fontSize: 11, color: '#C4A882', marginTop: 2 }}>reps</div>
                </div>
                <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.15)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontFamily: '"Cormorant Garamond", Georgia, serif',
                      fontSize: 40,
                      fontWeight: 300,
                      color: '#F2C4B0',
                      lineHeight: 1,
                    }}
                  >
                    {setIdx + 1}/{currentItem?.sets}
                  </div>
                  <div style={{ fontSize: 11, color: '#C4A882', marginTop: 2 }}>set</div>
                </div>
              </div>
              <div
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: 14,
                  padding: '14px 16px',
                  marginBottom: 32,
                }}
              >
                <div style={{ fontSize: 11, color: '#C4A882', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6 }}>Form</div>
                <p style={{ fontSize: 15, color: '#E8D8C4', margin: 0, lineHeight: 1.5 }}>{currentEx.cue}</p>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={completeSet}
              style={{
                width: '100%',
                background: '#F2C4B0',
                color: '#3A2E28',
                border: 'none',
                borderRadius: 18,
                padding: '20px',
                fontSize: 18,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: '"DM Sans", system-ui, sans-serif',
                marginBottom: nextEx ? 14 : 0,
              }}
            >
              Complete Set
            </motion.button>

            {nextEx && (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <span style={{ fontSize: 13, color: '#7A6458' }}>Next: </span>
                <span style={{ fontSize: 13, color: '#C4A882' }}>{nextEx.name}</span>
              </div>
            )}
          </motion.div>
        )}

        {phase === 'rest' && (
          <motion.div
            key="rest"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 28px',
              gap: 28,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#C4A882', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Rest</div>
              <h2
                style={{
                  fontFamily: '"Cormorant Garamond", Georgia, serif',
                  fontSize: 32,
                  fontWeight: 300,
                  color: '#FAF7F2',
                  margin: 0,
                }}
              >
                Take a breath
              </h2>
            </div>

            <ProgressRing
              size={180}
              strokeWidth={8}
              progress={REST_SECONDS - restRemaining}
              total={REST_SECONDS}
              color="#F2C4B0"
              trackColor="rgba(255,255,255,0.1)"
            >
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontFamily: '"Cormorant Garamond", Georgia, serif',
                    fontSize: 52,
                    fontWeight: 300,
                    color: '#FAF7F2',
                    lineHeight: 1,
                  }}
                >
                  {restRemaining}
                </div>
                <div style={{ fontSize: 12, color: '#C4A882', marginTop: 4 }}>seconds</div>
              </div>
            </ProgressRing>

            {currentEx && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#7A6458', marginBottom: 4 }}>Up next</div>
                <div style={{ fontSize: 18, color: '#E8D8C4', fontFamily: '"Cormorant Garamond", Georgia, serif' }}>
                  {currentEx.name}
                </div>
                <div style={{ fontSize: 13, color: '#C4A882', marginTop: 2 }}>
                  Set {setIdx + 1} of {currentItem?.sets}
                </div>
              </div>
            )}

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={skipRest}
              style={{
                background: 'rgba(255,255,255,0.12)',
                color: '#E8D8C4',
                border: 'none',
                borderRadius: 14,
                padding: '14px 32px',
                fontSize: 15,
                cursor: 'pointer',
                fontFamily: '"DM Sans", system-ui, sans-serif',
              }}
            >
              Skip Rest
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
