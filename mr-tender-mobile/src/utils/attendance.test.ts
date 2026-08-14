import { describe, it, expect } from 'vitest'
import { calculateDistance, isWithinCheckingRange } from './attendance'

describe('calculateDistance', () => {
  it('should calculate distance in meters between two coordinates', () => {
    // Distance between two points close in Mexico City (approx 150m)
    const dist = calculateDistance(19.4326, -99.1332, 19.4336, -99.1332)
    expect(dist).toBeGreaterThan(100)
    expect(dist).toBeLessThan(120)
  })

  it('should return 0 for identical coordinates', () => {
    expect(calculateDistance(19.4326, -99.1332, 19.4326, -99.1332)).toBe(0)
  })
})

describe('isWithinCheckingRange', () => {
  it('should return true if employee is within range of the branch', () => {
    // 19.4326, -99.1332 vs 19.4330, -99.1332 is around 44 meters
    expect(isWithinCheckingRange(19.4326, -99.1332, 19.4330, -99.1332, 100)).toBe(true)
  })

  it('should return false if employee is outside range of the branch', () => {
    // 19.4326, -99.1332 vs 19.4400, -99.1332 is around 820 meters
    expect(isWithinCheckingRange(19.4326, -99.1332, 19.4400, -99.1332, 200)).toBe(false)
  })
})
