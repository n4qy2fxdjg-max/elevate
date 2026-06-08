import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { nanoid } from 'nanoid'
import { exercises as allExercises } from '../data/exercises'
import { useWorkoutStore } from '../store/useWorkoutStore'
import { activeLogs, activePlans } from '../lib/active'
import ProgressRing from '../components/ProgressRing'
import Sheet from '../components/Sheet'
import { fmtWeight, weightStep, KG_TO_LB } from '../lib/units'
import {
  primeAudioContext,
  triggerHaptic,
  requestNotificationPermission,
  showNotification,
} from '../lib/haptics'
import { ensureSubscription, scheduleReminder, cancelReminder } from '../lib/push'

const REST_SECONDS = 90
const SESSION_KEY = 'elevate-active-session'

const HAB_IDX_KEY = 'elevate-hab-idx'

const HAB_MESSAGES = [
  "Watching you show up every day is my favourite thing in the world. I love you so much.",
  "You just made me the proudest man alive. That's my girl.",
  "I know how hard that was, and you did it anyway. That's exactly who you are.",
  "Every bit of strength you build, you already had it in you. I just get to watch it come out.",
  "You are genuinely the most impressive person I know. I mean that.",
  "I'm going to be bragging about you forever, you know that right?",
  "That looked incredible from where I'm standing. Never stop.",
  "My love, you are unstoppable. I hope you know it as clearly as I do.",
  "I fell in love with you for a thousand reasons, and this is one of them.",
  "Every time I think I couldn't love you more, you go and do something like this.",
  "You're building something beautiful, inside and out. I'm so lucky to be yours.",
  "Rest, eat something, and let me tell you how amazing you are when you get home.",
  "You showed up, you pushed through, and you finished. That's who you are, my love.",
  "The way you commit to yourself quietly, without needing anyone to notice — I notice. Always.",
  "I just want you to know that I notice every single session. It matters. You matter.",
  "Whatever you're working towards, you're closer today than yesterday. Keep going, my love.",
  "No one puts in the work quietly like you do. I see you, always.",
]

type Phase = 'exercise' | 'rest' | 'done'

// Read saved session once at module level so useState initialisers can use it
function readSavedSession() {
  try {
    const s = localStorage.getItem(SESSION_KEY)
    return s ? JSON.parse(s) : null
  } catch { return null }
}

export default function ActiveWorkout() {
  const navigate = useNavigate()
  const { plans: rawPlans, logs: rawLogs, activePlanId, addLog, setActivePlanId, prefs } = useWorkoutStore()
  const plans = activePlans(rawPlans)
  const logs = activeLogs(rawLogs)
  const unit = prefs.unit ?? 'kg'
  const plan = plans.find((p) => p.id === activePlanId)

  const startTime = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevPhaseRef = useRef<Phase | null>(null)
  const setReminderRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Restore progress if the page was reloaded / frozen mid-workout ──
  const saved = useRef(readSavedSession())

  const [exIdx, setExIdx] = useState<number>(() => saved.current?.exIdx ?? 0)
  const [setIdx, setSetIdx] = useState<number>(() => saved.current?.setIdx ?? 0)
  const [phase, setPhase] = useState<Phase>('exercise')
  const [habMessage] = useState(() => {
    const idx = parseInt(localStorage.getItem(HAB_IDX_KEY) ?? '0', 10) % HAB_MESSAGES.length
    return HAB_MESSAGES[idx]
  })
  const [editingWeight, setEditingWeight] = useState(false)
  const [editingWeightVal, setEditingWeightVal] = useState('')
  const [restRemaining, setRestRemaining] = useState(REST_SECONDS)
  const [restTotal, setRestTotal] = useState(REST_SECONDS)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [exWeights, setExWeights] = useState<Record<string, number>>(() => {
    const base = Object.fromEntries(
      (plan?.exercises ?? []).map((e) => [e.exerciseId, e.weightKg ?? prefs.weightKg])
    )
    const savedWeights = saved.current?.exWeights
    return savedWeights ? { ...base, ...savedWeights } : base
  })

  // ── Persist session to localStorage so freezes / reloads don't lose progress ──
  useEffect(() => {
    if (!activePlanId) return
    localStorage.setItem(SESSION_KEY, JSON.stringify({ exIdx, setIdx, exWeights }))
  }, [exIdx, setIdx, exWeights, activePlanId])

  // ── Status-bar colour: dark while in workout, restored on exit ──
  useEffect(() => {
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    const statusStyle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-status-bar-style"]')
    const prevColor = themeColor?.content
    if (themeColor) themeColor.content = '#3A2E28'
    if (statusStyle) statusStyle.content = 'black-translucent'
    return () => {
      if (themeColor && prevColor) themeColor.content = prevColor
      if (statusStyle) statusStyle.content = 'default'
    }
  }, [])

  // ── Prime iOS audio context on first touch ──
  useEffect(() => {
    const unlock = () => primeAudioContext()
    document.addEventListener('touchstart', unlock, { once: true, passive: true })
    return () => document.removeEventListener('touchstart', unlock)
  }, [])

  // ── Request notification permission once, then register a push subscription
  //    so backgrounded reminders can fire even when iOS suspends JS timers ──
  useEffect(() => {
    requestNotificationPermission().then((ok) => { if (ok) ensureSubscription() })
  }, [])

  // ── Screen Wake Lock — held for the full workout ──
  useEffect(() => {
    if (!activePlanId || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    const acquire = async () => {
      try { lock = await navigator.wakeLock.request('screen') } catch { /* denied */ }
    }
    acquire()
    const onVis = () => { if (document.visibilityState === 'visible') acquire() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      lock?.release().catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!activePlanId])

  // ── Notifications: rest-done + 2-minute set reminder ──
  // Foreground: in-app showNotification + haptic (instant feedback while open).
  // Background: a server-scheduled web push — iOS suspends the setTimeout below
  // ~1s after the app backgrounds, so the push is the only reminder that fires
  // when the screen is locked.
  useEffect(() => {
    // Rest → exercise transition: rest just ended
    if (prevPhaseRef.current === 'rest' && phase === 'exercise') {
      showNotification('Rest over — go! 🔥', `Set ${setIdx + 1} is ready`)
    }
    prevPhaseRef.current = phase

    // Clear any pending in-app set reminder
    if (setReminderRef.current) { clearTimeout(setReminderRef.current); setReminderRef.current = null }

    if (phase === 'exercise') {
      const exName = allExercises.find((e) => e.id === plan?.exercises[exIdx]?.exerciseId)?.name ?? 'your set'
      setReminderRef.current = setTimeout(() => {
        triggerHaptic('warning')
        showNotification('Still going? 💪', `Remember to log ${exName}`)
      }, 2 * 60 * 1_000)
      cancelReminder('rest')
      scheduleReminder('set', 120, 'Still going? 💪', `Remember to log ${exName}`)
    } else if (phase === 'rest') {
      cancelReminder('set')
      scheduleReminder('rest', REST_SECONDS, 'Rest over — go! 🔥', 'Your next set is ready')
    } else if (phase === 'done') {
      cancelReminder('rest')
      cancelReminder('set')
    }

    return () => { if (setReminderRef.current) clearTimeout(setReminderRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, exIdx, setIdx])

  // ── Redirect if no plan ──
  useEffect(() => {
    if (!plan) { navigate('/'); return }
  }, [plan, navigate])

  // ── Weight helpers ──
  function startEditWeight() {
    const cur = exWeights[currentItem?.exerciseId ?? ''] ?? prefs.weightKg
    setEditingWeightVal(fmtWeight(cur, unit))
    setEditingWeight(true)
  }

  function commitEditWeight() {
    const parsed = parseFloat(editingWeightVal)
    if (!isNaN(parsed) && parsed >= 0 && currentItem) {
      const inKg = unit === 'lb' ? parsed / KG_TO_LB : parsed
      setExWeights((prev) => ({ ...prev, [currentItem.exerciseId]: Math.max(0, parseFloat(inKg.toFixed(4))) }))
    }
    setEditingWeight(false)
  }

  function adjustExWeight(exerciseId: string, delta: number) {
    setExWeights((prev) => ({
      ...prev,
      [exerciseId]: Math.max(0, parseFloat(((prev[exerciseId] ?? prefs.weightKg) + delta).toFixed(4))),
    }))
  }

  // ── Rest timer ──
  function addRestTime() {
    setRestRemaining((r) => r + 15)
    setRestTotal((t) => t + 15)
  }

  useEffect(() => {
    if (phase !== 'rest') return
    setRestRemaining(REST_SECONDS)
    setRestTotal(REST_SECONDS)
    timerRef.current = setInterval(() => {
      setRestRemaining((r) => {
        if (r <= 1) {
          clearInterval(timerRef.current!)
          triggerHaptic('warning')
          setPhase('exercise')
          return REST_SECONDS
        }
        return r - 1
      })
    }, 1_000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  // ── Derived state ──
  const currentItem = plan?.exercises[exIdx]
  const currentEx = currentItem ? allExercises.find((e) => e.id === currentItem.exerciseId) : null
  const nextItem = plan?.exercises[exIdx + 1]
  const nextEx = nextItem ? allExercises.find((e) => e.id === nextItem.exerciseId) : null

  const totalSets = plan?.exercises.reduce((s, e) => s + e.sets, 0) ?? 0
  const completedSets = plan?.exercises.slice(0, exIdx).reduce((s, e) => s + e.sets, 0) ?? 0
  const overallProgress = completedSets + setIdx

  // ── PR computation ──
  const priorWeights = currentEx
    ? logs
        .flatMap((l) => l.exercises ?? [])
        .filter((e) => e.exerciseId === currentEx.id)
        .map((e) => e.weightKg)
    : []
  const bestWeight = priorWeights.length > 0 ? Math.max(...priorWeights) : null
  const currentWeight = exWeights[currentItem?.exerciseId ?? ''] ?? prefs.weightKg
  const isPRPace = bestWeight !== null && currentWeight > bestWeight

  // ── Complete set ──
  function completeSet() {
    if (!plan || !currentItem) return
    setEditingWeight(false)
    primeAudioContext()
    triggerHaptic('medium')

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

  // ── Finish / abandon ──
  const finishWorkout = useCallback(
    (completed: boolean) => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (setReminderRef.current) clearTimeout(setReminderRef.current)
      cancelReminder('rest')
      cancelReminder('set')
      localStorage.removeItem(SESSION_KEY)

      const exercises = plan?.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        weightKg: exWeights[e.exerciseId] ?? prefs.weightKg,
      })) ?? []

      const prs = exercises
        .filter(({ exerciseId, weightKg }) => {
          const prior = logs
            .flatMap((l) => l.exercises ?? [])
            .filter((ex) => ex.exerciseId === exerciseId)
            .map((ex) => ex.weightKg)
          if (prior.length === 0) return false
          return weightKg > Math.max(...prior)
        })
        .map((e) => e.exerciseId)

      addLog({
        id: nanoid(),
        planId: activePlanId ?? '',
        planName: plan?.name ?? 'Workout',
        date: new Date().toISOString(),
        durationSec: Math.round((Date.now() - startTime.current) / 1000),
        completed,
        exercises,
        prs,
      })

      const currentIdx = parseInt(localStorage.getItem(HAB_IDX_KEY) ?? '0', 10)
      localStorage.setItem(HAB_IDX_KEY, String((currentIdx + 1) % HAB_MESSAGES.length))

      setActivePlanId(null)
      navigate('/')
    },
    [activePlanId, addLog, exWeights, logs, navigate, plan, prefs.weightKg, setActivePlanId]
  )

  if (!plan || !currentEx) return null

  // ── Done screen ──
  if (phase === 'done') {
    const sessionPRs = plan.exercises.filter(({ exerciseId }) => {
      const current = exWeights[exerciseId] ?? prefs.weightKg
      const prior = logs
        .flatMap((l) => l.exercises ?? [])
        .filter((ex) => ex.exerciseId === exerciseId)
        .map((ex) => ex.weightKg)
      if (prior.length === 0) return false
      return current > Math.max(...prior)
    })

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          position: 'fixed', inset: 0,
          background: 'linear-gradient(160deg, #3A2E28 0%, #5A4438 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 32px',
          paddingTop: 'max(80px, env(safe-area-inset-top))',
          paddingBottom: 'max(48px, env(safe-area-inset-bottom))',
          overflowY: 'auto',
        }}
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          style={{
            width: 80, height: 80, background: '#F2C4B0', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28,
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L19 7" stroke="#3A2E28" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>

        <h1 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 44, fontWeight: 400, color: '#FAF7F2', margin: '0 0 8px', textAlign: 'center' }}>
          Beautiful work.
        </h1>
        <p style={{ fontSize: 15, color: '#C4A882', margin: '0 0 12px', textAlign: 'center' }}>
          {plan.name} complete
        </p>
        <p style={{ fontSize: 14, color: '#E8D8C4', margin: '0 0 28px', textAlign: 'center' }}>
          {Math.round((Date.now() - startTime.current) / 60_000)} min · {totalSets} sets
        </p>

        {/* Message from Hab */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          style={{ width: '100%', maxWidth: 320, marginBottom: 28, textAlign: 'center' }}
        >
          <p style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 19, fontWeight: 400, fontStyle: 'italic', color: '#FAF7F2', lineHeight: 1.55, margin: '0 0 10px' }}>
            "{habMessage}"
          </p>
          <span style={{ fontSize: 13, color: '#C4A882', letterSpacing: 0.5 }}>— your Hab</span>
        </motion.div>

        {/* PR celebration */}
        {sessionPRs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            style={{ background: 'rgba(242,196,176,0.15)', border: '1px solid rgba(242,196,176,0.35)', borderRadius: 18, padding: '16px 20px', marginBottom: 32, width: '100%', maxWidth: 320 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>🏆</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#F2C4B0' }}>
                {sessionPRs.length} Personal Record{sessionPRs.length > 1 ? 's' : ''}!
              </span>
            </div>
            {sessionPRs.map(({ exerciseId }) => {
              const ex = allExercises.find((e) => e.id === exerciseId)
              return <div key={exerciseId} style={{ fontSize: 13, color: '#E8D8C4', marginTop: 4 }}>⭐ {ex?.name}</div>
            })}
          </motion.div>
        )}

        {sessionPRs.length === 0 && <div style={{ marginBottom: 48 }} />}

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => finishWorkout(true)}
          style={{ background: '#F2C4B0', color: '#3A2E28', border: 'none', borderRadius: 18, padding: '18px 48px', fontSize: 17, fontWeight: 600, cursor: 'pointer', fontFamily: '"DM Sans", system-ui, sans-serif' }}
        >
          Save & Finish
        </motion.button>
      </motion.div>
    )
  }

  // ── Active workout screen ──
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'linear-gradient(160deg, #3A2E28 0%, #5A4438 60%, #7A5A48 100%)',
        display: 'flex', flexDirection: 'column',
        paddingTop: 'max(54px, env(safe-area-inset-top))',
        paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
        overflowY: 'auto', overflowX: 'hidden',
        zIndex: 100,
      }}
    >
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px 20px' }}>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setConfirmEnd(true)}
          style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 12, padding: '10px 16px', color: '#E8D8C4', fontSize: 14, cursor: 'pointer', fontFamily: '"DM Sans", system-ui, sans-serif', WebkitTapHighlightColor: 'transparent' }}
        >
          End
        </motion.button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#C4A882', fontWeight: 400 }}>{plan.name}</div>
          <div style={{ fontSize: 12, color: '#7A6458' }}>{overallProgress}/{totalSets} sets</div>
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

      {/* Exercise / rest phases */}
      <AnimatePresence mode="wait">

        {/* ── Exercise ── */}
        {phase === 'exercise' && (
          <motion.div
            key={`ex-${exIdx}-${setIdx}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 28px' }}
          >
            <div style={{ flex: 1 }}>

              {/* Exercise label */}
              <div style={{ fontSize: 13, color: '#C4A882', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Exercise {exIdx + 1} of {plan.exercises.length}
              </div>

              {/* Exercise name */}
              <h1 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 52, fontWeight: 300, color: '#FAF7F2', margin: '0 0 10px', lineHeight: 1.05 }}>
                {currentEx.name}
              </h1>

              {/* ── PR badge row ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {bestWeight !== null ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(242,196,176,0.1)', border: '1px solid rgba(242,196,176,0.22)', borderRadius: 8, padding: '4px 10px' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#C4A882" strokeWidth="2" strokeLinejoin="round" />
                    </svg>
                    <span style={{ fontSize: 12, color: '#C4A882', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                      Best {fmtWeight(bestWeight, unit)}
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 10px' }}>
                    <span style={{ fontSize: 12, color: '#7A6458', fontFamily: '"DM Sans", system-ui, sans-serif' }}>First time</span>
                  </div>
                )}

                {/* Live PR-pace indicator */}
                <AnimatePresence>
                  {isPRPace && (
                    <motion.div
                      key="pr-pace"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(242,196,176,0.18)', border: '1px solid rgba(242,196,176,0.4)', borderRadius: 8, padding: '4px 10px' }}
                    >
                      <span style={{ fontSize: 13 }}>🏆</span>
                      <span style={{ fontSize: 12, color: '#F2C4B0', fontFamily: '"DM Sans", system-ui, sans-serif', fontWeight: 600 }}>PR Pace</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Reps / set counter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 40, fontWeight: 300, color: '#F2C4B0', lineHeight: 1 }}>
                    {currentItem?.reps}
                  </div>
                  <div style={{ fontSize: 11, color: '#C4A882', marginTop: 2 }}>reps</div>
                </div>
                <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.15)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 40, fontWeight: 300, color: '#F2C4B0', lineHeight: 1 }}>
                    {setIdx + 1}/{currentItem?.sets}
                  </div>
                  <div style={{ fontSize: 11, color: '#C4A882', marginTop: 2 }}>set</div>
                </div>
              </div>

              {/* Weight control */}
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
                <button
                  onClick={() => adjustExWeight(currentItem!.exerciseId, -weightStep(unit))}
                  style={{ padding: '10px 16px', background: 'none', border: 'none', fontSize: 20, color: '#C4A882', cursor: 'pointer', lineHeight: 1, WebkitTapHighlightColor: 'transparent' }}
                >
                  −
                </button>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  {editingWeight ? (
                    <input
                      autoFocus
                      type="number"
                      inputMode="decimal"
                      value={editingWeightVal}
                      onChange={(e) => setEditingWeightVal(e.target.value)}
                      onBlur={commitEditWeight}
                      onKeyDown={(e) => e.key === 'Enter' && commitEditWeight()}
                      style={{ width: 72, textAlign: 'center', fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 24, fontWeight: 300, color: '#3A2E28', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 8, padding: '4px 8px', outline: 'none' }}
                    />
                  ) : (
                    <span onClick={startEditWeight} style={{ cursor: 'text', borderBottom: '1px dashed rgba(196,168,130,0.5)', paddingBottom: 2 }}>
                      <span style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 24, fontWeight: 300, color: '#FAF7F2' }}>
                        {fmtWeight(exWeights[currentItem!.exerciseId] ?? prefs.weightKg, unit)}
                      </span>
                      <span style={{ fontSize: 11, color: '#C4A882', marginLeft: 4 }}>{unit}</span>
                    </span>
                  )}
                </div>
                <button
                  onClick={() => adjustExWeight(currentItem!.exerciseId, weightStep(unit))}
                  style={{ padding: '10px 16px', background: 'none', border: 'none', fontSize: 20, color: '#C4A882', cursor: 'pointer', lineHeight: 1, WebkitTapHighlightColor: 'transparent' }}
                >
                  +
                </button>
              </div>

              {/* ── Form cue — always visible ── */}
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px', marginBottom: 32 }}>
                <div style={{ fontSize: 11, color: '#C4A882', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  Form
                </div>
                <p style={{ fontSize: 15, color: '#E8D8C4', margin: 0, lineHeight: 1.6, fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  {currentEx.cue}
                </p>
              </div>
            </div>

            {/* Complete Set button */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={completeSet}
              style={{ width: '100%', background: '#F2C4B0', color: '#3A2E28', border: 'none', borderRadius: 18, padding: '20px', fontSize: 18, fontWeight: 600, cursor: 'pointer', fontFamily: '"DM Sans", system-ui, sans-serif', marginBottom: nextEx ? 14 : 0, WebkitTapHighlightColor: 'transparent' }}
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

        {/* ── Rest ── */}
        {phase === 'rest' && (
          <motion.div
            key="rest"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', gap: 28 }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#C4A882', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Rest</div>
              <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 32, fontWeight: 300, color: '#FAF7F2', margin: 0 }}>
                Take a breath
              </h2>
            </div>

            <ProgressRing size={180} strokeWidth={8} progress={restTotal - restRemaining} total={restTotal} color="#F2C4B0" trackColor="rgba(255,255,255,0.1)">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 52, fontWeight: 300, color: '#FAF7F2', lineHeight: 1 }}>
                  {restRemaining}
                </div>
                <div style={{ fontSize: 12, color: '#C4A882', marginTop: 4 }}>seconds</div>
              </div>
            </ProgressRing>

            {currentEx && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#7A6458', marginBottom: 4 }}>Up next</div>
                <div style={{ fontSize: 18, color: '#E8D8C4', fontFamily: '"Cormorant Garamond", Georgia, serif' }}>{currentEx.name}</div>
                <div style={{ fontSize: 13, color: '#C4A882', marginTop: 2 }}>Set {setIdx + 1} of {currentItem?.sets}</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={addRestTime}
                style={{ background: 'rgba(255,255,255,0.12)', color: '#E8D8C4', border: 'none', borderRadius: 14, padding: '14px 28px', fontSize: 15, cursor: 'pointer', fontFamily: '"DM Sans", system-ui, sans-serif', WebkitTapHighlightColor: 'transparent' }}
              >
                +15s
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={skipRest}
                style={{ background: 'rgba(255,255,255,0.12)', color: '#E8D8C4', border: 'none', borderRadius: 14, padding: '14px 28px', fontSize: 15, cursor: 'pointer', fontFamily: '"DM Sans", system-ui, sans-serif', WebkitTapHighlightColor: 'transparent' }}
              >
                Skip Rest
              </motion.button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* ── End-workout confirmation — dark bottom sheet ── */}
      <Sheet open={confirmEnd} onClose={() => setConfirmEnd(false)} background="#2A1F1A" handleColor="rgba(255,255,255,0.15)">
        <div style={{ padding: '0 24px max(28px, env(safe-area-inset-bottom))' }}>
          <h3 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 28, fontWeight: 400, color: '#FAF7F2', margin: '0 0 8px' }}>
            End workout?
          </h3>
          <p style={{ fontSize: 14, color: '#C4A882', margin: '0 0 28px', lineHeight: 1.55, fontFamily: '"DM Sans", system-ui, sans-serif' }}>
            Your progress so far will be saved as a partial session.
          </p>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setConfirmEnd(false)}
            style={{ width: '100%', height: 54, background: '#F2C4B0', color: '#3A2E28', border: 'none', borderRadius: 16, fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: '"DM Sans", system-ui, sans-serif', marginBottom: 10, WebkitTapHighlightColor: 'transparent' }}
          >
            Keep Going
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { setConfirmEnd(false); finishWorkout(false) }}
            style={{ width: '100%', height: 54, background: 'transparent', border: '1px solid rgba(192,80,77,0.35)', borderRadius: 16, color: '#E07070', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: '"DM Sans", system-ui, sans-serif', WebkitTapHighlightColor: 'transparent' }}
          >
            End Workout
          </motion.button>
        </div>
      </Sheet>
    </div>
  )
}
