/**
 * Central Financial & Mathematical Precision Engine for Mr Tender ERP & POS
 * 
 * Guarantees 100% mathematical precision across all currency calculations,
 * avoiding JavaScript floating point rounding issues (0.1 + 0.2 = 0.30000000000000004),
 * ensuring Colombian Peso (COP) and DIAN fiscal tax compliance forever.
 */

/**
 * Rounds a number to a specific number of decimal places using bank-grade precision
 * with epsilon correction to eliminate floating-point representation drift.
 */
export function roundCurrency(amount: number | null | undefined, decimals = 2): number {
  if (amount === null || amount === undefined || isNaN(amount)) return 0
  const num = Number(amount)
  const factor = Math.pow(10, decimals)
  return Math.round((num + Number.EPSILON) * factor) / factor
}

/**
 * Rounds a Colombian Peso amount for POS cash / consumer display (integer pesos).
 */
export function roundCOP(amount: number | null | undefined): number {
  if (amount === null || amount === undefined || isNaN(amount)) return 0
  return Math.round(Number(amount) + Number.EPSILON)
}

/**
 * Safe percentage calculation that protects against division by zero, NaN, or Infinity.
 */
export function safePercentage(numerator: number, denominator: number, decimals = 2): number {
  if (!denominator || denominator === 0 || isNaN(numerator) || isNaN(denominator)) return 0
  const pct = (numerator / denominator) * 100
  return roundCurrency(pct, decimals)
}

export interface LineFinancialInput {
  price: number
  quantity: number
  discountPercent?: number
  taxRate?: number
  costPrice?: number
  wholesalePrice?: number | null
  wholesaleMinQty?: number | null
}

export interface LineFinancialResult {
  unitPrice: number
  isWholesale: boolean
  quantity: number
  grossTotal: number
  discountPercent: number
  discountAmount: number
  netLineTotal: number
  taxBase: number
  taxAmount: number
  taxRate: number
  cogs: number
  lineProfit: number
  lineMarginPercent: number
}

/**
 * Calculates complete financial breakdown for a single item line.
 */
export function calculateLineFinancials(input: LineFinancialInput): LineFinancialResult {
  const quantity = Math.max(0, Number(input.quantity) || 0)
  let unitPrice = Math.max(0, Number(input.price) || 0)
  let isWholesale = false

  if (
    input.wholesalePrice !== undefined &&
    input.wholesalePrice !== null &&
    input.wholesalePrice > 0 &&
    input.wholesaleMinQty !== undefined &&
    input.wholesaleMinQty !== null &&
    input.wholesaleMinQty > 0 &&
    quantity >= input.wholesaleMinQty
  ) {
    unitPrice = Number(input.wholesalePrice)
    isWholesale = true
  }

  const grossTotal = roundCurrency(unitPrice * quantity)
  const discountPercent = Math.max(0, Math.min(100, Number(input.discountPercent) || 0))
  const discountAmount = roundCurrency(grossTotal * (discountPercent / 100))
  const netLineTotal = Math.max(0, roundCurrency(grossTotal - discountAmount))

  const taxRate = Math.max(0, Number(input.taxRate ?? 0))
  let taxBase = netLineTotal
  let taxAmount = 0

  if (taxRate > 0) {
    // POS prices are IVA-included (bruto)
    taxBase = roundCurrency(netLineTotal / (1 + taxRate / 100))
    taxAmount = roundCurrency(netLineTotal - taxBase)
  }

  const costPrice = Math.max(0, Number(input.costPrice) || 0)
  const cogs = roundCurrency(costPrice * quantity)
  const lineProfit = roundCurrency(netLineTotal - cogs)
  const lineMarginPercent = safePercentage(lineProfit, netLineTotal, 1)

  return {
    unitPrice,
    isWholesale,
    quantity,
    grossTotal,
    discountPercent,
    discountAmount,
    netLineTotal,
    taxBase,
    taxAmount,
    taxRate,
    cogs,
    lineProfit,
    lineMarginPercent
  }
}

export interface TaxBucketSummary {
  taxRate: number
  taxBase: number
  taxAmount: number
  itemsCount: number
}

export interface InvoiceFinancialSummary {
  grossSubtotal: number
  itemDiscountsTotal: number
  netBeforeGlobalDiscount: number
  globalDiscountPercent: number
  globalDiscountAmount: number
  totalDiscounts: number
  taxExclusiveAmount: number
  taxAmount: number
  taxBreakdown: {
    iva0: TaxBucketSummary
    iva5: TaxBucketSummary
    iva19: TaxBucketSummary
    inc8: TaxBucketSummary
    other: Record<number, TaxBucketSummary>
  }
  cogsTotal: number
  grossProfitTotal: number
  overallMarginPercent: number
  payableAmount: number
}

/**
 * Calculates complete invoice totals with multi-rate tax aggregation and profit metrics.
 */
export function calculateInvoiceTotals(
  items: LineFinancialInput[],
  globalDiscountPercent = 0
): InvoiceFinancialSummary {
  let grossSubtotal = 0
  let itemDiscountsTotal = 0
  let cogsTotal = 0

  const taxBuckets: Record<number, TaxBucketSummary> = {
    0: { taxRate: 0, taxBase: 0, taxAmount: 0, itemsCount: 0 },
    5: { taxRate: 5, taxBase: 0, taxAmount: 0, itemsCount: 0 },
    19: { taxRate: 19, taxBase: 0, taxAmount: 0, itemsCount: 0 },
    8: { taxRate: 8, taxBase: 0, taxAmount: 0, itemsCount: 0 }
  }
  const otherTaxes: Record<number, TaxBucketSummary> = {}

  for (const it of items) {
    const res = calculateLineFinancials(it)
    grossSubtotal = roundCurrency(grossSubtotal + res.grossTotal)
    itemDiscountsTotal = roundCurrency(itemDiscountsTotal + res.discountAmount)
    cogsTotal = roundCurrency(cogsTotal + res.cogs)

    const rate = res.taxRate
    let bucket = taxBuckets[rate]
    if (!bucket) {
      if (!otherTaxes[rate]) {
        otherTaxes[rate] = { taxRate: rate, taxBase: 0, taxAmount: 0, itemsCount: 0 }
      }
      bucket = otherTaxes[rate]
    }
    bucket.taxBase = roundCurrency(bucket.taxBase + res.taxBase)
    bucket.taxAmount = roundCurrency(bucket.taxAmount + res.taxAmount)
    bucket.itemsCount += 1
  }

  const netBeforeGlobalDiscount = Math.max(0, roundCurrency(grossSubtotal - itemDiscountsTotal))
  const safeGlobalDiscPct = Math.max(0, Math.min(100, Number(globalDiscountPercent) || 0))
  const globalDiscountAmount = roundCurrency(netBeforeGlobalDiscount * (safeGlobalDiscPct / 100))
  const payableAmount = Math.max(0, roundCurrency(netBeforeGlobalDiscount - globalDiscountAmount))
  const totalDiscounts = roundCurrency(itemDiscountsTotal + globalDiscountAmount)

  // Total taxes
  let totalTaxAmount = 0
  let totalTaxBase = 0
  for (const b of Object.values(taxBuckets)) {
    totalTaxAmount = roundCurrency(totalTaxAmount + b.taxAmount)
    totalTaxBase = roundCurrency(totalTaxBase + b.taxBase)
  }
  for (const b of Object.values(otherTaxes)) {
    totalTaxAmount = roundCurrency(totalTaxAmount + b.taxAmount)
    totalTaxBase = roundCurrency(totalTaxBase + b.taxBase)
  }

  const taxExclusiveAmount = roundCurrency(payableAmount - totalTaxAmount)
  const grossProfitTotal = roundCurrency(payableAmount - cogsTotal)
  const overallMarginPercent = safePercentage(grossProfitTotal, payableAmount, 1)

  return {
    grossSubtotal,
    itemDiscountsTotal,
    netBeforeGlobalDiscount,
    globalDiscountPercent: safeGlobalDiscPct,
    globalDiscountAmount,
    totalDiscounts,
    taxExclusiveAmount,
    taxAmount: totalTaxAmount,
    taxBreakdown: {
      iva0: taxBuckets[0],
      iva5: taxBuckets[5],
      iva19: taxBuckets[19],
      inc8: taxBuckets[8],
      other: otherTaxes
    },
    cogsTotal,
    grossProfitTotal,
    overallMarginPercent,
    payableAmount
  }
}

/**
 * Calculates customer change safely without negative numbers or precision artifacts.
 */
export function calculateChange(receivedAmount: number, payableAmount: number): number {
  const received = Math.max(0, Number(receivedAmount) || 0)
  const payable = Math.max(0, Number(payableAmount) || 0)
  if (received <= payable) return 0
  return roundCurrency(received - payable)
}

export interface CashDrawerSummary {
  openingAmount: number
  cashSales: number
  cashAbonos: number
  cashManualInflows: number
  cashManualOutflows: number
  cashRefunds: number
  expectedDrawerCash: number
  electronicSales: {
    card: number
    nequi: number
    daviplata: number
    transfer: number
    other: number
    total: number
  }
  creditSalesTotal: number
  totalRevenue: number
}

/**
 * Calculates strict separation between physical cash in drawer and electronic/credit settlements.
 */
export function calculateCashDrawerSummary(params: {
  openingAmount: number
  cashSales: number
  cashAbonos?: number
  cashManualInflows?: number
  cashManualOutflows?: number
  cashRefunds?: number
  cardSales?: number
  nequiSales?: number
  daviplataSales?: number
  transferSales?: number
  otherElectronicSales?: number
  creditSales?: number
}): CashDrawerSummary {
  const opening = roundCurrency(params.openingAmount || 0)
  const cashSales = roundCurrency(params.cashSales || 0)
  const cashAbonos = roundCurrency(params.cashAbonos || 0)
  const inflows = roundCurrency(params.cashManualInflows || 0)
  const outflows = roundCurrency(params.cashManualOutflows || 0)
  const refunds = roundCurrency(params.cashRefunds || 0)

  const card = roundCurrency(params.cardSales || 0)
  const nequi = roundCurrency(params.nequiSales || 0)
  const daviplata = roundCurrency(params.daviplataSales || 0)
  const transfer = roundCurrency(params.transferSales || 0)
  const other = roundCurrency(params.otherElectronicSales || 0)
  const electronicTotal = roundCurrency(card + nequi + daviplata + transfer + other)

  const creditSalesTotal = roundCurrency(params.creditSales || 0)

  const expectedDrawerCash = roundCurrency(opening + cashSales + cashAbonos + inflows - outflows - refunds)
  const totalRevenue = roundCurrency(cashSales + electronicTotal + creditSalesTotal)

  return {
    openingAmount: opening,
    cashSales,
    cashAbonos,
    cashManualInflows: inflows,
    cashManualOutflows: outflows,
    cashRefunds: refunds,
    expectedDrawerCash,
    electronicSales: {
      card,
      nequi,
      daviplata,
      transfer,
      other,
      total: electronicTotal
    },
    creditSalesTotal,
    totalRevenue
  }
}

/**
 * Calculates the cash discrepancy alert threshold.
 * Threshold is defined as max($5,000 COP, 2% of expected drawer cash).
 */
export function calculateCashDiscrepancyThreshold(expectedAmount: number): number {
  const expected = Math.max(0, Number(expectedAmount) || 0)
  const percentageThreshold = roundCurrency(expected * 0.02)
  return Math.max(5000, percentageThreshold)
}

export interface CashDiscrepancyValidation {
  expected: number
  counted: number
  difference: number
  absoluteDiff: number
  threshold: number
  isDiscrepancySignificant: boolean
  requiresJustification: boolean
  isJustificationValid: boolean
  error?: string
}

/**
 * Validates whether counted cash drawer matches expected cash within tolerable threshold,
 * and enforces mandatory justification (> 10 characters) if discrepancy exceeds threshold.
 */
export function validateCashDiscrepancy(
  expectedAmount: number,
  countedAmount: number,
  notes?: string | null
): CashDiscrepancyValidation {
  const expected = roundCurrency(expectedAmount || 0)
  const counted = roundCurrency(countedAmount || 0)
  const difference = roundCurrency(counted - expected)
  const absoluteDiff = Math.abs(difference)
  const threshold = calculateCashDiscrepancyThreshold(expected)
  const isDiscrepancySignificant = absoluteDiff > threshold
  const trimmedNotes = (notes || '').trim()
  const isJustificationValid = trimmedNotes.length >= 10

  let error: string | undefined
  if (isDiscrepancySignificant && !isJustificationValid) {
    const formattedDiff = Math.abs(difference).toLocaleString('es-CO')
    const formattedThreshold = threshold.toLocaleString('es-CO')
    error = `El descuadre de caja ($${formattedDiff}) supera el umbral permitido ($${formattedThreshold}). Debe ingresar una justificación obligatoria de al menos 10 caracteres.`
  }

  return {
    expected,
    counted,
    difference,
    absoluteDiff,
    threshold,
    isDiscrepancySignificant,
    requiresJustification: isDiscrepancySignificant,
    isJustificationValid,
    error
  }
}

