import { describe, it, expect } from 'vitest'
import {
  getColombiaDateString,
  getColombiaTimeString,
  getColombiaDayBoundsUTC,
  getColombiaRelativeDateString,
  isDateInRangeColombia,
  formatColombiaDateTime,
  COLOMBIA_TIMEZONE
} from './date-utils'

describe('Colombia Date and Time Utilities', () => {
  describe('getColombiaDateString - Critical Edge Cases around 7:00 PM', () => {
    it('handles 6:59 PM Colombia (23:59 UTC) -> Same Colombia Day', () => {
      const result = getColombiaDateString('2026-09-08T23:59:00.000Z')
      expect(result).toBe('2026-09-08')
    })

    it('handles 7:00 PM Colombia (00:00 UTC next day) -> Stays in Same Colombia Day (Sept 8)', () => {
      const result = getColombiaDateString('2026-09-09T00:00:00.000Z')
      expect(result).toBe('2026-09-08')
    })

    it('handles 7:01 PM Colombia (00:01 UTC next day) -> Stays in Same Colombia Day (Sept 8)', () => {
      const result = getColombiaDateString('2026-09-09T00:01:00.000Z')
      expect(result).toBe('2026-09-08')
    })

    it('handles 11:59:59 PM Colombia (04:59:59 UTC next day) -> Stays in Same Colombia Day (Sept 8)', () => {
      const result = getColombiaDateString('2026-09-09T04:59:59.999Z')
      expect(result).toBe('2026-09-08')
    })

    it('handles Exact Midnight Colombia (00:00:00 COT = 05:00:00 UTC) -> Starts New Colombia Day', () => {
      const result = getColombiaDateString('2026-09-09T05:00:00.000Z')
      expect(result).toBe('2026-09-09')
    })

    it('handles Exact Midnight Start of Sept 8 (00:00:00 COT = 05:00:00 UTC Sept 8) -> Sept 8', () => {
      const result = getColombiaDateString('2026-09-08T05:00:00.000Z')
      expect(result).toBe('2026-09-08')
    })

    it('handles 1 millisecond before Midnight Sept 8 (04:59:59.999 UTC Sept 8) -> Sept 7', () => {
      const result = getColombiaDateString('2026-09-08T04:59:59.999Z')
      expect(result).toBe('2026-09-07')
    })
  })

  describe('getColombiaTimeString - DIAN Compliance (HH:mm:ss-05:00)', () => {
    it('formats Colombia time with -05:00 offset regardless of server timezone', () => {
      // 7:30:15 PM COT = 00:30:15 UTC next day
      const timeStr = getColombiaTimeString('2026-09-09T00:30:15.000Z')
      expect(timeStr).toBe('19:30:15-05:00')
    })

    it('formats midnight Colombia time as 00:00:00-05:00', () => {
      const timeStr = getColombiaTimeString('2026-09-08T05:00:00.000Z')
      expect(timeStr).toBe('00:00:00-05:00')
    })

    it('formats late night Colombia time as 23:59:59-05:00', () => {
      const timeStr = getColombiaTimeString('2026-09-09T04:59:59.000Z')
      expect(timeStr).toBe('23:59:59-05:00')
    })
  })

  describe('getColombiaDayBoundsUTC', () => {
    it('generates exact UTC bounds for a given Colombia calendar day', () => {
      const bounds = getColombiaDayBoundsUTC('2026-09-08')
      expect(bounds.gte).toBe('2026-09-08T05:00:00.000Z')
      expect(bounds.lte).toBe('2026-09-09T04:59:59.999Z')
    })

    it('correctly encloses a sale made at 7:30 PM Colombia (2026-09-09T00:30:00Z)', () => {
      const bounds = getColombiaDayBoundsUTC('2026-09-08')
      const nightSaleTimestamp = '2026-09-09T00:30:00.000Z'
      expect(nightSaleTimestamp >= bounds.gte).toBe(true)
      expect(nightSaleTimestamp <= bounds.lte).toBe(true)
    })

    it('excludes sales from previous day or next day', () => {
      const bounds = getColombiaDayBoundsUTC('2026-09-08')
      const previousDayLateSale = '2026-09-08T04:59:59.000Z'
      const nextDayEarlySale = '2026-09-09T05:00:00.000Z'
      expect(previousDayLateSale >= bounds.gte).toBe(false)
      expect(nextDayEarlySale <= bounds.lte).toBe(false)
    })
  })

  describe('isDateInRangeColombia', () => {
    it('accurately evaluates date ranges using Colombia local time', () => {
      const saleAtNight = '2026-09-09T01:30:00.000Z'
      expect(isDateInRangeColombia(saleAtNight, '2026-09-08', '2026-09-08')).toBe(true)
      expect(isDateInRangeColombia(saleAtNight, '2026-09-09', '2026-09-09')).toBe(false)
    })
  })

  describe('getColombiaRelativeDateString', () => {
    it('shifts days correctly relative to base date', () => {
      const base = '2026-09-08T12:00:00.000Z'
      expect(getColombiaRelativeDateString(-7, base)).toBe('2026-09-01')
      expect(getColombiaRelativeDateString(1, base)).toBe('2026-09-09')
    })
  })
})
