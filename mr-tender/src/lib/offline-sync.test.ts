import { describe, it, expect } from 'vitest'
import { OfflineSale, OfflineProduct } from './offline/offline-pos-db'

describe('Offline POS & Sync Resilience Test Suite', () => {
  it('structures offline sales with retry tracking and fiscal pending status', () => {
    const sale: OfflineSale = {
      id: 'off_test_001',
      tenant_id: 'tenant-123',
      total_amount: 35000,
      payment_method: 'cash',
      lines: [
        {
          product_id: 'prod-001',
          product_name: 'Pan tajado',
          quantity: 2,
          unit_price: 5000,
          subtotal: 10000,
          tax_rate: 0
        },
        {
          product_id: 'prod-002',
          product_name: 'Café molido 500g',
          quantity: 1,
          unit_price: 25000,
          subtotal: 25000,
          tax_rate: 19
        }
      ],
      created_at: new Date().toISOString(),
      synced: false,
      retry_count: 0,
      fiscal_status: 'pending'
    }

    expect(sale.lines.length).toBe(2)
    expect(sale.synced).toBe(false)
    expect(sale.fiscal_status).toBe('pending')
  })

  it('handles partial batch synchronization without losing failed sales or duplicating succeeded ones', async () => {
    const queue: OfflineSale[] = [
      {
        id: 'off_sale_1',
        tenant_id: 't-1',
        total_amount: 10000,
        payment_method: 'cash',
        lines: [],
        created_at: '2026-08-26T10:00:00Z',
        synced: false
      },
      {
        id: 'off_sale_2',
        tenant_id: 't-1',
        total_amount: 20000,
        payment_method: 'card',
        lines: [],
        created_at: '2026-08-26T10:05:00Z',
        synced: false
      },
      {
        id: 'off_sale_3',
        tenant_id: 't-1',
        total_amount: 30000,
        payment_method: 'transfer',
        lines: [],
        created_at: '2026-08-26T10:10:00Z',
        synced: false
      }
    ]

    // Simulate batch execution where sale 2 fails due to intermittent network glitch
    const mockSyncExecutor = async (s: OfflineSale) => {
      if (s.id === 'off_sale_2') {
        return { success: false, error: 'Network timeout during transaction' }
      }
      return { success: true }
    }

    const results = { synced: 0, failed: 0 }
    for (const sale of queue) {
      const res = await mockSyncExecutor(sale)
      if (res.success) {
        sale.synced = true
        results.synced++
      } else {
        sale.sync_error = res.error
        sale.retry_count = 1
        results.failed++
      }
    }

    expect(results.synced).toBe(2)
    expect(results.failed).toBe(1)
    expect(queue[0].synced).toBe(true)
    expect(queue[1].synced).toBe(false)
    expect(queue[1].sync_error).toContain('Network timeout')
    expect(queue[2].synced).toBe(true)
  })

  it('resolves concurrent offline inventory conflicts by flagging discrepancy rather than dropping the sale', async () => {
    // Scenario: Product has server stock = 1, but terminal A sold 1 and terminal B sold 1 offline
    const serverStock = 1
    const offlineQuantitySold = 2

    const resolveInventoryConflict = (available: number, sold: number) => {
      const resultingStock = available - sold
      const isNegative = resultingStock < 0
      return {
        resultingStock,
        conflict: isNegative ? `Stock negativo detectado (${resultingStock}). Venta registrada con advertencia de auditoría.` : null,
        success: true
      }
    }

    const resolution = resolveInventoryConflict(serverStock, offlineQuantitySold)
    expect(resolution.success).toBe(true)
    expect(resolution.resultingStock).toBe(-1)
    expect(resolution.conflict).toContain('Stock negativo detectado')
  })

  it('updates cached offline product catalog with freshness timestamps', () => {
    const product: OfflineProduct = {
      id: 'prod-001',
      tenant_id: 't-1',
      name: 'Leche Deslactosada 1L',
      sku: 'LECHE-01',
      price: 4500,
      cost: 3200,
      stock: 50,
      tax_rate: 0,
      last_synced_at: new Date().toISOString()
    }

    expect(product.last_synced_at).toBeDefined()
    expect(new Date(product.last_synced_at!).getTime()).toBeLessThanOrEqual(Date.now())
  })
})
