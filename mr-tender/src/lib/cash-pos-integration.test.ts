import { describe, it, expect } from 'vitest'
import {
  roundCurrency,
  calculateInvoiceTotals,
  calculateCashDrawerSummary
} from './finance-math'

interface MockCashMovement {
  id: string
  session_id: string
  movement_type: 'opening' | 'sale' | 'income' | 'deposit' | 'expense' | 'withdrawal'
  amount: number
  description: string
  reference_type?: string
  reference_id?: string
}

interface MockSaleItem {
  product_id: string
  quantity: number
  unit_price: number
  total: number
  cost_price: number
}

interface MockSale {
  id: string
  number: string
  status: 'completed' | 'cancelled'
  subtotal: number
  discount_amount: number
  tax_amount: number
  total: number
  payment_method: 'cash' | 'nequi' | 'card' | 'transfer' | 'fiao'
  customer_id?: string
  items: MockSaleItem[]
}

interface MockCustomer {
  id: string
  full_name: string
  credit_limit: number
  credit_used: number
}

interface MockCashSession {
  id: string
  status: 'open' | 'closed'
  opening_amount: number
  closing_amount?: number
  expected_amount?: number
  difference_amount?: number
  total_sales?: number
  total_expenses?: number
  total_income?: number
}

describe('PASO 1: Test de Integración de Flujo Completo (Caja & POS)', () => {
  it('debe ejecutar el ciclo de vida completo de un turno: apertura -> ventas mixtas -> abono -> egreso -> anulación -> arqueo de cierre', () => {
    // 1. APERTURA DE CAJA: $100.000
    const session: MockCashSession = {
      id: 'sess-001',
      status: 'open',
      opening_amount: 100000
    }

    const movements: MockCashMovement[] = [
      {
        id: 'mov-001',
        session_id: session.id,
        movement_type: 'opening',
        amount: 100000,
        description: 'Fondo inicial de caja'
      }
    ]

    const sales: MockSale[] = []
    const customer: MockCustomer = {
      id: 'cust-001',
      full_name: 'Carlos Mendoza',
      credit_limit: 100000,
      credit_used: 0
    }

    // 2. VENTA POS EN EFECTIVO: $50.000
    const sale1Totals = calculateInvoiceTotals([
      { price: 50000, quantity: 1, taxRate: 0, costPrice: 30000 }
    ])
    const sale1: MockSale = {
      id: 'sale-001',
      number: 'V-20260908-001',
      status: 'completed',
      subtotal: sale1Totals.taxExclusiveAmount,
      discount_amount: sale1Totals.totalDiscounts,
      tax_amount: sale1Totals.taxAmount,
      total: sale1Totals.payableAmount,
      payment_method: 'cash',
      items: [{ product_id: 'prod-01', quantity: 1, unit_price: 50000, total: 50000, cost_price: 30000 }]
    }
    sales.push(sale1)
    // Registro de entrada a caja física por venta en efectivo
    movements.push({
      id: 'mov-002',
      session_id: session.id,
      movement_type: 'sale',
      amount: sale1.total,
      description: 'Venta ' + sale1.number,
      reference_type: 'sale',
      reference_id: sale1.id
    })

    // 3. VENTA POS POR NEQUI: $30.000
    const sale2Totals = calculateInvoiceTotals([
      { price: 30000, quantity: 1, taxRate: 0, costPrice: 18000 }
    ])
    const sale2: MockSale = {
      id: 'sale-002',
      number: 'V-20260908-002',
      status: 'completed',
      subtotal: sale2Totals.taxExclusiveAmount,
      discount_amount: sale2Totals.totalDiscounts,
      tax_amount: sale2Totals.taxAmount,
      total: sale2Totals.payableAmount,
      payment_method: 'nequi',
      items: [{ product_id: 'prod-02', quantity: 1, unit_price: 30000, total: 30000, cost_price: 18000 }]
    }
    sales.push(sale2)
    // Nota: Pagos por Nequi son digitales, no generan movimiento de efectivo físico en el cajón de monedas/billetes

    // 4. VENTA POS A FIADO: $20.000
    const sale3Totals = calculateInvoiceTotals([
      { price: 20000, quantity: 1, taxRate: 0, costPrice: 12000 }
    ])
    const sale3: MockSale = {
      id: 'sale-003',
      number: 'V-20260908-003',
      status: 'completed',
      subtotal: sale3Totals.taxExclusiveAmount,
      discount_amount: sale3Totals.totalDiscounts,
      tax_amount: sale3Totals.taxAmount,
      total: sale3Totals.payableAmount,
      payment_method: 'fiao',
      customer_id: customer.id,
      items: [{ product_id: 'prod-03', quantity: 1, unit_price: 20000, total: 20000, cost_price: 12000 }]
    }
    sales.push(sale3)
    // Aumento de deuda en cartera del cliente
    customer.credit_used = roundCurrency(customer.credit_used + sale3.total)
    expect(customer.credit_used).toBe(20000)

    // 5. ABONO DE FIADO EN EFECTIVO: $10.000
    const abonoAmount = 10000
    customer.credit_used = Math.max(0, roundCurrency(customer.credit_used - abonoAmount))
    expect(customer.credit_used).toBe(10000)
    movements.push({
      id: 'mov-003',
      session_id: session.id,
      movement_type: 'income',
      amount: abonoAmount,
      description: 'Abono a crédito de Carlos Mendoza'
    })

    // 6. EGRESO MANUAL DE CAJA (GASTO): $5.000
    const expenseAmount = 5000
    movements.push({
      id: 'mov-004',
      session_id: session.id,
      movement_type: 'expense',
      amount: expenseAmount,
      description: 'Compra de bolsas y cinta'
    })

    // 7. ANULACIÓN DE LA VENTA EN EFECTIVO ($50.000)
    // Simulación de RPC cancel_sale
    const saleToCancel = sales.find(s => s.id === 'sale-001')!
    expect(saleToCancel).toBeDefined()
    saleToCancel.status = 'cancelled'

    // Compensación en caja por devolución de dinero al cliente
    movements.push({
      id: 'mov-005',
      session_id: session.id,
      movement_type: 'expense',
      amount: saleToCancel.total,
      description: 'Anulación de venta ' + saleToCancel.number + ': Devolución al cliente',
      reference_type: 'sale_cancellation',
      reference_id: saleToCancel.id
    })

    // 8. VERIFICACIÓN Y AUDITORÍA DEL ARQUEO DE CIERRE
    // A. Cálculo de movimientos de caja (Fórmula PostgreSQL / Cash Page)
    const movSales = movements.filter(m => m.movement_type === 'sale').reduce((s, m) => s + m.amount, 0)
    const movExpenses = movements.filter(m => m.movement_type === 'expense' || m.movement_type === 'withdrawal').reduce((s, m) => s + m.amount, 0)
    const movIncome = movements.filter(m => m.movement_type === 'income' || m.movement_type === 'deposit').reduce((s, m) => s + m.amount, 0)
    const opening = session.opening_amount

    // Efectivo físico esperado en el cajón:
    // 100.000 (apertura) + 50.000 (venta efectivo) + 10.000 (abono) - 5.000 (gasto) - 50.000 (anulación) = $105.000
    const expectedDrawerCash = roundCurrency(opening + movSales + movIncome - movExpenses)

    expect(movSales).toBe(50000)
    expect(movIncome).toBe(10000)
    expect(movExpenses).toBe(55000) // 5.000 gasto + 50.000 anulación
    expect(expectedDrawerCash).toBe(105000)

    // B. Total de ventas netas reales del negocio (excluyendo anuladas)
    // Venta Nequi ($30.000) + Venta Fiado ($20.000) = $50.000
    const activeSales = sales.filter(s => s.status !== 'cancelled')
    const totalNetSales = activeSales.reduce((s, item) => s + item.total, 0)

    expect(activeSales.length).toBe(2)
    expect(totalNetSales).toBe(50000)

    // C. Cierre de sesión y cálculo de diferencia de arqueo (cajero cuenta $105.000 físicos)
    const countedCash = 105000
    const diff = roundCurrency(countedCash - expectedDrawerCash)

    session.status = 'closed'
    session.closing_amount = countedCash
    session.expected_amount = expectedDrawerCash
    session.difference_amount = diff
    session.total_sales = movSales
    session.total_expenses = movExpenses
    session.total_income = movIncome

    expect(session.difference_amount).toBe(0) // Cuadre perfecto al centavo
    expect(customer.credit_used).toBe(10000) // Saldo restante de fiado exacto
  })
})
