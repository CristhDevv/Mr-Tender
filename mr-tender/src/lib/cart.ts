export interface CartItem {
  price: number
  quantity: number
  discount: number // percentage (0-100)
}

export function calculateLineTotal(item: CartItem): number {
  return item.price * item.quantity * (1 - item.discount / 100)
}

export function calculateCartTotals(items: CartItem[], globalDiscountPercent = 0) {
  const subtotal = items.reduce((sum, item) => sum + calculateLineTotal(item), 0)
  const discountAmt = subtotal * (globalDiscountPercent / 100)
  const total = subtotal - discountAmt
  return {
    subtotal,
    discountAmt,
    total
  }
}
