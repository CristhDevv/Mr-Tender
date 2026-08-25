import { describe, it, expect } from 'vitest'
import {
  calculateNITVerificationDigit,
  calculateCUFE,
  calculateCUDE,
  calculateSoftwareSecurityCode,
  formatDianAmount
} from './cufe'

describe('DIAN Cryptographic Engine (cufe.ts)', () => {
  it('correctly calculates NIT verification digit (Módulo 11)', () => {
    // Known Colombian NIT verification digits:
    // DIAN NIT: 800197268 -> DV 4
    expect(calculateNITVerificationDigit('800197268')).toBe('4')
    // Ecopetrol: 899999068 -> DV 1
    expect(calculateNITVerificationDigit('899999068')).toBe('1')
    // Bancolombia: 890903938 -> DV 8
    expect(calculateNITVerificationDigit('890903938')).toBe('8')
    // Formatted strings with dashes or spaces
    expect(calculateNITVerificationDigit('900.123.456')).toBe(calculateNITVerificationDigit('900123456'))
  })

  it('formats amounts to 2 fixed decimals', () => {
    expect(formatDianAmount(100)).toBe('100.00')
    expect(formatDianAmount(1234.5)).toBe('1234.50')
    expect(formatDianAmount(99.999)).toBe('100.00')
    expect(formatDianAmount(0)).toBe('0.00')
  })

  it('calculates CUFE (SHA-384) according to DIAN Anexo Técnico 1.9', () => {
    const { cufe, rawString } = calculateCUFE({
      numFac: 'SETP990000001',
      fecFac: '2026-08-25',
      horFac: '09:30:00-05:00',
      valFac: 100000,
      codImp1: '01',
      valImp1: 19000,
      codImp2: '04',
      valImp2: 0,
      codImp3: '03',
      valImp3: 0,
      valTot: 119000,
      nitOFE: '901234567',
      numAdq: '222222222222',
      claveTecnica: 'fc8eac422eba16e22ffd8c6f94b3f40a6e381160407',
      tipoAmbiente: '2'
    })

    expect(rawString).toBe(
      'SETP9900000012026-08-2509:30:00-05:00100000.000119000.00040.00030.00119000.00901234567222222222222fc8eac422eba16e22ffd8c6f94b3f40a6e3811604072'
    )
    expect(cufe).toHaveLength(96) // SHA-384 in hex is 96 chars
    expect(cufe).toMatch(/^[0-9a-f]{96}$/)
  })

  it('calculates CUDE (SHA-384) for credit notes and POS documents', () => {
    const { cude, rawString } = calculateCUDE({
      numDoc: 'NC-001',
      fecDoc: '2026-08-25',
      horDoc: '10:15:00-05:00',
      valDoc: 50000,
      codImp1: '01',
      valImp1: 9500,
      codImp2: '04',
      valImp2: 0,
      codImp3: '03',
      valImp3: 0,
      valTot: 59500,
      nitOFE: '901234567',
      numAdq: '1020304050',
      pinSoftware: '12345',
      tipoAmbiente: '2'
    })

    expect(rawString).toBe(
      'NC-0012026-08-2510:15:00-05:0050000.00019500.00040.00030.0059500.009012345671020304050123452'
    )
    expect(cude).toHaveLength(96)
    expect(cude).toMatch(/^[0-9a-f]{96}$/)
  })

  it('calculates SoftwareSecurityCode (SHA-384)', () => {
    const code = calculateSoftwareSecurityCode('soft-uuid-123', '12345', 'SETP990000001')
    expect(code).toHaveLength(96)
    expect(code).toMatch(/^[0-9a-f]{96}$/)
  })
})
