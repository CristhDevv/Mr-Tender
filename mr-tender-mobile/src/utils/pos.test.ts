import { describe, it, expect } from 'vitest'
import { calculateMobileCartTotal, formatMobileCurrency } from './pos'

describe('calculateMobileCartTotal', () => {
  it('should sum cart item totals correctly', () => {
    const items = [
      { price: 15.5, quantity: 2 }, // 31
      { price: 10, quantity: 3 }    // 30
    ]
    expect(calculateMobileCartTotal(items)).toBe(61)
  })

  it('should return 0 for empty cart', () => {
    expect(calculateMobileCartTotal([])).toBe(0)
  })
})

describe('formatMobileCurrency', () => {
  it('should format numbers to monetary representation', () => {
    expect(formatMobileCurrency(150)).toBe('$150.00')
    expect(formatMobileCurrency(9.99)).toBe('$9.99')
  })
})
