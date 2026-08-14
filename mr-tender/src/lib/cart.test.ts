import { describe, it, expect } from 'vitest'
import { calculateLineTotal, calculateCartTotals } from './cart'

describe('calculateLineTotal', () => {
  it('should calculate base line total without discount', () => {
    expect(calculateLineTotal({ price: 10, quantity: 3, discount: 0 })).toBe(30)
  })

  it('should apply discount to line total correctly', () => {
    expect(calculateLineTotal({ price: 100, quantity: 2, discount: 10 })).toBe(180)
    expect(calculateLineTotal({ price: 50, quantity: 1, discount: 100 })).toBe(0)
  })
})

describe('calculateCartTotals', () => {
  it('should calculate total for empty cart', () => {
    const res = calculateCartTotals([])
    expect(res.subtotal).toBe(0)
    expect(res.discountAmt).toBe(0)
    expect(res.total).toBe(0)
  })

  it('should sum multiple line items correctly', () => {
    const items = [
      { price: 10, quantity: 2, discount: 0 }, // 20
      { price: 20, quantity: 1, discount: 50 } // 10
    ]
    const res = calculateCartTotals(items, 10) // 10% global discount on 30
    expect(res.subtotal).toBe(30)
    expect(res.discountAmt).toBe(3)
    expect(res.total).toBe(27)
  })
})
