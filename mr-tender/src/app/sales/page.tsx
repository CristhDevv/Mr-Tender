'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { getColombiaDateString, getColombiaDayBoundsUTC, getColombiaRelativeDateString } from '@/lib/date-utils'
import {
  ShoppingCart,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Building,
  Store,
  CreditCard,
  Banknote,
  Smartphone,
  Eye,
  X,
  Printer,
  Send,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  TrendingUp,
  Receipt,
  DollarSign,
  Layers,
  ArrowRight,
  Package,
  Check
} from 'lucide-react'
import Link from 'next/link'

interface SaleRecord {
  id: string
  number: string
  created_at: string
  subtotal: number
  discount_amount: number
  tax_amount: number
  total: number
  amount_paid: number
  change_amount: number
  status: string
  sale_type: string
  customer_id?: string
  seller_id?: string
  register_id?: string
  session_id?: string
  branch_id?: string
  notes?: string
  metadata?: any
  // Joined or resolved fields
  customer_name?: string
  customer_id_number?: string
  customer_phone?: string
  seller_name?: string
  register_name?: string
  warehouse_name?: string
  payment_method?: string
  payment_received?: number
  items_count?: number
  items?: any[]
  payments?: any[]
}

export default function SalesHistoryPage() {
  const supabase = createClient()
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('month')
  const [sellerFilter, setSellerFilter] = useState<string>('all')
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Lookups
  const [sellersList, setSellersList] = useState<{ id: string; name: string }[]>([])
  const [warehousesList, setWarehousesList] = useState<{ id: string; name: string }[]>([])
  const [businessName, setBusinessName] = useState('Mr Tender')
  const [tenantId, setTenantId] = useState('')

  // Modal / Detail Drawer
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [annulling, setAnnulling] = useState(false)
  const [annulSuccess, setAnnulSuccess] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [dateFilter])

  async function loadInitialData() {
    try {
      setLoading(true)
      setError('')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let tid = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id
      if (!tid) {
        const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).limit(1)
        if (userData?.[0]?.tenant_id) tid = userData[0].tenant_id
        else {
          const { data: ptData } = await supabase.from('platform_tenants').select('id').eq('owner_email', user.email).limit(1)
          if (ptData?.[0]?.id) tid = ptData[0].id
        }
      }

      if (!tid) return
      setTenantId(tid)

      // 1. Fetch Warehouses and Profiles for lookups
      const [settingsRes, whRes, profilesRes] = await Promise.all([
        supabase.from('tenant_settings').select('business_name').eq('tenant_id', tid).limit(1),
        supabase.from('warehouses').select('id, name').eq('tenant_id', tid),
        supabase.from('profiles').select('id, full_name, email').eq('tenant_id', tid)
      ])

      if (settingsRes.data?.[0]?.business_name) {
        setBusinessName(settingsRes.data[0].business_name)
      }

      if (whRes.data) {
        setWarehousesList(whRes.data.map(w => ({ id: w.id, name: w.name })))
      }

      const sellersMap: Record<string, string> = {}
      if (profilesRes.data) {
        profilesRes.data.forEach(p => {
          sellersMap[p.id] = p.full_name || p.email
        })
        setSellersList(profilesRes.data.map(p => ({ id: p.id, name: p.full_name || p.email })))
      }

      // 2. Build Date Range Query
      let query = supabase
        .from('sales')
        .select(`
          id, number, created_at, subtotal, discount_amount, tax_amount, total,
          amount_paid, change_amount, status, sale_type, customer_id, seller_id,
          register_id, session_id, branch_id, notes, metadata
        `)
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false })
        .limit(200)

      if (dateFilter === 'today') {
        const bounds = getColombiaDayBoundsUTC()
        query = query.gte('created_at', bounds.gte).lte('created_at', bounds.lte)
      } else if (dateFilter === 'yesterday') {
        const yesterdayStr = getColombiaRelativeDateString(-1)
        const bounds = getColombiaDayBoundsUTC(yesterdayStr)
        query = query.gte('created_at', bounds.gte).lte('created_at', bounds.lte)
      } else if (dateFilter === 'week') {
        const weekAgoStr = getColombiaRelativeDateString(-7)
        const bounds = getColombiaDayBoundsUTC(weekAgoStr)
        query = query.gte('created_at', bounds.gte)
      } else if (dateFilter === 'month') {
        const todayStr = getColombiaDateString()
        const monthStartStr = todayStr.substring(0, 7) + '-01'
        const bounds = getColombiaDayBoundsUTC(monthStartStr)
        query = query.gte('created_at', bounds.gte)
      }

      const { data: salesData, error: salesErr } = await query
      if (salesErr) throw salesErr

      if (!salesData || salesData.length === 0) {
        setSales([])
        setLoading(false)
        return
      }

      // 3. Fetch Customers, Payments & Items Summary for these sales
      const saleIds = salesData.map(s => s.id)
      const customerIds = salesData.map(s => s.customer_id).filter(Boolean) as string[]

      const [customersRes, paymentsRes, itemsRes, registersRes] = await Promise.all([
        customerIds.length > 0 ? supabase.from('customers').select('id, name, id_number, phone').in('id', customerIds) : Promise.resolve({ data: [] }),
        supabase.from('sale_payments').select('id, sale_id, payment_method, amount, reference').in('sale_id', saleIds),
        supabase.from('sale_items').select('sale_id, warehouse_id').in('sale_id', saleIds),
        supabase.from('cash_registers').select('id, name').eq('tenant_id', tid)
      ])

      const customersMap: Record<string, { name: string; id_number?: string; phone?: string }> = {}
      customersRes.data?.forEach((c: any) => {
        customersMap[c.id] = { name: c.name, id_number: c.id_number, phone: c.phone }
      })

      const paymentsMap: Record<string, { method: string; amount: number; reference?: string }[]> = {}
      paymentsRes.data?.forEach((p: any) => {
        if (!paymentsMap[p.sale_id]) paymentsMap[p.sale_id] = []
        paymentsMap[p.sale_id].push({ method: p.payment_method, amount: p.amount, reference: p.reference })
      })

      const itemsCountMap: Record<string, { count: number; warehouse_id?: string }> = {}
      itemsRes.data?.forEach((it: any) => {
        if (!itemsCountMap[it.sale_id]) itemsCountMap[it.sale_id] = { count: 0, warehouse_id: it.warehouse_id }
        itemsCountMap[it.sale_id].count += 1
      })

      const registersMap: Record<string, string> = {}
      registersRes.data?.forEach((r: any) => {
        registersMap[r.id] = r.name
      })

      const whMap: Record<string, string> = {}
      whRes.data?.forEach((w: any) => {
        whMap[w.id] = w.name
      })

      // Assemble Enriched Sales Records
      const enriched: SaleRecord[] = salesData.map(s => {
        const cust = s.customer_id ? customersMap[s.customer_id] : null
        const pmList = paymentsMap[s.id] || []
        const primaryPayment = pmList.length > 0 ? pmList[0].method : (s.metadata?.payment_method || 'cash')
        const itemsSummary = itemsCountMap[s.id]
        const whId = itemsSummary?.warehouse_id || s.metadata?.warehouse_id
        const whName = whId && whMap[whId] ? whMap[whId] : (s.metadata?.warehouse_name || 'Bodega Principal')

        return {
          ...s,
          customer_name: cust?.name || s.metadata?.customer_name || 'Consumidor Final',
          customer_id_number: cust?.id_number || '222222222222',
          customer_phone: cust?.phone || '',
          seller_name: s.seller_id && sellersMap[s.seller_id] ? sellersMap[s.seller_id] : (s.metadata?.cashier_name || 'Cajero'),
          register_name: s.register_id && registersMap[s.register_id] ? registersMap[s.register_id] : 'Caja Principal',
          warehouse_name: whName,
          payment_method: primaryPayment,
          items_count: itemsSummary?.count || 1,
          payments: pmList
        }
      })

      setSales(enriched)
    } catch (err: any) {
      console.error(err)
      setError('Error al cargar historial de ventas: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch full details of single sale for the Drawer/Modal
  async function openSaleDetail(sale: SaleRecord) {
    setSelectedSale(sale)
    setDetailLoading(true)
    setAnnulSuccess(false)
    try {
      const [itemsRes, paymentsRes] = await Promise.all([
        supabase.from('sale_items').select('*').eq('sale_id', sale.id),
        supabase.from('sale_payments').select('*').eq('sale_id', sale.id)
      ])

      setSelectedSale(prev => prev ? ({
        ...prev,
        items: itemsRes.data || [],
        payments: paymentsRes.data || []
      }) : null)
    } catch (err) {
      console.error('Error loading sale details:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  // Annull Sale
  async function handleAnnullSale() {
    if (!selectedSale) return
    const reason = prompt(`¿Estás seguro de anular la venta ${selectedSale.number}?\n\nEl stock será devuelto automáticamente al inventario y se revertirá el movimiento de caja.\n\nIngresa el motivo de anulación (opcional):`, 'Error de digitación / Devolución')
    if (reason === null) return

    setAnnulling(true)
    try {
      // Atomic RPC cancel_sale in PostgreSQL (restores stock, reverses cash movement and accounting)
      const { data, error } = await supabase.rpc('cancel_sale', {
        p_sale_id: selectedSale.id,
        p_reason: reason.trim() || 'Anulación manual desde historial de ventas'
      })

      if (error) throw error
      if (data && data.success === false) throw new Error(data.error)

      setAnnulSuccess(true)
      setSelectedSale(prev => prev ? ({ ...prev, status: 'cancelled' }) : null)
      setSales(prev => prev.map(s => s.id === selectedSale.id ? { ...s, status: 'cancelled' } : s))
    } catch (err: any) {
      alert('Error al anular venta: ' + err.message)
    } finally {
      setAnnulling(false)
    }
  }

  // WhatsApp Share Ticket
  function sendSaleWhatsApp(sale: SaleRecord) {
    let cleanPhone = (sale.customer_phone || '').replace(/\D/g, '')
    if (cleanPhone && !cleanPhone.startsWith('57') && cleanPhone.length === 10) {
      cleanPhone = '57' + cleanPhone
    }

    const itemsSummary = sale.items && sale.items.length > 0
      ? sale.items.map(it => `• ${it.quantity}x ${it.product_name} (${formatCurrency(it.total)})`).join('\n')
      : `• ${sale.items_count || 1} productos`

    const message = `🧾 *COMPROBANTE DE COMPRA*
🏪 *${businessName}*
🔖 Ticket: *${sale.number}*
📅 Fecha: ${formatDateTime(sale.created_at)}
👤 Cliente: ${sale.customer_name}

📦 *Detalle:*
${itemsSummary}

──────────────
💰 *TOTAL: ${formatCurrency(sale.total)}*
💳 Pago: ${getPaymentLabel(sale.payment_method)}
👤 Atendido por: ${sale.seller_name}
🏢 Bodega: ${sale.warehouse_name}

¡Gracias por su compra!`

    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  // Print Thermal Ticket
  function handlePrintTicket(sale: SaleRecord) {
    const printWindow = window.open('', '_blank', 'width=380,height=600')
    if (!printWindow) return

    const itemsHtml = (sale.items || []).map(it => `
      <tr>
        <td style="padding: 3px 0;">${it.quantity}x ${it.product_name}</td>
        <td style="text-align: right; padding: 3px 0;">${formatCurrency(it.total)}</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket ${sale.number}</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; margin: 0 auto; padding: 10px; color: #000; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="center bold" style="font-size: 14px;">${businessName}</div>
          <div class="center">Comprobante de Venta</div>
          <div class="divider"></div>
          <div>Ticket: <strong>${sale.number}</strong></div>
          <div>Fecha: ${formatDateTime(sale.created_at)}</div>
          <div>Cajero: ${sale.seller_name}</div>
          <div>Caja: ${sale.register_name}</div>
          <div>Bodega: ${sale.warehouse_name}</div>
          <div>Cliente: ${sale.customer_name}</div>
          <div class="divider"></div>
          <table>${itemsHtml}</table>
          <div class="divider"></div>
          <table style="font-size: 12px;">
            <tr><td>Subtotal:</td><td style="text-align: right;">${formatCurrency(sale.subtotal)}</td></tr>
            ${sale.discount_amount > 0 ? `<tr><td>Descuento:</td><td style="text-align: right;">-${formatCurrency(sale.discount_amount)}</td></tr>` : ''}
            ${sale.tax_amount > 0 ? `<tr><td>IVA / Impuesto:</td><td style="text-align: right;">${formatCurrency(sale.tax_amount)}</td></tr>` : ''}
            <tr class="bold" style="font-size: 13px;"><td>TOTAL:</td><td style="text-align: right;">${formatCurrency(sale.total)}</td></tr>
            <tr><td>Método:</td><td style="text-align: right;">${getPaymentLabel(sale.payment_method)}</td></tr>
            ${sale.change_amount > 0 ? `<tr><td>Cambio:</td><td style="text-align: right;">${formatCurrency(sale.change_amount)}</td></tr>` : ''}
          </table>
          <div class="divider"></div>
          <div class="center" style="font-size: 10px; margin-top: 8px;">
            ¡Gracias por su compra!<br/>
            Mr Tender POS
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  // Export to CSV
  function exportSalesCSV() {
    if (filteredSales.length === 0) return
    const headers = ['Numero', 'Fecha', 'Hora', 'Cajero', 'Bodega', 'Caja', 'Cliente', 'Documento', 'Metodo_Pago', 'Subtotal', 'Descuento', 'Impuesto', 'Total', 'Estado']
    const rows = filteredSales.map(s => {
      const d = new Date(s.created_at)
      return [
        s.number,
        d.toLocaleDateString('es-CO'),
        d.toLocaleTimeString('es-CO'),
        `"${s.seller_name || ''}"`,
        `"${s.warehouse_name || ''}"`,
        `"${s.register_name || ''}"`,
        `"${s.customer_name || ''}"`,
        s.customer_id_number || '',
        s.payment_method || 'cash',
        s.subtotal,
        s.discount_amount,
        s.tax_amount,
        s.total,
        s.status
      ]
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Reporte_Ventas_${dateFilter}_${getColombiaDateString()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function getPaymentLabel(m?: string) {
    if (!m) return 'Efectivo'
    switch (m.toLowerCase()) {
      case 'cash': case 'efectivo': return 'Efectivo'
      case 'card': case 'tarjeta': case 'datafono': return 'Tarjeta'
      case 'nequi': return 'Nequi'
      case 'daviplata': return 'Daviplata'
      case 'transfer': case 'transferencia': return 'Transferencia'
      case 'credit': case 'fiado': return 'Crédito'
      default: return m
    }
  }

  function getPaymentBadge(m?: string) {
    const label = getPaymentLabel(m)
    if (label === 'Efectivo') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
          <Banknote size={12} /> {label}
        </span>
      )
    } else if (label === 'Tarjeta') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
          <CreditCard size={12} /> {label}
        </span>
      )
    } else if (label === 'Nequi' || label === 'Daviplata') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE' }}>
          <Smartphone size={12} /> {label}
        </span>
      )
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0' }}>
        {label}
      </span>
    )
  }

  // Filtered Sales Calculation
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchNumber = s.number.toLowerCase().includes(q)
        const matchCustomer = s.customer_name?.toLowerCase().includes(q)
        const matchSeller = s.seller_name?.toLowerCase().includes(q)
        const matchWh = s.warehouse_name?.toLowerCase().includes(q)
        if (!matchNumber && !matchCustomer && !matchSeller && !matchWh) return false
      }

      // 2. Seller Filter
      if (sellerFilter !== 'all' && s.seller_id !== sellerFilter) return false

      // 3. Warehouse Filter
      if (warehouseFilter !== 'all' && s.warehouse_name !== warehouseFilter) return false

      // 4. Payment Filter
      if (paymentFilter !== 'all' && getPaymentLabel(s.payment_method).toLowerCase() !== paymentFilter.toLowerCase()) return false

      // 5. Status Filter
      if (statusFilter !== 'all' && s.status !== statusFilter) return false

      return true
    })
  }, [sales, searchQuery, sellerFilter, warehouseFilter, paymentFilter, statusFilter])

  // KPIs
  const kpis = useMemo(() => {
    const validSales = filteredSales.filter(s => s.status !== 'cancelled')
    const totalVolume = validSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0)
    const validCount = validSales.length
    const avgTicket = validCount > 0 ? Math.round(totalVolume / validCount) : 0
    const uniqueCustomers = new Set(validSales.map(s => s.customer_name)).size

    return { totalVolume, validCount, avgTicket, uniqueCustomers }
  }, [filteredSales])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', overflowX: 'hidden' }}>
      
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Historial de Ventas
            </h1>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: '#E6F7F5', color: '#008F7E', border: '1px solid #99F6E4' }}>
              {filteredSales.length} transacciones
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '2px 0 0' }}>
            Trazabilidad completa: quién vendió, fecha, hora, caja, bodega, cliente y método de pago
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={exportSalesCSV}
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, background: '#FFFFFF' }}
          >
            <Download size={14} />
            <span>Exportar Excel / CSV</span>
          </button>

          <Link
            href="/pos"
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ShoppingCart size={14} />
            <span>Nueva Venta (POS)</span>
          </Link>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, color: '#DC2626', fontSize: '0.82rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* ── KPI METRICS CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        <div className="neu-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#E6F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008F7E', flexShrink: 0 }}>
            <TrendingUp size={18} strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Ventas Totales
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0F172A' }}>
              {formatCurrency(kpis.totalVolume)}
            </div>
          </div>
        </div>

        <div className="neu-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', flexShrink: 0 }}>
            <Receipt size={18} strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Tickets Emitidos
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0F172A' }}>
              {kpis.validCount} ventas
            </div>
          </div>
        </div>

        <div className="neu-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED', flexShrink: 0 }}>
            <DollarSign size={18} strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Ticket Promedio
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0F172A' }}>
              {formatCurrency(kpis.avgTicket)}
            </div>
          </div>
        </div>

        <div className="neu-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#F0EDFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#714AD9', flexShrink: 0 }}>
            <User size={18} strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Clientes Atendidos
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0F172A' }}>
              {kpis.uniqueCustomers} clientes
            </div>
          </div>
        </div>
      </div>

      {/* ── ADVANCED FILTERS BAR ── */}
      <div className="neu-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Quick Date Range Pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B', marginRight: 4 }}>Periodo:</span>
          {[
            { id: 'today', label: 'Hoy' },
            { id: 'yesterday', label: 'Ayer' },
            { id: 'week', label: 'Últimos 7 días' },
            { id: 'month', label: 'Este Mes' },
            { id: 'all', label: 'Todo el Historial' },
          ].map(p => {
            const isActive = dateFilter === p.id
            return (
              <button
                key={p.id}
                onClick={() => setDateFilter(p.id as any)}
                className="btn-neu"
                style={{
                  padding: '5px 12px',
                  fontSize: '0.76rem',
                  fontWeight: isActive ? 800 : 600,
                  background: isActive ? '#00B19D' : '#F8FAFC',
                  color: isActive ? '#FFFFFF' : '#475569',
                  border: isActive ? '1px solid #009E8C' : '1px solid #E2E8F0'
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        {/* Dropdowns & Search */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8, paddingTop: 6, borderTop: '1px solid #F1F5F9' }}>
          {/* Universal Search */}
          <div style={{ position: 'relative', gridColumn: 'span 2' }}>
            <input
              type="text"
              className="input-neu"
              placeholder="Buscar por ticket, cliente, cajero o bodega..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 30, fontSize: '0.8rem' }}
            />
            <Search size={14} style={{ position: 'absolute', left: 9, top: 10, color: '#94A3B8' }} />
          </div>

          {/* Seller Filter */}
          <select
            className="input-neu"
            value={sellerFilter}
            onChange={e => setSellerFilter(e.target.value)}
            style={{ fontSize: '0.78rem', background: '#FFFFFF' }}
          >
            <option value="all">Todos los Cajeros</option>
            {sellersList.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Warehouse Filter */}
          <select
            className="input-neu"
            value={warehouseFilter}
            onChange={e => setWarehouseFilter(e.target.value)}
            style={{ fontSize: '0.78rem', background: '#FFFFFF' }}
          >
            <option value="all">Todas las Bodegas</option>
            {warehousesList.map(w => (
              <option key={w.id} value={w.name}>{w.name}</option>
            ))}
          </select>

          {/* Payment Method Filter */}
          <select
            className="input-neu"
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            style={{ fontSize: '0.78rem', background: '#FFFFFF' }}
          >
            <option value="all">Todos los Métodos de Pago</option>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta (Datáfono)</option>
            <option value="nequi">Nequi</option>
            <option value="daviplata">Daviplata</option>
            <option value="transferencia">Transferencia Bancaria</option>
            <option value="crédito">Crédito / Fiado</option>
          </select>

          {/* Status Filter */}
          <select
            className="input-neu"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ fontSize: '0.78rem', background: '#FFFFFF' }}
          >
            <option value="all">Todos los Estados</option>
            <option value="completed">Completadas / Pagadas</option>
            <option value="cancelled">Anuladas</option>
          </select>
        </div>
      </div>

      {/* ── SALES TABLE ── */}
      <div className="neu-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748B', fontSize: '0.88rem' }}>
            Cargando historial de ventas...
          </div>
        ) : filteredSales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: '#64748B', fontSize: '0.84rem' }}>
            <ShoppingCart size={32} style={{ color: '#CBD5E1', margin: '0 auto 8px', display: 'block' }} />
            No se encontraron ventas para los filtros seleccionados.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '10px 8px' }}>Ticket / Factura</th>
                  <th style={{ padding: '10px 8px' }}>Fecha & Hora</th>
                  <th style={{ padding: '10px 8px' }}>Cajero / Responsable</th>
                  <th style={{ padding: '10px 8px' }}>Bodega</th>
                  <th style={{ padding: '10px 8px' }}>Caja / Turno</th>
                  <th style={{ padding: '10px 8px' }}>Cliente</th>
                  <th style={{ padding: '10px 8px' }}>Método de Pago</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Total</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map(s => {
                  const isCancelled = s.status === 'cancelled'
                  const dateObj = new Date(s.created_at)

                  return (
                    <tr
                      key={s.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        background: isCancelled ? '#FEF2F2' : undefined,
                        opacity: isCancelled ? 0.75 : 1
                      }}
                    >
                      {/* Ticket # & Status */}
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 800, color: '#0F172A' }}>
                            {s.number}
                          </span>
                          {isCancelled && (
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: '#FEE2E2', color: '#DC2626' }}>
                              ANULADA
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date & Time with exact seconds */}
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>
                          {dateObj.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
                          {dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>

                      {/* Cashier / Seller */}
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: '#475569' }}>
                            {(s.seller_name || 'C')[0]}
                          </div>
                          <span style={{ fontWeight: 600, color: '#334155' }}>
                            {s.seller_name}
                          </span>
                        </div>
                      </td>

                      {/* Warehouse */}
                      <td style={{ padding: '10px 8px', color: '#475569' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Building size={12} color="#64748B" />
                          {s.warehouse_name}
                        </span>
                      </td>

                      {/* Cash Register */}
                      <td style={{ padding: '10px 8px', color: '#64748B' }}>
                        {s.register_name}
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>
                          {s.customer_name}
                        </div>
                      </td>

                      {/* Payment Method Badge */}
                      <td style={{ padding: '10px 8px' }}>
                        {getPaymentBadge(s.payment_method)}
                      </td>

                      {/* Total */}
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 900, fontSize: '0.88rem', color: isCancelled ? '#94A3B8' : '#059669' }}>
                        {formatCurrency(Number(s.total) || 0)}
                      </td>

                      {/* Action Buttons */}
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          <button
                            onClick={() => openSaleDetail(s)}
                            className="btn-neu"
                            title="Ver Detalle Completo"
                            style={{ padding: '5px 8px', fontSize: '0.74rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <Eye size={13} />
                            <span>Detalle</span>
                          </button>

                          <button
                            onClick={() => handlePrintTicket(s)}
                            className="btn-neu"
                            title="Imprimir Ticket Térmico"
                            style={{ padding: '5px 7px' }}
                          >
                            <Printer size={13} />
                          </button>

                          <button
                            onClick={() => sendSaleWhatsApp(s)}
                            className="btn-neu"
                            title="Enviar por WhatsApp"
                            style={{ padding: '5px 7px', color: '#059669' }}
                          >
                            <Send size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL / DRAWER: DETALLE COMPLETO DE LA VENTA ── */}
      {selectedSale && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E2E8F0', paddingBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                    Venta #{selectedSale.number}
                  </h3>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: selectedSale.status === 'cancelled' ? '#FEE2E2' : '#ECFDF5',
                    color: selectedSale.status === 'cancelled' ? '#DC2626' : '#059669',
                    border: selectedSale.status === 'cancelled' ? '1px solid #FECACA' : '1px solid #A7F3D0'
                  }}>
                    {selectedSale.status === 'cancelled' ? 'ANULADA' : 'COMPLETADA'}
                  </span>
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: 2 }}>
                  Registrada el {formatDateTime(selectedSale.created_at)}
                </div>
              </div>

              <button onClick={() => setSelectedSale(null)} className="btn-neu" style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={15} />
              </button>
            </div>

            {annulSuccess && (
              <div style={{ padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, color: '#059669', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={16} />
                <span>Venta anulada correctamente. Stock devuelto a inventario.</span>
              </div>
            )}

            {/* Traceability Grid: Who, When, Where, Register, Customer */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Cajero / Vendedor</div>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A', marginTop: 2 }}>
                  {selectedSale.seller_name}
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Bodega de Despacho</div>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A', marginTop: 2 }}>
                  {selectedSale.warehouse_name}
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Caja / Turno</div>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A', marginTop: 2 }}>
                  {selectedSale.register_name}
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Cliente</div>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A', marginTop: 2 }}>
                  {selectedSale.customer_name}
                </div>
              </div>
            </div>

            {/* Products Breakdown */}
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                Productos de la Venta ({selectedSale.items?.length || selectedSale.items_count || 1})
              </div>

              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#64748B', fontSize: '0.8rem' }}>Cargando artículos...</div>
              ) : selectedSale.items && selectedSale.items.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedSale.items.map((it: any, idx: number) => (
                    <div
                      key={it.id || idx}
                      style={{
                        padding: '8px 12px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: 8,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                          {it.product_name}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
                          {it.quantity} un × {formatCurrency(Number(it.unit_price))} {it.discount_amount > 0 ? `(- ${formatCurrency(it.discount_amount)} desc)` : ''}
                        </div>
                      </div>

                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0F172A' }}>
                        {formatCurrency(Number(it.total))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8, fontSize: '0.8rem', color: '#64748B' }}>
                  Artículos generales ({selectedSale.items_count || 1} productos)
                </div>
              )}
            </div>

            {/* Financial Totals */}
            <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748B' }}>
                <span>Subtotal Neto:</span>
                <span>{formatCurrency(selectedSale.subtotal)}</span>
              </div>
              {selectedSale.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#DC2626' }}>
                  <span>Descuento Aplicado:</span>
                  <span>-{formatCurrency(selectedSale.discount_amount)}</span>
                </div>
              )}
              {selectedSale.tax_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748B' }}>
                  <span>IVA / Impuestos:</span>
                  <span>+{formatCurrency(selectedSale.tax_amount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 900, color: '#0F172A', paddingTop: 6, borderTop: '1px solid #E2E8F0' }}>
                <span>TOTAL PAGADO:</span>
                <span style={{ color: '#008F7E' }}>{formatCurrency(selectedSale.total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748B' }}>
                <span>Método: {getPaymentLabel(selectedSale.payment_method)}</span>
                {selectedSale.change_amount > 0 && <span>Cambio Devuelto: {formatCurrency(selectedSale.change_amount)}</span>}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
              <button
                onClick={() => handlePrintTicket(selectedSale)}
                className="btn-neu"
                style={{ flex: 1, padding: '9px 12px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Printer size={15} />
                <span>Imprimir Ticket</span>
              </button>

              <button
                onClick={() => sendSaleWhatsApp(selectedSale)}
                className="btn-neu"
                style={{ flex: 1, padding: '9px 12px', fontSize: '0.8rem', fontWeight: 700, background: '#25D366', color: '#FFFFFF', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Send size={15} />
                <span>WhatsApp</span>
              </button>

              {selectedSale.status !== 'cancelled' && (
                <button
                  onClick={handleAnnullSale}
                  disabled={annulling}
                  className="btn-neu btn-danger"
                  style={{ padding: '9px 14px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <RotateCcw size={14} />
                  <span>{annulling ? 'Anulando...' : 'Anular Venta'}</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
