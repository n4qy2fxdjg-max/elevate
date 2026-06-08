/**
 * Background push reminders.
 *
 * Why push (not setTimeout): iOS suspends a PWA's JS timers within ~1s of
 * backgrounding, so an in-app countdown can't fire a rest-end alert while you're
 * on another app or the screen is locked. A server-scheduled web push CAN — and
 * iOS vibrates the phone when the notification arrives, which is the only "buzz"
 * available to a backgrounded web app.
 *
 * Pushes are bodyless; the service worker fetches the text from /api/push/pending.
 * Requires the PWA to be installed to the home screen + notification permission.
 */

const VAPID_PUBLIC = 'BECTfAcwoZsiFp5VVZG3wpiUPjZztMv1jmqPD9EECYDphx-RAsAeOUrb6xcHczWGaMINGHrPGDedKtMmT_5JfQs'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function supported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** Get (or create) this device's push subscription. Returns null if unsupported/denied. */
export async function ensureSubscription(): Promise<PushSubscription | null> {
  if (!supported() || Notification.permission !== 'granted') return null
  try {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
      })
    }
    return sub
  } catch {
    return null
  }
}

/** Schedule a reminder `seconds` from now. kind keeps rest vs set independent. */
export async function scheduleReminder(kind: 'rest' | 'set', seconds: number, title: string, body: string): Promise<void> {
  const sub = await ensureSubscription()
  if (!sub) return
  try {
    await fetch('/api/push/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind,
        subscription: sub.toJSON(),
        fireAt: Date.now() + seconds * 1000,
        title,
        body,
      }),
    })
  } catch { /* offline / unsupported — silently skip */ }
}

export async function cancelReminder(kind: 'rest' | 'set'): Promise<void> {
  if (!supported()) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    await fetch('/api/push/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, endpoint: sub.endpoint }),
    })
  } catch { /* ignore */ }
}
