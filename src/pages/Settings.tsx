import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkoutStore } from '../store/useWorkoutStore'
import { createSyncCode, verifySyncCode, pushSync } from '../lib/syncApi'
import { fmtWeight, weightStep, KG_TO_LB } from '../lib/units'

type SyncView = 'idle' | 'creating' | 'joining' | 'active'

export default function Settings() {
  const { prefs, logs, plans, setPrefs, syncPull } = useWorkoutStore()

  // Sync state
  const [syncView, setSyncView] = useState<SyncView>(prefs.syncCode ? 'active' : 'idle')
  const [joinInput, setJoinInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [justCopied, setJustCopied] = useState(false)

  // Profile state
  const [nameInput, setNameInput] = useState(prefs.name)
  const unit = prefs.unit ?? 'kg'
  const [editingWeight, setEditingWeight] = useState(false)
  const [editingWeightVal, setEditingWeightVal] = useState('')

  function startEditWeight() {
    setEditingWeightVal(fmtWeight(prefs.weightKg, unit))
    setEditingWeight(true)
  }

  function commitWeight() {
    const parsed = parseFloat(editingWeightVal)
    if (!isNaN(parsed) && parsed > 0) {
      const inKg = unit === 'lb' ? parsed / KG_TO_LB : parsed
      setPrefs({ weightKg: Math.max(0.01, parseFloat(inKg.toFixed(4))) })
    }
    setEditingWeight(false)
  }

  async function handleCreate() {
    setLoading(true)
    setError('')
    try {
      const code = await createSyncCode()
      // Upload all current data
      await pushSync(code, logs, plans)
      setPrefs({ syncCode: code, lastSynced: new Date().toISOString() })
      setSyncView('active')
    } catch {
      setError('Could not create sync code. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    const code = joinInput.toUpperCase().trim()
    if (code.length < 4) { setError('Enter a valid sync code.'); return }
    setLoading(true)
    setError('')
    try {
      const exists = await verifySyncCode(code)
      if (!exists) { setError('Code not found. Double-check and try again.'); setLoading(false); return }
      // Pull cloud data into local store
      await syncPull()
      setPrefs({ syncCode: code, lastSynced: new Date().toISOString() })
      setSyncView('active')
    } catch {
      setError('Could not connect. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSyncNow() {
    if (!prefs.syncCode) return
    setLoading(true)
    try {
      await syncPull()
    } finally {
      setLoading(false)
    }
  }

  function handleLeaveSync() {
    setPrefs({ syncCode: undefined, lastSynced: undefined })
    setSyncView('idle')
    setJoinInput('')
  }

  function copyCode() {
    if (!prefs.syncCode) return
    navigator.clipboard.writeText(prefs.syncCode).then(() => {
      setJustCopied(true)
      setTimeout(() => setJustCopied(false), 2000)
    })
  }

  function saveProfile() {
    setPrefs({ name: nameInput.trim() || prefs.name })
  }

  const lastSyncedLabel = prefs.lastSynced
    ? new Date(prefs.lastSynced).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : null

  return (
    <div style={{ padding: '0 20px 40px' }}>
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
        Profile &
        <br />
        <em>Settings</em>
      </h1>
      <p style={{ fontSize: 14, color: '#C4A882', margin: '0 0 28px' }}>
        Manage your profile and sync
      </p>

      {/* Profile section */}
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: '20px',
          marginBottom: 16,
          border: '1px solid rgba(196,168,130,0.15)',
        }}
      >
        <div style={{ fontSize: 11, color: '#C4A882', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 }}>
          Profile
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, color: '#7A6458', display: 'block', marginBottom: 6 }}>Name</label>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={saveProfile}
            style={{
              width: '100%',
              background: '#FAF7F2',
              border: '1px solid rgba(196,168,130,0.3)',
              borderRadius: 12,
              padding: '12px 14px',
              fontSize: 15,
              color: '#3A2E28',
              fontFamily: '"DM Sans", system-ui, sans-serif',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        {/* Unit toggle */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, color: '#7A6458', display: 'block', marginBottom: 6 }}>Weight unit</label>
          <div style={{ display: 'flex', background: '#FAF7F2', borderRadius: 12, padding: 3, border: '1px solid rgba(196,168,130,0.3)', width: '100%', boxSizing: 'border-box' }}>
            {(['kg', 'lb'] as const).map((u) => (
              <motion.button
                key={u}
                whileTap={{ scale: 0.94 }}
                onClick={() => setPrefs({ unit: u })}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 10,
                  border: 'none',
                  background: unit === u ? '#3A2E28' : 'transparent',
                  color: unit === u ? '#FAF7F2' : '#7A6458',
                  fontSize: 14,
                  fontWeight: unit === u ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  transition: 'all 0.15s ease',
                }}
              >
                {u}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Default ankle weight */}
        <div>
          <label style={{ fontSize: 13, color: '#7A6458', display: 'block', marginBottom: 6 }}>
            Default ankle weight ({unit})
          </label>
          <div style={{ display: 'flex', alignItems: 'center', background: '#FAF7F2', border: '1px solid rgba(196,168,130,0.3)', borderRadius: 12, overflow: 'hidden', width: '100%', boxSizing: 'border-box' }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                const step = weightStep(unit)
                setPrefs({ weightKg: Math.max(step, parseFloat((prefs.weightKg - step).toFixed(4))) })
              }}
              style={{ padding: '12px 18px', background: 'none', border: 'none', fontSize: 20, color: '#7A6458', cursor: 'pointer', lineHeight: 1 }}
            >−</motion.button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              {editingWeight ? (
                <input
                  autoFocus
                  type="number"
                  inputMode="decimal"
                  value={editingWeightVal}
                  onChange={(e) => setEditingWeightVal(e.target.value)}
                  onBlur={commitWeight}
                  onKeyDown={(e) => e.key === 'Enter' && commitWeight()}
                  style={{ width: 80, textAlign: 'center', fontSize: 16, fontWeight: 500, color: '#3A2E28', background: 'transparent', border: 'none', outline: 'none', fontFamily: '"DM Sans", system-ui, sans-serif' }}
                />
              ) : (
                <span
                  onClick={startEditWeight}
                  style={{ fontSize: 16, fontWeight: 500, color: '#3A2E28', cursor: 'text', borderBottom: '1px dashed rgba(196,168,130,0.5)', paddingBottom: 1 }}
                >
                  {fmtWeight(prefs.weightKg, unit)} {unit}
                </span>
              )}
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                const step = weightStep(unit)
                setPrefs({ weightKg: parseFloat((prefs.weightKg + step).toFixed(4)) })
              }}
              style={{ padding: '12px 18px', background: 'none', border: 'none', fontSize: 20, color: '#7A6458', cursor: 'pointer', lineHeight: 1 }}
            >+</motion.button>
          </div>
        </div>
      </div>

      {/* Sync section */}
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: '20px',
          border: '1px solid rgba(196,168,130,0.15)',
        }}
      >
        <div style={{ fontSize: 11, color: '#C4A882', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
          Sync
        </div>
        <p style={{ fontSize: 13, color: '#7A6458', margin: '0 0 20px', lineHeight: 1.5 }}>
          Share a sync code so both of you see the same workout history in real time.
        </p>

        <AnimatePresence mode="wait">

          {/* IDLE — no sync set up */}
          {syncView === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { setSyncView('creating'); handleCreate() }}
                style={{ ...primaryBtn }}
              >
                Create a sync code
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { setSyncView('joining'); setError('') }}
                style={{ ...secondaryBtn }}
              >
                Enter existing code
              </motion.button>
            </motion.div>
          )}

          {/* CREATING — spinner while generating */}
          {syncView === 'creating' && loading && (
            <motion.div
              key="creating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: 'center', padding: '20px 0', color: '#C4A882', fontSize: 14 }}
            >
              Creating your sync code…
            </motion.div>
          )}

          {/* JOINING — enter code */}
          {syncView === 'joining' && (
            <motion.div
              key="joining"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <input
                value={joinInput}
                onChange={(e) => { setJoinInput(e.target.value.toUpperCase()); setError('') }}
                placeholder="ENTER CODE"
                maxLength={8}
                style={{
                  background: '#FAF7F2',
                  border: '1px solid rgba(196,168,130,0.3)',
                  borderRadius: 12,
                  padding: '14px',
                  fontSize: 20,
                  letterSpacing: 4,
                  fontWeight: 600,
                  color: '#3A2E28',
                  textAlign: 'center',
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
              {error ? (
                <p style={{ fontSize: 13, color: '#C0504D', margin: 0, textAlign: 'center' }}>{error}</p>
              ) : null}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleJoin}
                disabled={loading}
                style={{ ...primaryBtn, opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Connecting…' : 'Join sync'}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { setSyncView('idle'); setError('') }}
                style={{ ...secondaryBtn }}
              >
                Cancel
              </motion.button>
            </motion.div>
          )}

          {/* ACTIVE — synced */}
          {syncView === 'active' && prefs.syncCode && (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {/* Code display */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={copyCode}
                style={{
                  width: '100%',
                  background: '#FAF7F2',
                  border: '1.5px dashed rgba(196,168,130,0.5)',
                  borderRadius: 16,
                  padding: '18px 14px',
                  marginBottom: 14,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 11, color: '#C4A882', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  Your sync code
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 6, color: '#3A2E28', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  {prefs.syncCode}
                </div>
                <div style={{ fontSize: 12, color: '#C4A882', marginTop: 8 }}>
                  {justCopied ? '✓ Copied!' : 'Tap to copy · Share with your partner'}
                </div>
              </motion.button>

              {/* Last synced */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#B8C4B0', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#7A6458' }}>
                  {lastSyncedLabel ? `Last synced ${lastSyncedLabel}` : 'Not synced yet'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSyncNow}
                  disabled={loading}
                  style={{ ...primaryBtn, flex: 1, opacity: loading ? 0.6 : 1, fontSize: 14 }}
                >
                  {loading ? 'Syncing…' : 'Sync now'}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleLeaveSync}
                  style={{ ...secondaryBtn, flex: 1, fontSize: 14 }}
                >
                  Leave sync
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        {[
          { label: 'Workouts', value: logs.length },
          { label: 'Plans', value: plans.length },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              background: '#fff',
              borderRadius: 16,
              padding: '16px',
              textAlign: 'center',
              border: '1px solid rgba(196,168,130,0.15)',
            }}
          >
            <div style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 36, fontWeight: 400, color: '#3A2E28', lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: '#C4A882', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const primaryBtn: React.CSSProperties = {
  width: '100%',
  background: '#3A2E28',
  color: '#FAF7F2',
  border: 'none',
  borderRadius: 14,
  padding: '14px',
  fontSize: 15,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: '"DM Sans", system-ui, sans-serif',
}

const secondaryBtn: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  color: '#7A6458',
  border: '1px solid rgba(196,168,130,0.35)',
  borderRadius: 14,
  padding: '14px',
  fontSize: 15,
  fontWeight: 400,
  cursor: 'pointer',
  fontFamily: '"DM Sans", system-ui, sans-serif',
}

