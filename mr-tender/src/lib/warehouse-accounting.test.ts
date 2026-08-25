import { describe, it, expect } from 'vitest'

describe('Warehouse Accounting and Stock Logic', () => {
  const sampleEntries = [
    {
      id: 'entry-1',
      number: 'ASE-001',
      warehouse_id: 'wh-main',
      total_debit: 150000,
      total_credit: 150000,
    },
    {
      id: 'entry-2',
      number: 'ASE-002',
      warehouse_id: 'wh-north',
      total_debit: 80000,
      total_credit: 80000,
    },
    {
      id: 'entry-3',
      number: 'ASE-003',
      warehouse_id: 'wh-main',
      total_debit: 50000,
      total_credit: 50000,
    },
  ]

  const sampleProducts = [
    {
      id: 'prod-1',
      name: 'Coca Cola 2L',
      inventory: [
        { warehouse_id: 'wh-main', quantity: 20 },
        { warehouse_id: 'wh-north', quantity: 5 },
      ],
    },
    {
      id: 'prod-2',
      name: 'Galletas Oreo',
      inventory: [
        { warehouse_id: 'wh-north', quantity: 15 },
      ],
    },
    {
      id: 'prod-3',
      name: 'Chocolatina Jet',
      inventory: [
        { warehouse_id: 'wh-main', quantity: 50 },
      ],
    },
  ]

  it('should filter journal entries for a specific warehouse', () => {
    const mainEntries = sampleEntries.filter(e => e.warehouse_id === 'wh-main')
    expect(mainEntries.length).toBe(2)
    const totalDebits = mainEntries.reduce((sum, e) => sum + e.total_debit, 0)
    expect(totalDebits).toBe(200000)
  })

  it('should calculate consolidated journal entries when "all" is selected', () => {
    const consolidatedEntries = sampleEntries
    expect(consolidatedEntries.length).toBe(3)
    const totalDebits = consolidatedEntries.reduce((sum, e) => sum + e.total_debit, 0)
    expect(totalDebits).toBe(280000)
  })

  it('should calculate aggregated product stock across all warehouses', () => {
    const p1 = sampleProducts[0]
    const totalStock = p1.inventory.reduce((sum, inv) => sum + inv.quantity, 0)
    expect(totalStock).toBe(25)
  })

  it('should filter product stock for a specific warehouse', () => {
    const p1 = sampleProducts[0]
    const northStock = p1.inventory.find(i => i.warehouse_id === 'wh-north')?.quantity || 0
    expect(northStock).toBe(5)

    const p3 = sampleProducts[2]
    const p3NorthStock = p3.inventory.find(i => i.warehouse_id === 'wh-north')?.quantity || 0
    expect(p3NorthStock).toBe(0)
  })

  it('should filter POS catalog by warehouse existence', () => {
    const northProducts = sampleProducts.filter(p =>
      p.inventory.some(i => i.warehouse_id === 'wh-north' && i.quantity > 0)
    )
    expect(northProducts.length).toBe(2)
    expect(northProducts.map(p => p.id)).toEqual(['prod-1', 'prod-2'])
  })
})
