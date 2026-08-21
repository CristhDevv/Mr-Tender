'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import {
  X,
  Search,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Printer,
  Send,
  Calendar,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronRight,
  Receipt
} from 'lucide-react'

interface RefundItem {
  product_id: string
  variant_id: string | null
  product_name: string
  product_sku: string
  warehouse_id: string
  unit_price: number
  cost_price: number
  max_quantity: number
  refund_quantity: number
  subtotal: number
  total: number
}

interface SaleDetails {
  id: string
  number: string
  created_at: string
  total: number
  status: string
  customer_id: string | null
  session_id: string | null
  customers?: { full_name: string; phone: string | null } | null
  items: RefundItem[]
  payments?: { payment_method: string; amount: number }[]
}

interface RefundModalProps {
  isOpen: boolean
  onClose: () => void
  onRefundSuccess?: (refundData: any) => void
  tenantId: string
  userId: string
  activeSessionId?: string | null
  businessName?: string
}

export default function RefundModal({
  isOpen,
  onClose,
  onRefundSuccess,
  tenantId,
  userId,
  activeSessionId,
  businessName = 'Mr. Tender'
}: RefundModalProps) {
  const supabase = createClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [searching, setSearching] = useState(false)
  const [recentSales, setRecentSales] = useState<any[]>([])
  const [selectedSale, setSelectedSale] = useState<SaleDetails | null>(null)
  const [refundItems, setRefundItems] = useState<RefundItem[]>([])
  const [refundReason, setRefundReason] = useState('Devolución de cliente')
  const [customReason, setCustomReason] = useState('')
  const [refundMethod, setRefundMethod] = useState<'cash' | 'transfer' | 'fiao' | 'credit_note'>('cash')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [refundResult, setRefundResult] = useState<any | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadRecentSales()
      setSelectedSale(null)
      setRefundItems([])
      setRefundResult(null)
      setError('')
      setSearchTerm('')
    }
  }, [isOpen])

  async function loadRecentSales() {
    try {
      setSearching(true)
      const { data, error: fetchErr } = await supabase
        .from('sales')
        .select(`
          id, number, created_at, total, status, customer_id, session_id,
          customers (full_name, phone)
        `)
        .eq('tenant_id', tenantId)
        .in('status', ['completed', 'partially_refunded'])
        .order('created_at', { ascending: false })
        .limit(10)

      if (fetchErr) throw fetchErr
      setRecentSales(data || [])
    } catch (err: any) {
      console.error('Error loading recent sales:', err)
    } finally {
      setSearching(false)
    }
  }

  async function handleSearch() {
    if (!searchTerm.trim()) {
      loadRecentSales()
      return
    }

    try {
      setSearching(true)
      const { data, error: fetchErr } = await supabase
        .from('sales')
        .select(`
          id, number, created_at, total, status, customer_id, session_id,
          customers (full_name, phone)
        `)
        .eq('tenant_id', tenantId)
        .or(`number.ilike.%${searchTerm.trim()}%,customers.full_name.ilike.%${searchTerm.trim()}%`)
        .order('created_at', { ascending: false })
        .limit(15)

      if (fetchErr) throw fetchErr
      setRecentSales(data || [])
    } catch (err: any) {
      console.error('Error searching sales:', err)
      setError('Error al buscar ventas')
    } finally {
      setSearching(false)
    }
  }

  async function selectSale(sale: any) {
    try {
      setSearching(true)
      setError('')

      // Fetch items and payments for this sale
      const [itemsRes, paymentsRes] = await Promise.all([
        supabase
          .from('sale_items')
          .select('*')
          .eq('sale_id', sale.id),
        supabase
          .from('sale_payments')
          .select('*')
          .eq('sale_id', sale.id)
      ])

      if (itemsRes.error) throw itemsRes.error

      const formattedItems: RefundItem[] = (itemsRes.data || []).map((item: any) => ({
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        product_name: item.product_name,
        product_sku: item.product_sku || '',
        warehouse_id: item.warehouse_id,
        unit_price: Number(item.unit_price),
        cost_price: Number(item.cost_price || 0),
        max_quantity: Number(item.quantity),
        refund_quantity: 0,
        subtotal: 0,
        total: 0
      }))

      setSelectedSale({
        id: sale.id,
        number: sale.number,
        created_at: sale.created_at,
        total: Number(sale.total),
        status: sale.status,
        customer_id: sale.customer_id,
        session_id: sale.session_id,
        customers: sale.customers,
        items: formattedItems,
        payments: paymentsRes.data || []
      })

      // Default payment method
      const mainPayment = paymentsRes.data?.[0]?.payment_method || 'cash'
      if (mainPayment === 'fiao') {
        setRefundMethod('fiao')
      } else if (mainPayment === 'transfer') {
        setRefundMethod('transfer')
      } else {
        setRefundMethod('cash')
      }

      setRefundItems(formattedItems)
    } catch (err: any) {
      console.error('Error fetching sale details:', err)
      setError('No se pudieron obtener los detalles de la venta')
    } finally {
      setSearching(false)
    }
  }

  function handleQuantityChange(productId: string, newQty: number) {
    setRefundItems(prev =>
      prev.map(item => {
        if (item.product_id === productId) {
          const qty = Math.max(0, Math.min(item.max_quantity, newQty))
          const lineTotal = qty * item.unit_price
          return {
            ...item,
            refund_quantity: qty,
            subtotal: lineTotal,
            total: lineTotal
          }
        }
        return item
      })
    )
  }

  function setAllItemsRefund() {
    setRefundItems(prev =>
      prev.map(item => ({
        ...item,
        refund_quantity: item.max_quantity,
        subtotal: item.max_quantity * item.unit_price,
        total: item.max_quantity * item.unit_price
      }))
    )
  }

  const itemsToRefund = refundItems.filter(i => i.refund_quantity > 0)
  const totalRefundAmount = itemsToRefund.reduce((s, i) => s + i.total, 0)
  const isTotalRefund =
    selectedSale !== null &&
    refundItems.every(i => i.refund_quantity === i.max_quantity)

  async function handleProcessRefund() {
    if (!selectedSale || itemsToRefund.length === 0 || submitting) return

    const reasonFinal = refundReason === 'Otro' ? customReason.trim() || 'Devolución' : refundReason

    setSubmitting(true)
    setError('')

    const payload = {
      tenant_id: tenantId,
      user_id: userId,
      sale_id: selectedSale.id,
      reason: reasonFinal,
      refund_type: isTotalRefund ? 'total' : 'partial',
      total_refunded: totalRefundAmount,
      payment_method: refundMethod,
      items: itemsToRefund.map(item => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        warehouse_id: item.warehouse_id,
        product_name: item.product_name,
        quantity: item.refund_quantity,
        unit_price: item.unit_price,
        cost_price: item.cost_price,
        subtotal: item.subtotal,
        total: item.total
      }))
    }

    try {
      const { data, error: rpcErr } = await supabase.rpc('process_refund', {
        p_refund_data: payload
      })

      if (rpcErr) throw rpcErr
      if (data && data.success === false) throw new Error(data.error)

      setRefundResult({
        ...data,
        sale_number: selectedSale.number,
        customer: selectedSale.customers?.full_name || 'Cliente general',
        customer_phone: selectedSale.customers?.phone,
        items: itemsToRefund,
        reason: reasonFinal,
        refundMethod,
        date: new Date().toISOString()
      })

      if (onRefundSuccess) {
        onRefundSuccess(data)
      }
    } catch (err: any) {
      console.error('Error processing refund:', err)
      setError(err.message || 'No se pudo procesar la devolución')
    } finally {
      setSubmitting(false)
    }
  }

  function sendWhatsAppVoucher() {
    if (!refundResult) return
    let phone = refundResult.customer_phone?.replace(/\D/g, '') || ''
    const itemsText = refundResult.items
      .map((i: RefundItem) => `• ${i.refund_quantity}x ${i.product_name} (${formatCurrency(i.total)})`)
      .join('\n')

    const message = `*COMPROBANTE DE DEVOLUCIÓN / NOTA CRÉDITO*
*${businessName}*
Nota Nº: ${refundResult.number}
Venta original: ${refundResult.sale_number}
Fecha: ${new Date(refundResult.date).toLocaleString('es-CO')}

Motivo: ${refundResult.reason}

*Productos devueltos:*
${itemsText}

*VALOR DEVUELTO:* ${formatCurrency(refundResult.total_refunded)}
Método: ${refundResult.refundMethod === 'cash' ? 'Efectivo' : refundResult.refundMethod === 'fiao' ? 'Restitución de cupo' : 'Transferencia'}

Comprobante generado por el sistema Mr. Tender.`

    if (phone) {
      if (!phone.startsWith('57') && phone.length === 10) phone = '57' + phone
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        className="neu-card animate-scale-in"
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--bg)',
          borderRadius: 20,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--bg-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'var(--accent-coral-lt)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-coral)'
              }}
            >
              <RotateCcw size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Gestión de Devoluciones y Notas Crédito
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Reingreso automático al inventario y ajuste de caja/saldo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-neu"
            style={{ padding: 6, borderRadius: '50%', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {error && (
            <div
              style={{
                background: '#FEE2E2',
                color: '#DC2626',
                padding: '10px 14px',
                borderRadius: 10,
                marginBottom: 16,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* SCREEN 1: SUCCESS VOUCHER */}
          {refundResult ? (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'var(--accent-green-lt)',
                  color: 'var(--accent-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px'
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h4 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Devolución Procesada Exitosamente
              </h4>
              <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Folio: <strong>{refundResult.number}</strong> | Venta: {refundResult.sale_number}
              </p>

              {/* Printable Voucher box */}
              <div
                id="refund-voucher-print"
                style={{
                  background: '#fff',
                  color: '#1E293B',
                  borderRadius: 14,
                  padding: 16,
                  textAlign: 'left',
                  border: '1px solid #CBD5E1',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  maxWidth: 380,
                  margin: '0 auto 20px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                }}
              >
                <div style={{ textAlign: 'center', borderBottom: '1px dashed #94A3B8', paddingBottom: 8, marginBottom: 8 }}>
                  <div style={{ fontWeight: 900, fontSize: '1rem' }}>{businessName}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B' }}>COMPROBANTE DE DEVOLUCIÓN</div>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>Nota Nº: {refundResult.number}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Venta Ref: {refundResult.sale_number}</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{new Date().toLocaleString('es-CO')}</div>
                </div>

                <div style={{ borderBottom: '1px dashed #94A3B8', paddingBottom: 6, marginBottom: 6 }}>
                  <div><strong>Cliente:</strong> {refundResult.customer}</div>
                  <div><strong>Motivo:</strong> {refundResult.reason}</div>
                  <div><strong>Método Reembolso:</strong> {refundResult.refundMethod === 'cash' ? 'Efectivo' : refundResult.refundMethod === 'fiao' ? 'Restitución de Crédito' : 'Transferencia'}</div>
                </div>

                <div style={{ borderBottom: '1px dashed #94A3B8', paddingBottom: 6, marginBottom: 6 }}>
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>Ítems Reingresados al Stock:</div>
                  {refundResult.items.map((i: RefundItem, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span>{i.refund_quantity}x {i.product_name}</span>
                      <span style={{ fontWeight: 700 }}>{formatCurrency(i.total)}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 900, color: 'var(--accent-coral)' }}>
                  <span>TOTAL DEVUELTO:</span>
                  <span>{formatCurrency(refundResult.total_refunded)}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  className="btn-neu"
                  onClick={() => window.print()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', fontWeight: 700 }}
                >
                  <Printer size={16} />
                  <span>Imprimir</span>
                </button>
                <button
                  className="btn-neu"
                  onClick={sendWhatsAppVoucher}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 18px',
                    fontWeight: 800,
                    background: '#25D366',
                    color: '#fff'
                  }}
                >
                  <Send size={16} />
                  <span>WhatsApp</span>
                </button>
                <button
                  className="btn-neu btn-primary"
                  onClick={() => {
                    setSelectedSale(null)
                    setRefundResult(null)
                    loadRecentSales()
                  }}
                  style={{ padding: '10px 18px', fontWeight: 700 }}
                >
                  Nueva Devolución
                </button>
              </div>
            </div>
          ) : !selectedSale ? (
            /* SCREEN 2: SEARCH & SELECT SALE */
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <span className="input-icon">
                    <Search size={16} style={{ color: 'var(--text-muted)' }} />
                  </span>
                  <input
                    className="input-neu"
                    placeholder="Buscar por Folio (ej. V-2026...) o Nombre de Cliente..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
                <button
                  className="btn-neu btn-primary"
                  onClick={handleSearch}
                  disabled={searching}
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  {searching ? 'Buscando...' : 'Buscar'}
                </button>
              </div>

              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Ventas Recientes para Devolución
              </div>

              {recentSales.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                  <Receipt size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <div>No se encontraron ventas para devolver</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recentSales.map(sale => (
                    <div
                      key={sale.id}
                      onClick={() => selectSale(sale)}
                      className="neu-flat"
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderRadius: 12,
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                            {sale.number}
                          </span>
                          <span
                            className={`badge ${sale.status === 'partially_refunded' ? 'badge-amber' : 'badge-green'}`}
                            style={{ fontSize: '0.65rem' }}
                          >
                            {sale.status === 'partially_refunded' ? 'Dev. Parcial' : 'Completada'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 12 }}>
                          <span>📅 {new Date(sale.created_at).toLocaleDateString('es-CO')} {new Date(sale.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>👤 {sale.customers?.full_name || 'Cliente general'}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontWeight: 900, color: 'var(--accent-blue)', fontSize: '0.95rem' }}>
                          {formatCurrency(Number(sale.total))}
                        </span>
                        <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* SCREEN 3: REFUND DETAILS & ITEM SELECTOR */
            <div>
              {/* Sale Info Summary Card */}
              <div
                className="neu-flat"
                style={{
                  padding: '12px 16px',
                  borderRadius: 14,
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Venta Seleccionada</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {selectedSale.number}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Cliente: <strong>{selectedSale.customers?.full_name || 'Cliente general'}</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Original</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--accent-blue)' }}>
                    {formatCurrency(selectedSale.total)}
                  </div>
                  <button
                    className="btn-neu btn-ghost"
                    onClick={() => setSelectedSale(null)}
                    style={{ fontSize: '0.7rem', padding: '2px 8px', marginTop: 4, color: 'var(--accent-coral)' }}
                  >
                    Cambiar venta
                  </button>
                </div>
              </div>

              {/* Items List to Refund */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                  Selecciona Productos a Devolver
                </div>
                <button
                  className="btn-neu"
                  onClick={setAllItemsRefund}
                  style={{ fontSize: '0.72rem', padding: '3px 8px', color: 'var(--accent-blue)', fontWeight: 700 }}
                >
                  Devolver todo
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {refundItems.map(item => (
                  <div
                    key={item.product_id}
                    className="neu-card"
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderLeft: item.refund_quantity > 0 ? '4px solid var(--accent-coral)' : '4px solid transparent'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {item.product_name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {formatCurrency(item.unit_price)} c/u | Comprados: {item.max_quantity}
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          className="btn-neu"
                          onClick={() => handleQuantityChange(item.product_id, item.refund_quantity - 1)}
                          disabled={item.refund_quantity <= 0}
                          style={{ width: 26, height: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          max={item.max_quantity}
                          value={item.refund_quantity}
                          onChange={e => handleQuantityChange(item.product_id, parseInt(e.target.value) || 0)}
                          style={{
                            width: 44,
                            textAlign: 'center',
                            fontWeight: 800,
                            padding: '4px 0',
                            borderRadius: 6,
                            border: '1px solid var(--bg-deep)',
                            background: 'var(--bg)'
                          }}
                        />
                        <button
                          className="btn-neu"
                          onClick={() => handleQuantityChange(item.product_id, item.refund_quantity + 1)}
                          disabled={item.refund_quantity >= item.max_quantity}
                          style={{ width: 26, height: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}
                        >
                          +
                        </button>
                      </div>

                      <div style={{ width: 80, textAlign: 'right', fontWeight: 800, fontSize: '0.85rem', color: item.refund_quantity > 0 ? 'var(--accent-coral)' : 'var(--text-muted)' }}>
                        {formatCurrency(item.total)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Refund Reason & Method Settings */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                    Motivo de la Devolución
                  </label>
                  <select
                    className="input-neu"
                    value={refundReason}
                    onChange={e => setRefundReason(e.target.value)}
                    style={{ width: '100%', fontSize: '0.82rem', padding: '8px 10px' }}
                  >
                    <option value="Producto defectuoso">Producto defectuoso</option>
                    <option value="Cliente insatisfecho">Cliente insatisfecho</option>
                    <option value="Error en cobro / cambio">Error en cobro / cambio</option>
                    <option value="Garantía / cambio">Garantía / cambio</option>
                    <option value="Otro">Otro motivo...</option>
                  </select>

                  {refundReason === 'Otro' && (
                    <input
                      className="input-neu"
                      placeholder="Especifica el motivo..."
                      value={customReason}
                      onChange={e => setCustomReason(e.target.value)}
                      style={{ marginTop: 6, fontSize: '0.8rem', padding: '6px 10px' }}
                    />
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                    Método de Reembolso
                  </label>
                  <select
                    className="input-neu"
                    value={refundMethod}
                    onChange={e => setRefundMethod(e.target.value as any)}
                    style={{ width: '100%', fontSize: '0.82rem', padding: '8px 10px' }}
                  >
                    <option value="cash">Efectivo (Salida de caja)</option>
                    <option value="transfer">Transferencia (Nequi / Bancaria)</option>
                    {selectedSale.customer_id && (
                      <option value="fiao">Restituir cupo de crédito (Fiao)</option>
                    )}
                    <option value="credit_note">Nota Crédito / Saldo a favor</option>
                  </select>
                </div>
              </div>

              {/* Total Box and Submit Button */}
              <div
                style={{
                  background: 'var(--accent-coral-lt)',
                  padding: '14px 18px',
                  borderRadius: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-coral)', textTransform: 'uppercase' }}>
                    Total a Reembolsar al Cliente
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent-coral)' }}>
                    {formatCurrency(totalRefundAmount)}
                  </div>
                </div>

                <button
                  className="btn-neu"
                  onClick={handleProcessRefund}
                  disabled={itemsToRefund.length === 0 || submitting}
                  style={{
                    background: itemsToRefund.length === 0 ? 'var(--bg-deep)' : 'var(--accent-coral)',
                    color: '#fff',
                    padding: '10px 20px',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    boxShadow: itemsToRefund.length > 0 ? '0 4px 14px rgba(232, 116, 90, 0.4)' : 'none'
                  }}
                >
                  {submitting ? 'Procesando...' : `Confirmar Devolución (${formatCurrency(totalRefundAmount)})`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
