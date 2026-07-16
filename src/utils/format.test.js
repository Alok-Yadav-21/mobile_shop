import { describe, it, expect } from 'vitest'
import { money } from './format.js'

describe('money', () => {
  it('formats a number as GBP with thousands separators', () => {
    expect(money(1234)).toBe('£1,234')
  })
  it('formats zero correctly', () => {
    expect(money(0)).toBe('£0')
  })
  it('returns an em dash for null/undefined', () => {
    expect(money(null)).toBe('—')
    expect(money(undefined)).toBe('—')
  })
})
