import { describe, it, expect } from 'vitest'
import { calculateCarcassYield, SPECIES_CONFIGS } from './carcass-yield'

describe('Butchery Carcass Yield Engine', () => {
  it('should have standard species configurations defined', () => {
    expect(SPECIES_CONFIGS.beef).toBeDefined()
    expect(SPECIES_CONFIGS.pork).toBeDefined()
    expect(SPECIES_CONFIGS.chicken).toBeDefined()
    expect(SPECIES_CONFIGS.lamb).toBeDefined()
    expect(SPECIES_CONFIGS.beef.standardCuts.length).toBeGreaterThan(10)
  })

  it('should accurately calculate beef carcass breakdown and preserve mass balance', () => {
    const carcassWeight = 240 // 240 kg
    const carcassCost = 3600000 // $3.6M COP ($15,000 COP / kg avg)
    
    const result = calculateCarcassYield('beef', carcassWeight, carcassCost)

    expect(result.carcassWeightKg).toBe(240)
    expect(result.totalCalculatedWeightKg).toBeCloseTo(240, 1)
    expect(result.totalCalculatedCost).toBeCloseTo(carcassCost, -2) // Within rounding tolerance
    expect(result.cuts.length).toBe(SPECIES_CONFIGS.beef.standardCuts.length)

    // Lomo Fino (premium cut) should have higher unit cost than carcass average
    const lomo = result.cuts.find(c => c.cutId === 'lomo_fino')
    expect(lomo).toBeDefined()
    expect(lomo!.unitCostPerKg).toBeGreaterThan(result.carcassAvgCostPerKg)
    expect(lomo!.suggestedSalePricePerKg).toBeGreaterThan(lomo!.unitCostPerKg)

    // Bones / Hueso should have much lower unit cost than carcass average
    const hueso = result.cuts.find(c => c.cutId === 'hueso_blanco')
    expect(hueso).toBeDefined()
    expect(hueso!.unitCostPerKg).toBeLessThan(result.carcassAvgCostPerKg)

    // Total expected revenue should generate positive gross profit
    expect(result.totalExpectedRevenue).toBeGreaterThan(carcassCost)
    expect(result.totalExpectedProfit).toBeGreaterThan(0)
    expect(result.overallProfitMarginPercent).toBeGreaterThan(20)
  })

  it('should support pork breakdown and custom yield percentages', () => {
    const carcassWeight = 100 // 100 kg
    const carcassCost = 1200000 // $1.2M COP ($12,000 / kg)

    // Custom yield with more tocino/chicharron
    const customYields = {
      tocino_panceta: 20.0
    }

    const result = calculateCarcassYield('pork', carcassWeight, carcassCost, customYields)

    expect(result.species).toBe('pork')
    expect(result.totalCalculatedWeightKg).toBeCloseTo(100, 1)
    const panceta = result.cuts.find(c => c.cutId === 'tocino_panceta')
    expect(panceta).toBeDefined()
    expect(panceta!.weightKg).toBeGreaterThan(15)
  })
})
