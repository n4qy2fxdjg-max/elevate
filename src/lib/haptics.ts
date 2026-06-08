/**
 * Haptic feedback + notification helpers.
 *
 * iOS Safari ignores navigator.vibrate() entirely.
 * We use a low-frequency audio transient via the Web Audio API to physically
 * trigger the Taptic Engine. Rules:
 *
 *  1. Call primeAudioContext() from any early user gesture (e.g. first tap).
 *  2. After priming, triggerHaptic() works even from interval / timeout callbacks.
 *
 * Android falls back to navigator.vibrate().
 */

let _ctx: AudioContext | null = null

/** Unlock the Web Audio context on iOS. Attach to the first user gesture. */
export function primeAudioContext(): void {
  if (_ctx) return
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    _ctx = new Ctor()
    // 1-sample silent buffer fully unlocks the context on iOS
    const buf = _ctx.createBuffer(1, 1, 22_050)
    const src = _ctx.createBufferSource()
    src.buffer = buf
    src.connect(_ctx.destination)
    src.start(0)
  } catch {
    _ctx = null
  }
}

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning'

function _playTone(ctx: AudioContext, style: HapticStyle): void {
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    const freq =
      style === 'light'   ? 80  :
      style === 'heavy'   ? 36  :
      style === 'success' ? 52  :
      style === 'warning' ? 44  : 60
    const dur =
      style === 'warning' ? 0.12 :
      style === 'success' ? 0.09 : 0.05
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    gain.gain.setValueAtTime(1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + dur)
  } catch { /* ignore */ }
}

export function triggerHaptic(style: HapticStyle = 'medium'): void {
  if (_ctx) {
    _ctx.resume().then(() => _playTone(_ctx!, style)).catch(() => {})
  } else {
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (Ctor) {
        const ctx = new Ctor()
        _playTone(ctx, style)
        setTimeout(() => ctx.close().catch(() => {}), 500)
      }
    } catch { /* ignore */ }
  }
  try {
    if ('vibrate' in navigator) {
      const pattern: number | number[] =
        style === 'success' ? [30, 40, 30]          :
        style === 'warning' ? [80, 50, 80, 50, 200] :
        style === 'heavy'   ? [120]                  : 60
      navigator.vibrate(pattern)
    }
  } catch { /* ignore */ }
}

// ─── Notifications ─────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied')  return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function showNotification(title: string, body: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: '/pwa-192.png', silent: false })
  } catch { /* requires service worker on some platforms */ }
}
