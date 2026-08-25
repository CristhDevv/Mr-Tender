import { describe, it, expect } from 'vitest'

interface MockProduct {
  id: string
  name: string
  sku: string
  barcode?: string
  price: number
  stock: number
}

function filterPOSProducts(products: MockProduct[], query: string): MockProduct[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.sku.toLowerCase().includes(q) ||
    (p.barcode ? p.barcode.toLowerCase().includes(q) : false)
  )
}

describe('POS Product Search Algorithm', () => {
  const sampleCatalog: MockProduct[] = [
    { id: '1', name: 'Arroz Diana 1kg', sku: 'ARR-DIA-01', barcode: '7702010001018', price: 4600, stock: 25 },
    { id: '2', name: 'Aceite Premier 1L', sku: 'ACE-PRE-01', barcode: '7702012001016', price: 10500, stock: 12 },
    { id: '3', name: 'Café Sello Rojo 500g', sku: 'CAF-SEL-01', barcode: '7702020001017', price: 17800, stock: 8 },
    { id: '4', name: 'Pan Bimbo Blanco', sku: 'PAN-BIM-01', price: 8200, stock: 15 }
  ]

  it('should return empty array when query is empty or whitespace', () => {
    expect(filterPOSProducts(sampleCatalog, '')).toEqual([])
    expect(filterPOSProducts(sampleCatalog, '   ')).toEqual([])
  })

  it('should find products by partial name case-insensitively', () => {
    const results = filterPOSProducts(sampleCatalog, 'arroz')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('1')

    const cafeResults = filterPOSProducts(sampleCatalog, 'CAFÉ')
    expect(cafeResults).toHaveLength(1)
  })

  it('should find products by SKU', () => {
    const results = filterPOSProducts(sampleCatalog, 'ACE-PRE')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Aceite Premier 1L')
  })

  it('should find products by barcode', () => {
    const results = filterPOSProducts(sampleCatalog, '7702020001017')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Café Sello Rojo 500g')
  })

  it('should return empty list when no matches are found', () => {
    const results = filterPOSProducts(sampleCatalog, 'producto inexistente')
    expect(results).toHaveLength(0)
  })
})
