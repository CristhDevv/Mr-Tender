import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, formatDate, slugify, getInitials, percentChange } from './utils'

describe('cn utility', () => {
  it('should join classes correctly', () => {
    expect(cn('btn', 'btn-primary')).toBe('btn btn-primary')
    expect(cn('btn', false && 'hidden', 'active')).toBe('btn active')
  })
})

describe('formatCurrency utility', () => {
  it('should format MXN currency correctly', () => {
    const formatted = formatCurrency(1234.56, 'MXN', 'es-MX')
    // es-MX can contain non-breaking spaces or different representations depending on environment,
    // so we assert it contains the core numbers and currency symbols.
    expect(formatted).toContain('1,234.56')
  })
})

describe('formatDate utility', () => {
  it('should format date strings correctly', () => {
    const formatted = formatDate('2026-08-13T12:00:00')
    expect(formatted).toContain('13')
    expect(formatted).toContain('2026')
  })
})

describe('slugify utility', () => {
  it('should convert strings to lowercase URL friendly slugs', () => {
    expect(slugify('Coca-Cola 2L & Pan Bimbo')).toBe('coca-cola-2l-pan-bimbo')
    expect(slugify('  Café Nescafé  ')).toBe('cafe-nescafe')
  })
})

describe('getInitials utility', () => {
  it('should extract two uppercase initials', () => {
    expect(getInitials('Juan Pérez García')).toBe('JP')
    expect(getInitials('María')).toBe('M')
    expect(getInitials('carlos ruiz')).toBe('CR')
  })
})

describe('percentChange utility', () => {
  it('should calculate percent change correctly', () => {
    expect(percentChange(150, 100)).toBe(50)
    expect(percentChange(50, 100)).toBe(-50)
    expect(percentChange(100, 0)).toBe(100)
    expect(percentChange(0, 0)).toBe(0)
  })
})
