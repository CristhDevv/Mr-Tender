import { describe, it, expect } from 'vitest'
import {
  calculateArrangementPricing,
  STANDARD_STEMS,
  STANDARD_BASES
} from './floral-engine'

describe('Florist Arrangement Engine', () => {
  it('should have standard export flowers and bases', () => {
    expect(STANDARD_STEMS.length).toBeGreaterThan(6)
    expect(STANDARD_BASES.length).toBeGreaterThan(3)
  })

  it('should accurately calculate floral bouquet cost and profit margins', () => {
    const rosa = STANDARD_STEMS.find(s => s.id === 'rosa_exportacion')!
    const gypsophila = STANDARD_STEMS.find(s => s.id === 'gypsophila_lluvia')!
    const eucalipto = STANDARD_STEMS.find(s => s.id === 'eucalipto_cinerea')!
    const caja = STANDARD_BASES.find(b => b.id === 'caja_cilindrica')!

    const result = calculateArrangementPricing(caja, [
      { stem: rosa, quantity: 18 },       // 18 rosas ($4,500 = $81,000)
      { stem: gypsophila, quantity: 4 },  // 4 lluvia ($3,000 = $12,000)
      { stem: eucalipto, quantity: 4 }    // 4 eucalipto ($2,200 = $8,800)
    ])

    expect(result.totalStemsCount).toBe(26)
    expect(result.stemsTotalRevenue).toBe(18 * 4500 + 4 * 3000 + 4 * 2200)
    expect(result.totalSalePrice).toBeGreaterThan(120000)
    expect(result.profitMarginPercent).toBeGreaterThan(40)
  })
})
