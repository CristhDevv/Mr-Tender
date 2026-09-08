import { describe, it, expect } from 'vitest'
import {
  calculatePartySurpriseKit,
  STANDARD_CANDY_CATALOG
} from './candy-engine'

describe('Candy & Party Kit Calculation Engine', () => {
  it('should have standard Colombian candy and confectionery items', () => {
    expect(STANDARD_CANDY_CATALOG.length).toBeGreaterThan(5)
    const jet = STANDARD_CANDY_CATALOG.find(c => c.id === 'chocolatina_jet')
    expect(jet).toBeDefined()
    expect(jet!.heatSensitive).toBe(true)
  })

  it('should calculate party surprise kit for 20 kids with package requirements', () => {
    const bonbon = STANDARD_CANDY_CATALOG.find(c => c.id === 'bon_bon_bum')!
    const frunas = STANDARD_CANDY_CATALOG.find(c => c.id === 'frunas_surtidas')!
    const jet = STANDARD_CANDY_CATALOG.find(c => c.id === 'chocolatina_jet')!

    const result = calculatePartySurpriseKit(20, [
      { candy: bonbon, quantityPerKid: 1 },
      { candy: frunas, quantityPerKid: 2 },
      { candy: jet, quantityPerKid: 1 }
    ], true, 35000)

    expect(result.kidsCount).toBe(20)
    expect(result.totalItemsCount).toBe(20 * (1 + 2 + 1)) // 80 pieces
    expect(result.totalKitPrice).toBeGreaterThan(50000)
    expect(result.bundleDiscountPercent).toBe(5) // 5% discount for 20 kids
  })
})
