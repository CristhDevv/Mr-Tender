import { describe, it, expect } from 'vitest'
import { findMasterProduct, COLOMBIA_MASTER_CATALOG } from './colombia-products'

describe('Colombia Master Catalog', () => {
  it('should contain predefined popular Colombian products', () => {
    expect(COLOMBIA_MASTER_CATALOG.length).toBeGreaterThan(10)
    const jet = COLOMBIA_MASTER_CATALOG.find(p => p.name.includes('Chocolatina Jet'))
    expect(jet).toBeDefined()
    expect(jet?.barcode).toBe('7702001001018')
    expect(jet?.suggestedPrice).toBeGreaterThan(jet?.suggestedCost || 0)
  })

  it('should find master product by exact barcode', () => {
    const product = findMasterProduct('7702007001014')
    expect(product).toBeDefined()
    expect(product?.name).toContain('Coca-Cola')
  })

  it('should find master product trimming whitespace', () => {
    const product = findMasterProduct('  7702010001018  ')
    expect(product).toBeDefined()
    expect(product?.name).toContain('Arroz Diana')
  })

  it('should return undefined for unknown or empty barcode', () => {
    expect(findMasterProduct('')).toBeUndefined()
    expect(findMasterProduct('0000000000000')).toBeUndefined()
  })
})
