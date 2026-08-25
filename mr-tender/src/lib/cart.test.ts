import { describe, it, expect } from 'vitest'
import {
  calculateLineTotal,
  calculateCartTotals,
  calculateChange,
  calculateTaxBreakdown
} from './cart'

describe('calculateLineTotal', () => {
  it('should calculate base line total without discount', () => {
    expect(calculateLineTotal({ price: 10, quantity: 3, discount: 0 })).toBe(30)
  })

  it('should apply discount to line total correctly', () => {
    expect(calculateLineTotal({ price: 100, quantity: 2, discount: 10 })).toBe(180)
    expect(calculateLineTotal({ price: 50, quantity: 1, discount: 100 })).toBe(0)
  })

  it('should handle fractional quantities for weighed products (e.g. 0.75 kg)', () => {
    const line = calculateLineTotal({ price: 12000, quantity: 0.75, discount: 0 })
    expect(line).toBe(9000)
  })

  it('should prevent negative discounts or discounts over 100%', () => {
    expect(calculateLineTotal({ price: 100, quantity: 1, discount: -10 })).toBe(100)
    expect(calculateLineTotal({ price: 100, quantity: 1, discount: 150 })).toBe(0)
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

  it('should handle 100% global coupon or discount', () => {
    const items = [{ price: 5000, quantity: 2, discount: 0 }]
    const res = calculateCartTotals(items, 100)
    expect(res.subtotal).toBe(10000)
    expect(res.discountAmt).toBe(10000)
    expect(res.total).toBe(0)
  })
})

describe('calculateChange', () => {
  it('should calculate change when received amount is greater than total', () => {
    expect(calculateChange(50000, 32500)).toBe(17500)
  })

  it('should return 0 when received amount equals total', () => {
    expect(calculateChange(25000, 25000)).toBe(0)
  })

  it('should return 0 when received amount is less than total', () => {
    expect(calculateChange(10000, 25000)).toBe(0)
  })
})

describe('calculateTaxBreakdown', () => {
  it('should compute base and 19% IVA included accurately', () => {
    const items = [
      { price: 11900, quantity: 1, discount: 0, tax_rate: 19 }
    ]
    const breakdown = calculateTaxBreakdown(items, 19)
    expect(Math.round(breakdown.baseTotal)).toBe(10000)
    expect(Math.round(breakdown.taxTotal)).toBe(1900)
  })

  it('should handle tax-exempt (0% IVA) items', () => {
    const items = [
      { price: 5000, quantity: 2, discount: 0, tax_rate: 0 }
    ]
    const breakdown = calculateTaxBreakdown(items, 19)
    expect(breakdown.baseTotal).toBe(10000)
    expect(breakdown.taxTotal).toBe(0)
  })
})
