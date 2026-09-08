import { describe, it, expect } from 'vitest'
import {
  calculateDailyProduceShrinkage,
  STANDARD_PRODUCE_CATALOG
} from './shrinkage-engine'

describe('Greengrocer & Produce Shrinkage Engine', () => {
  it('should have standard Colombian produce items with PLU codes', () => {
    expect(STANDARD_PRODUCE_CATALOG.length).toBeGreaterThan(10)
    const tomato = STANDARD_PRODUCE_CATALOG.find(p => p.id === 'tomate_chonto')
    expect(tomato).toBeDefined()
    expect(tomato!.pluCode).toBe('4022')
    expect(tomato!.salePriceGrade2PerKg).toBeLessThan(tomato!.salePriceGrade1PerKg)
  })

  it('should accurately calculate produce waste and salvaged revenue from 2nd grade reclassification', () => {
    const tomato = STANDARD_PRODUCE_CATALOG.find(p => p.id === 'tomate_chonto')!
    const log = calculateDailyProduceShrinkage(
      tomato,
      100, // 100 kg initial
      85,  // 85 kg sold as Grade 1 ($4,800/kg)
      5,   // 5 kg rotten/discarded ($2,800 cost loss)
      10   // 10 kg reclassified to Grade 2 ($2,500/kg)
    )

    expect(log.wasteCostLoss).toBe(5 * 2800) // $14,000 COP
    expect(log.salvagedRevenue).toBe(10 * 2500) // $25,000 COP
    expect(log.effectiveMarginPercent).toBeGreaterThan(25)
  })
})
