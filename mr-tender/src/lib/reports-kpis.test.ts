import { describe, it, expect } from 'vitest'
import {
  getColombiaDateString,
  getColombiaDayBoundsUTC,
  getColombiaRelativeDateString,
  isDateInRangeColombia
} from './date-utils'
import { roundCurrency, safePercentage } from './finance-math'

describe('Reports, KPIs & Timezone Filtering Audit Tests', () => {
  describe('KPIs and Customer metrics exclusion of cancelled sales', () => {
    it('accurately counts uniqueCustomers excluding cancelled sales', () => {
      const salesMock = [
        { id: '1', number: 'V-001', customer_name: 'Cliente Activo', total: 50000, status: 'completed' },
        { id: '2', number: 'V-002', customer_name: 'Cliente Anulado A', total: 25000, status: 'cancelled' },
        { id: '3', number: 'V-003', customer_name: 'Cliente Anulado B', total: 23000, status: 'cancelled' }
      ]

      const validSales = salesMock.filter(s => s.status !== 'cancelled')
      const totalVolume = validSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0)
      const validCount = validSales.length
      const avgTicket = validCount > 0 ? Math.round(totalVolume / validCount) : 0
      const uniqueCustomers = new Set(validSales.map(s => s.customer_name)).size

      expect(totalVolume).toBe(50000)
      expect(validCount).toBe(1)
      expect(avgTicket).toBe(50000)
      expect(uniqueCustomers).toBe(1) // Not 3
    })

    it('returns 0 uniqueCustomers and 0 volume when all sales are cancelled', () => {
      const allCancelledMock = [
        { id: '1', number: 'V-001', customer_name: 'Cliente A', total: 25000, status: 'cancelled' },
        { id: '2', number: 'V-002', customer_name: 'Cliente B', total: 23000, status: 'cancelled' }
      ]

      const validSales = allCancelledMock.filter(s => s.status !== 'cancelled')
      const totalVolume = validSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0)
      const validCount = validSales.length
      const avgTicket = validCount > 0 ? Math.round(totalVolume / validCount) : 0
      const uniqueCustomers = new Set(validSales.map(s => s.customer_name)).size

      expect(totalVolume).toBe(0)
      expect(validCount).toBe(0)
      expect(avgTicket).toBe(0)
      expect(uniqueCustomers).toBe(0)
    })
  })

  describe('PnL Metrics Calculation', () => {
    it('computes gross sales, COGS and margins accurately', () => {
      const activeSales = [
        {
          id: '1',
          total: 100000,
          discount_amount: 5000,
          sale_items: [
            { quantity: 2, unit_price: 30000, cost_price: 20000, total: 60000 },
            { quantity: 1, unit_price: 40000, cost_price: 25000, total: 40000 }
          ]
        }
      ]

      const grossSales = roundCurrency(activeSales.reduce((acc, s) => acc + Number(s.total || 0), 0))
      const discounts = roundCurrency(activeSales.reduce((acc, s) => acc + Number(s.discount_amount || 0), 0))
      const netSales = grossSales

      let costOfGoods = 0
      activeSales.forEach(s => {
        s.sale_items?.forEach(item => {
          costOfGoods += Number(item.cost_price) * Number(item.quantity)
        })
      })
      costOfGoods = roundCurrency(costOfGoods) // 2*20000 + 1*25000 = 65000
      const grossProfit = roundCurrency(netSales - costOfGoods) // 100000 - 65000 = 35000
      const marginPct = safePercentage(grossProfit, netSales, 1)

      expect(grossSales).toBe(100000)
      expect(discounts).toBe(5000)
      expect(costOfGoods).toBe(65000)
      expect(grossProfit).toBe(35000)
      expect(marginPct).toBe(35)
    })
  })

  describe('Colombia Timezone Day Boundary & Reports Aggregation', () => {
    it('includes night sales (e.g. 7:30 PM COT) within today calendar bounds', () => {
      const boundsToday = getColombiaDayBoundsUTC('2026-09-08')
      
      // Morning sale: 8:00 AM COT (13:00 UTC)
      const morningSale = '2026-09-08T13:00:00.000Z'
      // Evening sale: 7:30 PM COT (00:30 UTC Sept 9)
      const eveningSale = '2026-09-09T00:30:00.000Z'
      // Late night sale: 11:45 PM COT (04:45 UTC Sept 9)
      const lateNightSale = '2026-09-09T04:45:00.000Z'
      // Next day early sale: 6:00 AM COT Sept 9 (11:00 UTC Sept 9)
      const nextDaySale = '2026-09-09T11:00:00.000Z'

      expect(morningSale >= boundsToday.gte && morningSale <= boundsToday.lte).toBe(true)
      expect(eveningSale >= boundsToday.gte && eveningSale <= boundsToday.lte).toBe(true)
      expect(lateNightSale >= boundsToday.gte && lateNightSale <= boundsToday.lte).toBe(true)
      expect(nextDaySale >= boundsToday.gte && nextDaySale <= boundsToday.lte).toBe(false)
    })

    it('filters sales in reports using isDateInRangeColombia', () => {
      const eveningSale = '2026-09-09T00:30:00.000Z' // 7:30 PM COT Sept 8
      expect(isDateInRangeColombia(eveningSale, '2026-09-08', '2026-09-08')).toBe(true)
      expect(isDateInRangeColombia(eveningSale, '2026-09-09', '2026-09-09')).toBe(false)
    })
  })
})
