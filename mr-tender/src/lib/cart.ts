export interface CartItem {
  price: number
  quantity: number
  discount: number // percentage (0-100)
  tax_rate?: number
}

export function calculateLineTotal(item: CartItem): number {
  const base = (item.price || 0) * (item.quantity || 0)
  const discount = Math.max(0, Math.min(100, item.discount || 0))
  return base * (1 - discount / 100)
}

export function calculateCartTotals(items: CartItem[], globalDiscountPercent = 0) {
  const subtotal = items.reduce((sum, item) => sum + calculateLineTotal(item), 0)
  const safeDiscountPercent = Math.max(0, Math.min(100, globalDiscountPercent || 0))
  const discountAmt = subtotal * (safeDiscountPercent / 100)
  const total = Math.max(0, subtotal - discountAmt)
  return {
    subtotal,
    discountAmt,
    total
  }
}

export function calculateChange(receivedAmount: number, total: number): number {
  const received = Number(receivedAmount) || 0
  const tot = Number(total) || 0
  return Math.max(0, received - tot)
}

export function calculateTaxBreakdown(items: CartItem[], defaultTaxRate = 19) {
  return items.reduce((acc, item) => {
    const rate = item.tax_rate !== undefined ? Number(item.tax_rate) : defaultTaxRate
    const lineTotal = calculateLineTotal(item)
    const base = rate > 0 ? lineTotal / (1 + rate / 100) : lineTotal
    const tax = lineTotal - base
    return {
      baseTotal: acc.baseTotal + base,
      taxTotal: acc.taxTotal + tax
    }
  }, { baseTotal: 0, taxTotal: 0 })
}
