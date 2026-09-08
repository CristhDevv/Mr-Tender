import { describe, it, expect } from 'vitest'
import {
  roundCurrency,
  roundCOP,
  safePercentage,
  calculateLineFinancials,
  calculateInvoiceTotals,
  calculateChange,
  calculateCashDrawerSummary,
  calculateCashDiscrepancyThreshold,
  validateCashDiscrepancy
} from './finance-math'

describe('finance-math: Precision and Rounding', () => {
  it('should eliminate JavaScript floating-point drift (0.1 + 0.2)', () => {
    expect(0.1 + 0.2).not.toBe(0.3) // JS default behavior
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3)
  })

  it('should round correctly with EPSILON correction', () => {
    expect(roundCurrency(1.005, 2)).toBe(1.01)
    expect(roundCurrency(12500.555, 2)).toBe(12500.56)
  })

  it('should round COP to clean integers', () => {
    expect(roundCOP(12500.49)).toBe(12500)
    expect(roundCOP(12500.51)).toBe(12501)
  })

  it('should handle safe percentage calculations without division by zero', () => {
    expect(safePercentage(50, 0)).toBe(0)
    expect(safePercentage(25, 100)).toBe(25)
    expect(safePercentage(1, 3, 2)).toBe(33.33)
  })
})

describe('finance-math: Line Item Financials', () => {
  it('should calculate standard line financials with IVA 19%', () => {
    const res = calculateLineFinancials({
      price: 11900,
      quantity: 2,
      discountPercent: 0,
      taxRate: 19,
      costPrice: 5000
    })

    expect(res.grossTotal).toBe(23800)
    expect(res.netLineTotal).toBe(23800)
    expect(res.taxBase).toBe(20000)
    expect(res.taxAmount).toBe(3800)
    expect(res.taxBase + res.taxAmount).toBe(23800)
    expect(res.cogs).toBe(10000)
    expect(res.lineProfit).toBe(13800)
    expect(res.lineMarginPercent).toBe(58)
  })

  it('should apply line discount correctly', () => {
    const res = calculateLineFinancials({
      price: 10000,
      quantity: 1,
      discountPercent: 10,
      taxRate: 19,
      costPrice: 4000
    })

    expect(res.grossTotal).toBe(10000)
    expect(res.discountAmount).toBe(1000)
    expect(res.netLineTotal).toBe(9000)
    expect(res.taxBase + res.taxAmount).toBe(9000)
    expect(res.lineProfit).toBe(5000)
  })

  it('should switch to wholesale pricing when minimum quantity is reached', () => {
    const resRetail = calculateLineFinancials({
      price: 10000,
      wholesalePrice: 8500,
      wholesaleMinQty: 6,
      quantity: 5
    })
    expect(resRetail.isWholesale).toBe(false)
    expect(resRetail.unitPrice).toBe(10000)
    expect(resRetail.netLineTotal).toBe(50000)

    const resWholesale = calculateLineFinancials({
      price: 10000,
      wholesalePrice: 8500,
      wholesaleMinQty: 6,
      quantity: 6
    })
    expect(resWholesale.isWholesale).toBe(true)
    expect(resWholesale.unitPrice).toBe(8500)
    expect(resWholesale.netLineTotal).toBe(51000)
  })

  it('should calculate weighted items accurately with fractional quantities', () => {
    const res = calculateLineFinancials({
      price: 14800,
      quantity: 0.745, // 745 grams of cheese/meat
      taxRate: 0,
      costPrice: 9500
    })

    expect(res.grossTotal).toBe(11026)
    expect(res.netLineTotal).toBe(11026)
    expect(res.cogs).toBe(7077.5)
    expect(res.lineProfit).toBe(3948.5)
  })
})

describe('finance-math: Invoice Totals & Multi-Rate Tax Aggregation', () => {
  it('should aggregate multi-rate taxes (0%, 5%, 19%) perfectly without penny leaks', () => {
    const items = [
      { price: 11900, quantity: 1, taxRate: 19, costPrice: 5000 },
      { price: 10500, quantity: 1, taxRate: 5, costPrice: 6000 },
      { price: 5000, quantity: 2, taxRate: 0, costPrice: 2000 }
    ]

    const totals = calculateInvoiceTotals(items, 0)

    expect(totals.grossSubtotal).toBe(32400)
    expect(totals.payableAmount).toBe(32400)
    expect(totals.taxBreakdown.iva19.taxBase).toBe(10000)
    expect(totals.taxBreakdown.iva19.taxAmount).toBe(1900)
    expect(totals.taxBreakdown.iva5.taxBase).toBe(10000)
    expect(totals.taxBreakdown.iva5.taxAmount).toBe(500)
    expect(totals.taxBreakdown.iva0.taxBase).toBe(10000)
    expect(totals.taxBreakdown.iva0.taxAmount).toBe(0)

    expect(totals.taxAmount).toBe(2400)
    expect(totals.taxExclusiveAmount).toBe(30000)
    expect(totals.taxExclusiveAmount + totals.taxAmount).toBe(totals.payableAmount)
  })

  it('should apply global discounts proportionally and maintain total integrity', () => {
    const items = [
      { price: 20000, quantity: 1, taxRate: 0, costPrice: 10000 },
      { price: 30000, quantity: 1, taxRate: 0, costPrice: 15000 }
    ]

    const totals = calculateInvoiceTotals(items, 10) // 10% global discount

    expect(totals.grossSubtotal).toBe(50000)
    expect(totals.globalDiscountAmount).toBe(5000)
    expect(totals.payableAmount).toBe(45000)
    expect(totals.cogsTotal).toBe(25000)
    expect(totals.grossProfitTotal).toBe(20000)
    expect(totals.overallMarginPercent).toBe(44.4)
  })
})

describe('finance-math: Change Calculation', () => {
  it('should calculate change safely', () => {
    expect(calculateChange(50000, 32400)).toBe(17600)
    expect(calculateChange(32400, 32400)).toBe(0)
    expect(calculateChange(20000, 32400)).toBe(0)
  })
})

describe('finance-math: Cash Drawer Arqueo Summary', () => {
  it('should correctly isolate physical cash from digital payment methods', () => {
    const summary = calculateCashDrawerSummary({
      openingAmount: 100000,
      cashSales: 250000,
      cashAbonos: 50000,
      cashManualInflows: 20000,
      cashManualOutflows: 30000,
      cashRefunds: 15000,
      cardSales: 180000,
      nequiSales: 95000,
      daviplataSales: 45000,
      transferSales: 120000,
      creditSales: 80000
    })

    // Expected Cash Drawer = 100000 + 250000 + 50000 + 20000 - 30000 - 15000 = 375000
    expect(summary.expectedDrawerCash).toBe(375000)

    // Digital Sales = 180000 + 95000 + 45000 + 120000 = 440000
    expect(summary.electronicSales.total).toBe(440000)

    // Total Revenue = 250000 (cash) + 440000 (electronic) + 80000 (credit) = 770000
    expect(summary.totalRevenue).toBe(770000)
  })
})

describe('finance-math: Cash Discrepancy Threshold & Validation (Paso 3)', () => {
  it('should calculate threshold as max($5.000, 2% of expected)', () => {
    // Low volume box: $100.000 expected -> 2% is $2.000 -> Threshold is $5.000
    expect(calculateCashDiscrepancyThreshold(100000)).toBe(5000)

    // High volume box: $1.000.000 expected -> 2% is $20.000 -> Threshold is $20.000
    expect(calculateCashDiscrepancyThreshold(1000000)).toBe(20000)

    // Edge case: $0 expected -> Threshold is $5.000
    expect(calculateCashDiscrepancyThreshold(0)).toBe(5000)
  })

  it('should pass without requiring justification when cash drawer is exact ($0 diff)', () => {
    const res = validateCashDiscrepancy(100000, 100000, '')
    expect(res.difference).toBe(0)
    expect(res.isDiscrepancySignificant).toBe(false)
    expect(res.requiresJustification).toBe(false)
    expect(res.error).toBeUndefined()
  })

  it('should pass without requiring justification when difference is within threshold (e.g. $3.000 <= $5.000)', () => {
    const res = validateCashDiscrepancy(100000, 103000, '')
    expect(res.difference).toBe(3000)
    expect(res.isDiscrepancySignificant).toBe(false)
    expect(res.requiresJustification).toBe(false)
    expect(res.error).toBeUndefined()
  })

  it('should block closing when discrepancy exceeds threshold and justification is empty', () => {
    const res = validateCashDiscrepancy(100000, 85000, '') // Faltante de $15.000
    expect(res.difference).toBe(-15000)
    expect(res.absoluteDiff).toBe(15000)
    expect(res.threshold).toBe(5000)
    expect(res.isDiscrepancySignificant).toBe(true)
    expect(res.requiresJustification).toBe(true)
    expect(res.isJustificationValid).toBe(false)
    expect(res.error).toContain('supera el umbral permitido')
  })

  it('should block closing when justification is too short (< 10 chars)', () => {
    const res = validateCashDiscrepancy(100000, 85000, 'faltaron') // 8 chars
    expect(res.isDiscrepancySignificant).toBe(true)
    expect(res.isJustificationValid).toBe(false)
    expect(res.error).toBeDefined()
  })

  it('should allow closing when discrepancy exceeds threshold but valid justification (>= 10 chars) is provided', () => {
    const res = validateCashDiscrepancy(100000, 85000, 'Billete falso retenido en turno') // 32 chars
    expect(res.isDiscrepancySignificant).toBe(true)
    expect(res.isJustificationValid).toBe(true)
    expect(res.error).toBeUndefined()
  })
})

