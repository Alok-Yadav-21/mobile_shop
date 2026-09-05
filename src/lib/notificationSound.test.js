import { describe, it, expect, beforeEach } from 'vitest'
import { newArrivals, isMuted, setMuted } from './notificationSound.js'

const n = (id, read = false) => ({ id, read })

describe('newArrivals', () => {
  it('announces nothing on the first read of a session', () => {
    // Opening a page with a backlog of unread notices must not play a chime per notice — none
    // of them arrived while anyone was looking.
    expect(newArrivals(null, [n('a'), n('b'), n('c')])).toEqual([])
  })

  it('announces one that turned up since last time', () => {
    const seen = new Set(['a', 'b'])
    expect(newArrivals(seen, [n('c'), n('a'), n('b')]).map((x) => x.id)).toEqual(['c'])
  })

  it('stays quiet when the list is refetched unchanged', () => {
    // Every write anywhere refetches this list, so an unchanged result is the common case.
    const seen = new Set(['a', 'b'])
    expect(newArrivals(seen, [n('a'), n('b')])).toEqual([])
  })

  it('does not chime for something already read elsewhere', () => {
    // Read on another device, or marked read in another tab — arriving in this tab's list is not
    // news worth a sound.
    const seen = new Set(['a'])
    expect(newArrivals(seen, [n('b', true), n('a')])).toEqual([])
  })

  it('handles several arriving at once without losing any', () => {
    const seen = new Set(['a'])
    expect(newArrivals(seen, [n('b'), n('c'), n('a')]).map((x) => x.id)).toEqual(['b', 'c'])
  })
})

describe('the mute preference', () => {
  // The tests run under node, which has no localStorage; the real browser one is stood in for so
  // the persistence path is actually exercised rather than falling through the catch.
  beforeEach(() => {
    const store = new Map()
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    }
  })

  it('defaults to audible', () => expect(isMuted()).toBe(false))

  it('remembers being turned off and back on', () => {
    setMuted(true)
    expect(isMuted()).toBe(true)
    setMuted(false)
    expect(isMuted()).toBe(false)
  })

  // A browser with site data blocked throws on every access. Losing the preference is
  // acceptable; a thrown error on the notification path is not.
  it('stays silent about storage it cannot reach', () => {
    globalThis.localStorage = {
      getItem() { throw new Error('denied') },
      setItem() { throw new Error('denied') },
    }
    expect(() => setMuted(true)).not.toThrow()
    expect(isMuted()).toBe(false)
  })
})
