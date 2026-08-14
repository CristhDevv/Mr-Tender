export interface CartItem {
  price: number;
  quantity: number;
}

export function calculateMobileCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function formatMobileCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
