import { describe, it, expect } from 'vitest'
import { buildCartLines, cartCount, cartSubtotal } from './cart.js'

const PRODUCTS = [
  { id: 'p1', name: 'Phone', price: 500 },
  { id: 'p2', name: 'Case', price: 20 },
]

describe('buildCartLines', () => {
  it('joins cart items to their product records', () => {
    const lines = buildCartLines([{ productId: 'p1', quantity: 2 }], PRODUCTS)
    expect(lines).toHaveLength(1)
    expect(lines[0].product.name).toBe('Phone')
    expect(lines[0].quantity).toBe(2)
  })

  it('drops lines whose product no longer exists', () => {
    const lines = buildCartLines([{ productId: 'missing', quantity: 1 }], PRODUCTS)
    expect(lines).toHaveLength(0)
  })
})

describe('cartCount', () => {
  it('sums quantities across all items', () => {
    expect(cartCount([{ quantity: 2 }, { quantity: 3 }])).toBe(5)
  })
  it('returns 0 for an empty cart', () => {
    expect(cartCount([])).toBe(0)
  })
})

describe('cartSubtotal', () => {
  it('multiplies price by quantity and sums all lines', () => {
    const lines = buildCartLines(
      [{ productId: 'p1', quantity: 2 }, { productId: 'p2', quantity: 3 }],
      PRODUCTS,
    )
    expect(cartSubtotal(lines)).toBe(500 * 2 + 20 * 3)
  })
})
