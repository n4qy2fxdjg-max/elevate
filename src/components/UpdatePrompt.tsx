import { useRegisterSW } from 'virtual:pwa-register/react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { z, colors, font } from '../lib/theme'

// How often to actively check the server for a newer build (in addition to the
// browser's own checks on load/navigation).
const CHECK_INTERVAL_MS = 60 * 60 * 1000 // hourly

/**
 * In-app update banner. With registerType 'prompt', a freshly deployed version
 * installs but waits; this surfaces a "Refresh" button so the user applies it on
 * their terms. updateServiceWorker(true) activates the waiting worker and reloads.
 */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      const check = () => { registration.update().catch(() => {}) }
      setInterval(check, CHECK_INTERVAL_MS)
      // Also check whenever the app returns to the foreground.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })

  return createPortal(
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          key="update-prompt"
          initial={{ y: -90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -90, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 30 }}
          style={{
            position: 'fixed',
            top: 'max(12px, calc(env(safe-area-inset-top, 0px) + 8px))',
            left: 16, right: 16, margin: '0 auto', maxWidth: 398,
            zIndex: z.dialog,
            display: 'flex', alignItems: 'center', gap: 12,
            background: colors.white,
            border: `1px solid rgba(196,168,130,0.4)`,
            borderRadius: 16, padding: '12px 12px 12px 16px',
            boxShadow: '0 14px 44px rgba(58,46,40,0.18)',
          }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            background: 'rgba(242,196,176,0.22)', border: '1px solid rgba(196,168,130,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M21 2v6h-6" stroke={colors.warmDark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 12a9 9 0 0115-6.7L21 8" stroke={colors.warmDark} strokeWidth="2" strokeLinecap="round" />
              <path d="M3 22v-6h6" stroke={colors.warmDark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 12a9 9 0 01-15 6.7L3 16" stroke={colors.warmDark} strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: colors.warmDark, lineHeight: 1.2, fontFamily: font.body, margin: 0 }}>
              Update available
            </p>
            <p style={{ fontSize: 11.5, color: colors.warmMid, marginTop: 1, fontFamily: font.body, margin: 0 }}>
              A new version of Elevate is ready.
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => updateServiceWorker(true)}
            style={{
              flexShrink: 0, background: colors.blush, border: 'none', borderRadius: 11,
              padding: '9px 16px', fontSize: 13, fontWeight: 700, color: colors.warmDark,
              cursor: 'pointer', fontFamily: font.body,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Refresh
          </motion.button>

          <button
            onClick={() => setNeedRefresh(false)}
            aria-label="Dismiss"
            style={{
              flexShrink: 0, width: 26, height: 26, borderRadius: '50%',
              background: 'rgba(58,46,40,0.06)', border: 'none', color: colors.warmMid,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
