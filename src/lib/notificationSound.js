// The sound a notification makes.
//
// Synthesised rather than loaded from a file: it is two short sine tones, so generating them
// costs a few lines and no network request, no binary in the repo, and nothing to licence. It
// also means the sound cannot fail to load on a slow shop connection and leave staff wondering
// why nothing chimed.
//
// Browsers refuse to play audio until the person has interacted with the page, which is the
// right default — a page that makes noise before you have touched it is hostile. So the context
// is created lazily and unlocked on the first real gesture, and a refusal is swallowed rather
// than thrown: a missed chime must never break the notification it was announcing.

const MUTE_KEY = 'vt_notification_muted'

// A5 then D6 — a rising two-note figure, short enough to register without being a ringtone.
const NOTES = [
  { hz: 880.0, at: 0, length: 0.09 },
  { hz: 1174.7, at: 0.085, length: 0.13 },
]
const PEAK = 0.14 // quiet enough for a shop counter, audible in another tab

let ctx = null

function context() {
  if (ctx) return ctx
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null
  ctx = new Ctor()
  return ctx
}

export function isMuted() {
  try { return localStorage.getItem(MUTE_KEY) === 'true' } catch { return false }
}

export function setMuted(muted) {
  try { localStorage.setItem(MUTE_KEY, muted ? 'true' : 'false') } catch { /* storage unavailable */ }
}

// Called from the first click anywhere in the app. Browsers only allow an AudioContext to start
// inside a gesture, so without this the very first notification of a session would be silent —
// which is the one most worth hearing.
export function unlockAudio() {
  const c = context()
  if (c && c.state === 'suspended') c.resume().catch(() => {})
}

export function playNotificationChime() {
  if (isMuted()) return
  const c = context()
  if (!c) return
  // Still suspended means no gesture has happened yet; the browser would refuse anyway.
  if (c.state === 'suspended') { c.resume().catch(() => {}); if (c.state === 'suspended') return }

  try {
    const now = c.currentTime
    for (const note of NOTES) {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.type = 'sine'
      osc.frequency.value = note.hz

      // Ramped in and out rather than switched: a square edge on a sine wave is an audible
      // click, which reads as a glitch rather than a chime.
      const start = now + note.at
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(PEAK, start + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.length)

      osc.connect(gain).connect(c.destination)
      osc.start(start)
      osc.stop(start + note.length + 0.02)
    }
  } catch { /* audio is a courtesy — never let it break the notification itself */ }
}

// Which notifications are new since last time, given the ids already seen. Pure, so the "do not
// chime for the whole backlog on first load" rule is testable rather than a useEffect quirk.
export function newArrivals(previousIds, notifications) {
  // No previous set means this is the first read of the session: everything here already existed
  // before the page opened, so none of it is news.
  if (previousIds === null) return []
  return notifications.filter((n) => !previousIds.has(n.id) && !n.read)
}
