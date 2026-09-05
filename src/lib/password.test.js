import { describe, it, expect } from 'vitest'
import {
  hashPassword, verifyPassword, passwordProblem, usernameProblem, normaliseUsername,
  suggestPassword, randomSalt,
} from './password.js'

describe('hashPassword / verifyPassword', () => {
  it('never keeps the password itself', async () => {
    const record = await hashPassword('correct-horse-7')
    expect(JSON.stringify(record)).not.toContain('correct-horse-7')
    expect(record.hash).toHaveLength(64)
  })

  it('accepts the right password', async () => {
    const record = await hashPassword('correct-horse-7')
    expect(await verifyPassword('correct-horse-7', record)).toBe(true)
  })

  it('rejects the wrong one, including a near miss', async () => {
    const record = await hashPassword('correct-horse-7')
    expect(await verifyPassword('correct-horse-8', record)).toBe(false)
    expect(await verifyPassword('Correct-horse-7', record)).toBe(false)
    expect(await verifyPassword('', record)).toBe(false)
  })

  it('salts, so two accounts sharing a password do not share a hash', async () => {
    const a = await hashPassword('staff1234')
    const b = await hashPassword('staff1234')
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash)
  })

  it('is deterministic for a given salt, which is what makes verification work', async () => {
    const salt = randomSalt()
    const a = await hashPassword('staff1234', salt)
    const b = await hashPassword('staff1234', salt)
    expect(a.hash).toBe(b.hash)
  })

  it('fails closed on a record with nothing in it', async () => {
    expect(await verifyPassword('anything', null)).toBe(false)
    expect(await verifyPassword('anything', {})).toBe(false)
    expect(await verifyPassword('anything', { salt: 'ab' })).toBe(false)
  })
})

describe('passwordProblem', () => {
  it('accepts a password that meets the rules', () => {
    expect(passwordProblem('staff1234')).toBeNull()
    expect(passwordProblem('violet-copper-45')).toBeNull()
  })
  it('rejects short, letterless and numberless passwords', () => {
    expect(passwordProblem('ab12')).toMatch(/8 characters/)
    expect(passwordProblem('12345678')).toMatch(/letter/)
    expect(passwordProblem('abcdefgh')).toMatch(/number/)
  })
  it('treats missing input as a problem rather than throwing', () => {
    expect(passwordProblem(undefined)).toBeTruthy()
    expect(passwordProblem(null)).toBeTruthy()
  })
})

describe('usernames', () => {
  it('normalises case and stray spaces', () => {
    expect(normaliseUsername('  Priya.Shah ')).toBe('priya.shah')
  })
  it('refuses an @, which would collide with the email side of sign-in', () => {
    expect(usernameProblem('priya@virktech.co.uk')).toMatch(/@/)
  })
  it('refuses anything too short or oddly punctuated', () => {
    expect(usernameProblem('ab')).toMatch(/3 characters/)
    expect(usernameProblem('priya!')).toBeTruthy()
  })
  it('folds a typed space away rather than refusing it', () => {
    // The same normalisation runs on the way in and on every lookup, so "priya shah" and
    // "priyashah" can never become two different accounts.
    expect(normaliseUsername('priya shah')).toBe('priyashah')
    expect(usernameProblem('priya shah')).toBeNull()
  })
  it('accepts the shape admins actually issue', () => {
    expect(usernameProblem('priya.shah')).toBeNull()
    expect(usernameProblem('dan_whitfield-2')).toBeNull()
  })
})

describe('suggestPassword', () => {
  it('always produces something the policy would accept', () => {
    for (let i = 0; i < 25; i += 1) expect(passwordProblem(suggestPassword())).toBeNull()
  })
  it('does not hand out the same password twice in a row', () => {
    const seen = new Set(Array.from({ length: 20 }, () => suggestPassword()))
    expect(seen.size).toBeGreaterThan(1)
  })
})
