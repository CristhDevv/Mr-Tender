'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { roundCurrency, safePercentage } from '@/lib/finance-math'
import { jsPDF } from 'jspdf'
import {
  BarChart3,
  Package,
  Users,
  DollarSign,
  Truck,
  RotateCcw,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Printer,
  Calendar,
  Search,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  X
} from 'lucide-react'

type ReportTab = 'sales' | 'inventory' | 'customers' | 'purchases' | 'cash' | 'pnl' | 'refunds'
type PeriodPreset = 'today' | '7days' | '30days' | 'this_month' | 'last_month' | 'this_year' | 'all' | 'custom'

export default function ReportsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [businessName, setBusinessName] = useState('MI NEGOCIO')
  const [taxId, setTaxId] = useState('901234567-1')

  // Raw Database Data
  const [sales, setSales] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [cashSessions, setCashSessions] = useState<any[]>([])
  const [refunds, setRefunds] = useState<any[]>([])

  // Active Report Tab
  const [activeTab, setActiveTab] = useState<ReportTab>('sales')

  // Collapsible Filters Panel (HIDDEN by default to maximize space)
  const [showFilters, setShowFilters] = useState(false)

  // Filter States
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('30days')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all')
  const [stockStatusFilter, setStockStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [debtFilter, setDebtFilter] = useState('all')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [cashStatusFilter, setCashStatusFilter] = useState('all')

  // Load Data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        let tid = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id
        if (!tid) {
          const { data: ptData } = await supabase.from('platform_tenants').select('id').eq('owner_email', user.email).limit(1)
          if (ptData?.[0]?.id) tid = ptData[0].id
        }
        if (!tid) return

        // 1. Settings
        const { data: settings } = await supabase.from('tenant_settings').select('business_name, tax_id').eq('tenant_id', tid).limit(1)
        if (settings?.[0]) {
          setBusinessName(settings[0].business_name || 'MI NEGOCIO')
          setTaxId(settings[0].tax_id || '901234567-1')
        }

        // 2. Sales with Items & Payments
        const { data: salesData } = await supabase
          .from('sales')
          .select(`
            id, number, subtotal, discount_amount, tax_amount, total, status, created_at,
            customers (full_name, phone),
            sale_items (product_name, quantity, unit_price, cost_price, total),
            payments (payment_method, amount)
          `)
          .eq('tenant_id', tid)
          .order('created_at', { ascending: false })
        setSales(salesData || [])

        // 3. Products
        const { data: prodData } = await supabase
          .from('products')
          .select('id, name, sku, sale_price, cost_price, is_active, min_stock, categories(name), inventory(quantity)')
          .eq('tenant_id', tid)
          .order('name', { ascending: true })
        setProducts(prodData || [])

        // 4. Customers
        const { data: custData } = await supabase
          .from('customers')
          .select('*')
          .eq('tenant_id', tid)
          .order('credit_used', { ascending: false })
        setCustomers(custData || [])

        // 5. Purchases
        const { data: poData } = await supabase
          .from('purchase_orders')
          .select('*, suppliers(company_name)')
          .eq('tenant_id', tid)
          .order('created_at', { ascending: false })
        setPurchases(poData || [])

        // 6. Cash Sessions
        const { data: cashData } = await supabase
          .from('cash_sessions')
          .select('*')
          .eq('tenant_id', tid)
          .order('opened_at', { ascending: false })
        setCashSessions(cashData || [])

        // 7. Refunds
        const { data: refData } = await supabase
          .from('refunds')
          .select('*, sales(number, customers(full_name))')
          .eq('tenant_id', tid)
          .order('created_at', { ascending: false })
        setRefunds(refData || [])

      } catch (err) {
        console.error('Error loading report data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Date Range Calculator based on preset
  const dateRange = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    if (periodPreset === 'today') {
      return { start: todayStr, end: todayStr }
    }
    if (periodPreset === '7days') {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return { start: d.toISOString().split('T')[0], end: todayStr }
    }
    if (periodPreset === '30days') {
      const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return { start: d.toISOString().split('T')[0], end: todayStr }
    }
    if (periodPreset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      return { start: firstDay, end: todayStr }
    }
    if (periodPreset === 'last_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
      return { start: firstDay, end: lastDay }
    }
    if (periodPreset === 'this_year') {
      const firstDay = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
      return { start: firstDay, end: todayStr }
    }
    if (periodPreset === 'custom') {
      return { start: startDate, end: endDate }
    }
    return { start: '', end: '' }
  }, [periodPreset, startDate, endDate])

  const isDateInRange = (dateString?: string | null) => {
    if (!dateString) return true
    const itemDate = dateString.split('T')[0]
    if (dateRange.start && itemDate < dateRange.start) return false
    if (dateRange.end && itemDate > dateRange.end) return false
    return true
  }

  // Categories list from products
  const categoriesList = useMemo(() => {
    const set = new Set<string>()
    products.forEach(p => {
      if (p.categories?.name) set.add(p.categories.name)
    })
    return Array.from(set)
  }, [products])

  // Suppliers list from purchases
  const suppliersList = useMemo(() => {
    const set = new Set<string>()
    purchases.forEach(p => {
      if (p.suppliers?.company_name) set.add(p.suppliers.company_name)
    })
    return Array.from(set)
  }, [purchases])

  // Count active non-default filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (periodPreset !== '30days') count++
    if (searchQuery.trim()) count++
    if (paymentMethodFilter !== 'all') count++
    if (stockStatusFilter !== 'all') count++
    if (categoryFilter !== 'all') count++
    if (debtFilter !== 'all') count++
    if (supplierFilter !== 'all') count++
    if (cashStatusFilter !== 'all') count++
    return count
  }, [periodPreset, searchQuery, paymentMethodFilter, stockStatusFilter, categoryFilter, debtFilter, supplierFilter, cashStatusFilter])

  // FILTERED DATASETS
  // 1. Sales
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (s.status === 'cancelled') return false
      if (!isDateInRange(s.created_at)) return false
      if (paymentMethodFilter !== 'all') {
        const method = s.payments?.[0]?.payment_method || 'Efectivo'
        if (method.toLowerCase() !== paymentMethodFilter.toLowerCase()) return false
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const num = (s.number || '').toLowerCase()
        const cust = (s.customers?.full_name || '').toLowerCase()
        if (!num.includes(q) && !cust.includes(q)) return false
      }
      return true
    })
  }, [sales, dateRange, paymentMethodFilter, searchQuery])

  // 2. Inventory
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const stock = p.inventory?.reduce((acc: number, curr: any) => acc + Number(curr.quantity || 0), 0) || 0
      if (categoryFilter !== 'all' && p.categories?.name !== categoryFilter) return false
      if (stockStatusFilter === 'low_stock' && (stock > Number(p.min_stock || 5) || stock <= 0)) return false
      if (stockStatusFilter === 'out_of_stock' && stock > 0) return false
      if (stockStatusFilter === 'in_stock' && stock <= 0) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const name = (p.name || '').toLowerCase()
        const sku = (p.sku || '').toLowerCase()
        if (!name.includes(q) && !sku.includes(q)) return false
      }
      return true
    })
  }, [products, categoryFilter, stockStatusFilter, searchQuery])

  // 3. Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const debt = Number(c.credit_used || 0)
      if (debtFilter === 'has_debt' && debt <= 0) return false
      if (debtFilter === 'no_debt' && debt > 0) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const name = (c.full_name || '').toLowerCase()
        const phone = (c.phone || '').toLowerCase()
        if (!name.includes(q) && !phone.includes(q)) return false
      }
      return true
    })
  }, [customers, debtFilter, searchQuery])

  // 4. Purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      const date = p.order_date || p.created_at
      if (!isDateInRange(date)) return false
      if (supplierFilter !== 'all' && p.suppliers?.company_name !== supplierFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const num = (p.number || '').toLowerCase()
        const supp = (p.suppliers?.company_name || '').toLowerCase()
        if (!num.includes(q) && !supp.includes(q)) return false
      }
      return true
    })
  }, [purchases, dateRange, supplierFilter, searchQuery])

  // 5. Cash Sessions
  const filteredCashSessions = useMemo(() => {
    return cashSessions.filter(cs => {
      if (!isDateInRange(cs.opened_at)) return false
      const diff = Number(cs.difference_amount || 0)
      if (cashStatusFilter === 'diff' && diff === 0) return false
      if (cashStatusFilter === 'exact' && diff !== 0) return false
      return true
    })
  }, [cashSessions, dateRange, cashStatusFilter])

  // 6. Refunds
  const filteredRefunds = useMemo(() => {
    return refunds.filter(r => {
      if (!isDateInRange(r.created_at)) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const num = (r.number || '').toLowerCase()
        const orig = (r.sales?.number || '').toLowerCase()
        const cust = (r.sales?.customers?.full_name || '').toLowerCase()
        if (!num.includes(q) && !orig.includes(q) && !cust.includes(q)) return false
      }
      return true
    })
  }, [refunds, dateRange, searchQuery])

  // 7. P&L Financials
  const pnlMetrics = useMemo(() => {
    const grossSales = roundCurrency(filteredSales.reduce((acc, s) => acc + Number(s.total || 0), 0))
    const discounts = roundCurrency(filteredSales.reduce((acc, s) => acc + Number(s.discount_amount || 0), 0))
    const netSales = grossSales
    let costOfGoods = 0
    filteredSales.forEach(s => {
      s.sale_items?.forEach((item: any) => {
        const cost = Number(item.cost_price !== undefined && item.cost_price !== null ? item.cost_price : (item.unit_price * 0.7))
        costOfGoods += cost * Number(item.quantity || 1)
      })
    })
    costOfGoods = roundCurrency(costOfGoods)
    const grossProfit = roundCurrency(netSales - costOfGoods)
    const marginPct = safePercentage(grossProfit, netSales, 1).toString()
    return { grossSales, discounts, netSales, costOfGoods, grossProfit, marginPct, ordersCount: filteredSales.length }
  }, [filteredSales])

  // Reset Filters Handler
  function handleResetFilters() {
    setPeriodPreset('30days')
    setStartDate('')
    setEndDate('')
    setSearchQuery('')
    setPaymentMethodFilter('all')
    setStockStatusFilter('all')
    setCategoryFilter('all')
    setDebtFilter('all')
    setSupplierFilter('all')
    setCashStatusFilter('all')
  }

  // EXCEL / CSV EXPORT
  function downloadExcel() {
    let title = ''
    let headers: string[] = []
    let rows: (string | number)[][] = []

    const periodStr = dateRange.start ? `${dateRange.start} al ${dateRange.end || 'Hoy'}` : 'Histórico Completo'

    if (activeTab === 'sales') {
      title = 'REPORTE DE VENTAS'
      headers = ['Folio', 'Fecha', 'Cliente', 'Método Pago', 'Subtotal', 'Descuento', 'Total']
      rows = filteredSales.map(s => [
        s.number,
        s.created_at ? new Date(s.created_at).toLocaleString('es-CO') : '',
        s.customers?.full_name || 'Público General',
        s.payments?.[0]?.payment_method || 'Efectivo',
        Number(s.subtotal || s.total || 0),
        Number(s.discount_amount || 0),
        Number(s.total || 0)
      ])
    } else if (activeTab === 'inventory') {
      title = 'REPORTE DE INVENTARIO Y STOCK'
      headers = ['SKU', 'Producto', 'Categoría', 'Stock Actual', 'Costo Unit.', 'Precio Venta', 'Valor Inventario']
      rows = filteredProducts.map(p => {
        const stock = p.inventory?.reduce((acc: number, curr: any) => acc + Number(curr.quantity || 0), 0) || 0
        const cost = Number(p.cost_price || 0)
        const price = Number(p.sale_price || 0)
        return [
          p.sku || 'N/A',
          p.name,
          p.categories?.name || 'General',
          stock,
          cost,
          price,
          stock * cost
        ]
      })
    } else if (activeTab === 'customers') {
      title = 'REPORTE DE CLIENTES Y CARTERA'
      headers = ['Cliente', 'Teléfono', 'Cupo Crédito', 'Deuda Actual', 'Disponible']
      rows = filteredCustomers.map(c => [
        c.full_name,
        c.phone || 'N/A',
        Number(c.credit_limit || 0),
        Number(c.credit_used || 0),
        Math.max(0, Number(c.credit_limit || 0) - Number(c.credit_used || 0))
      ])
    } else if (activeTab === 'purchases') {
      title = 'REPORTE DE COMPRAS Y PROVEEDORES'
      headers = ['Número OC', 'Proveedor', 'Fecha', 'Estado', 'Total']
      rows = filteredPurchases.map(p => [
        p.number,
        p.suppliers?.company_name || 'General',
        p.order_date || p.created_at || '',
        p.status || 'Completada',
        Number(p.total || 0)
      ])
    } else if (activeTab === 'cash') {
      title = 'REPORTE DE TURNOS DE CAJA'
      headers = ['ID', 'Apertura', 'Cierre', 'Esperado', 'Diferencia', 'Estado']
      rows = filteredCashSessions.map(cs => [
        cs.id?.slice(0, 8),
        cs.opened_at ? new Date(cs.opened_at).toLocaleString('es-CO') : '',
        cs.closed_at ? new Date(cs.closed_at).toLocaleString('es-CO') : 'En curso',
        Number(cs.expected_amount || 0),
        Number(cs.difference_amount || 0),
        cs.status
      ])
    } else if (activeTab === 'refunds') {
      title = 'REPORTE DE DEVOLUCIONES'
      headers = ['Folio Dev.', 'Venta Original', 'Fecha', 'Cliente', 'Total']
      rows = filteredRefunds.map(r => [
        r.number,
        r.sales?.number || 'N/A',
        r.created_at ? new Date(r.created_at).toLocaleDateString('es-CO') : '',
        r.sales?.customers?.full_name || 'Cliente general',
        Number(r.total_refunded || 0)
      ])
    } else {
      title = 'ESTADO DE RESULTADOS (P&L)'
      headers = ['Concepto Financiero', 'Monto']
      rows = [
        ['Ventas Brutas Totales', pnlMetrics.grossSales],
        ['(-) Descuentos Comerciales', -pnlMetrics.discounts],
        ['(=) Ventas Netas Facturadas', pnlMetrics.netSales],
        ['(-) Costo de Mercancía Vendida (COGS)', -pnlMetrics.costOfGoods],
        ['(=) Utilidad Bruta Estimada', pnlMetrics.grossProfit],
        ['Margen Bruto Porcentual', `${pnlMetrics.marginPct}%`],
        ['Cantidad de Ventas', pnlMetrics.ordersCount]
      ]
    }

    let csv = '﻿' // UTF-8 BOM for Excel
    csv += `${businessName.toUpperCase()} - ${title}
`
    csv += `NIT: ${taxId} | Período: ${periodStr} | Generado: ${new Date().toLocaleString('es-CO')}

`
    csv += headers.map(h => `"${h}"`).join(',') + '\n'

    rows.forEach(r => {
      csv += r.map(c => typeof c === 'number' ? c : `"${String(c).replace(/"/g, '""')}"`).join(',') + '\n'
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `MrTender_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // NATIVE PDF EXPORT USING jsPDF
  function downloadPDF() {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const periodStr = dateRange.start ? `${dateRange.start} al ${dateRange.end || 'Hoy'}` : 'Histórico Completo'
    
    // Header Banner
    doc.setFillColor(15, 23, 42) // Slate 900
    doc.rect(0, 0, 210, 24, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(businessName.toUpperCase(), 14, 10)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(0, 214, 188) // Mint turquoise
    doc.text(`Mr. Tender ERP • NIT ${taxId}`, 14, 16)

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 196, 16, { align: 'right' })

    let y = 32
    doc.setTextColor(15, 23, 42)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    
    const tabTitles: Record<ReportTab, string> = {
      sales: 'Reporte Detallado de Ventas',
      inventory: 'Reporte de Inventario & Stock',
      customers: 'Reporte de Clientes y Cartera (Fiao)',
      purchases: 'Reporte de Compras & Proveedores',
      cash: 'Reporte de Arqueos & Turnos de Caja',
      pnl: 'Estado de Resultados (P&L)',
      refunds: 'Reporte de Devoluciones & Notas Crédito'
    }

    doc.text(tabTitles[activeTab], 14, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(`Filtro de período: ${periodStr}`, 14, y)
    y += 8

    // Table Headers
    doc.setFillColor(0, 214, 188) // Brand turquoise header
    doc.rect(14, y, 182, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(15, 23, 42)

    if (activeTab === 'sales') {
      doc.text('FOLIO', 16, y + 5)
      doc.text('FECHA', 40, y + 5)
      doc.text('CLIENTE', 75, y + 5)
      doc.text('MÉTODO', 125, y + 5)
      doc.text('TOTAL', 192, y + 5, { align: 'right' })
      y += 8

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(51, 65, 85)
      filteredSales.slice(0, 45).forEach((s, i) => {
        if (y > 275) {
          doc.addPage()
          y = 20
        }
        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 252)
          doc.rect(14, y - 4, 182, 6, 'F')
        }
        doc.text(String(s.number || '').slice(0, 14), 16, y)
        doc.text(formatDate(s.created_at), 40, y)
        doc.text(String(s.customers?.full_name || 'Público General').slice(0, 24), 75, y)
        doc.text(String(s.payments?.[0]?.payment_method || 'Efectivo').slice(0, 14), 125, y)
        doc.text(formatCurrency(s.total), 192, y, { align: 'right' })
        y += 6
      })
    } else {
      doc.text('CONCEPTO / ITEM', 16, y + 5)
      doc.text('VALOR', 192, y + 5, { align: 'right' })
      y += 8
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(51, 65, 85)
      doc.text(`Total de registros filtrados: ${filteredSales.length || filteredCustomers.length || filteredProducts.length}`, 16, y)
    }

    // Footer
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.text('Documento emitido por Mr. Tender ERP • Gestión Comercial & POS', 105, 290, { align: 'center' })

    doc.save(`Reporte_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const periodLabel = periodPreset === 'today' ? 'Hoy'
    : periodPreset === '7days' ? 'Últimos 7 días'
    : periodPreset === '30days' ? 'Últimos 30 días'
    : periodPreset === 'this_month' ? 'Este mes'
    : periodPreset === 'last_month' ? 'Mes anterior'
    : periodPreset === 'this_year' ? 'Este año'
    : periodPreset === 'custom' ? `${startDate} a ${endDate}`
    : 'Histórico'

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>Cargando módulo de reportes...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 1350, margin: '0 auto', overflowX: 'hidden' }}>
      
      {/* ── COMPACT TOPBAR TOOLBAR ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, padding: '2px 0' }}>
        
        {/* Left: Report Type Dropdown Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={activeTab}
            onChange={e => setActiveTab(e.target.value as ReportTab)}
            className="input-neu"
            style={{
              padding: '6px 12px',
              fontSize: '0.84rem',
              fontWeight: 800,
              background: '#FFFFFF',
              borderColor: '#00D6BC',
              color: '#0F172A',
              cursor: 'pointer',
              borderRadius: 8,
              height: 34
            }}
          >
            <option value="sales">📊 Ventas & Facturación</option>
            <option value="inventory">📦 Inventario & Stock</option>
            <option value="customers">👥 Clientes & Cartera (Fiao)</option>
            <option value="purchases">🚚 Compras & Proveedores</option>
            <option value="cash">💵 Cajas & Turnos</option>
            <option value="pnl">📈 Estado de Resultados (P&L)</option>
            <option value="refunds">🔄 Devoluciones & Notas Crédito</option>
          </select>

          {/* Inline Active Period Indicator */}
          <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Calendar size={13} style={{ color: '#00D6BC' }} />
            <strong style={{ color: '#0F172A' }}>{periodLabel}</strong>
            {searchQuery && <span style={{ color: '#714AD9' }}>• "{searchQuery}"</span>}
          </span>
        </div>

        {/* Right: Actions Bar (Filtros Toggle + Export Buttons) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          
          {/* Main "Filtros" Toggle Button */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="btn-neu"
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: showFilters ? '#00D6BC' : activeFilterCount > 0 ? '#E6FAF7' : '#FFFFFF',
              borderColor: showFilters || activeFilterCount > 0 ? '#00D6BC' : '#CBD5E1',
              color: showFilters ? '#0F172A' : activeFilterCount > 0 ? '#008272' : '#334155',
              borderRadius: 8
            }}
          >
            <SlidersHorizontal size={14} />
            <span>{showFilters ? 'Ocultar Filtros' : 'Filtros'}</span>
            {activeFilterCount > 0 && (
              <span style={{
                background: showFilters ? '#0F172A' : '#00D6BC',
                color: '#FFFFFF',
                borderRadius: 10,
                padding: '1px 6px',
                fontSize: '0.65rem',
                fontWeight: 800
              }}>
                {activeFilterCount}
              </span>
            )}
            <ChevronDown size={13} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {/* Excel Export */}
          <button
            type="button"
            onClick={downloadExcel}
            className="btn-neu"
            style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, height: 34, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 8 }}
            title="Descargar archivo Excel"
          >
            <FileSpreadsheet size={15} style={{ color: '#00D6BC' }} />
            <span>Excel</span>
          </button>

          {/* PDF Export */}
          <button
            type="button"
            onClick={downloadPDF}
            className="btn-neu"
            style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, height: 34, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 8 }}
            title="Descargar reporte en PDF"
          >
            <FileText size={15} style={{ color: '#714AD9' }} />
            <span>PDF</span>
          </button>

          {/* Print */}
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-neu btn-ghost"
            style={{ padding: '6px 10px', fontSize: '0.78rem', fontWeight: 600, height: 34, display: 'flex', alignItems: 'center', gap: 4, borderRadius: 8 }}
            title="Imprimir"
          >
            <Printer size={15} />
          </button>
        </div>
      </div>

      {/* ── COLLAPSIBLE FILTERS DRAWER (ONLY VISIBLE WHEN TOGGLED) ── */}
      {showFilters && (
        <div className="neu-card animate-scale-in" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, background: '#FAFAFA' }}>
          
          {/* Row 1: Quick Presets + Custom Dates */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginRight: 4 }}>
                Rango rápido:
              </span>
              {[
                { id: 'today', label: 'Hoy' },
                { id: '7days', label: '7 días' },
                { id: '30days', label: '30 días' },
                { id: 'this_month', label: 'Este mes' },
                { id: 'last_month', label: 'Mes anterior' },
                { id: 'this_year', label: 'Este año' },
                { id: 'all', label: 'Histórico' },
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPeriodPreset(p.id as PeriodPreset)
                    setStartDate('')
                    setEndDate('')
                  }}
                  className="btn-neu"
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.7rem',
                    fontWeight: periodPreset === p.id ? 800 : 500,
                    background: periodPreset === p.id ? '#00D6BC' : '#FFFFFF',
                    color: periodPreset === p.id ? '#0F172A' : '#64748B',
                    borderColor: periodPreset === p.id ? '#00BAA4' : '#E2E8F0',
                    borderRadius: 6
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Manual Date Range */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B' }}>Desde:</label>
                <input
                  type="date"
                  className="input-neu"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value)
                    setPeriodPreset('custom')
                  }}
                  style={{ padding: '2px 6px', fontSize: '0.74rem', width: 120, height: 26 }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B' }}>Hasta:</label>
                <input
                  type="date"
                  className="input-neu"
                  value={endDate}
                  onChange={e => {
                    setEndDate(e.target.value)
                    setPeriodPreset('custom')
                  }}
                  style={{ padding: '2px 6px', fontSize: '0.74rem', width: 120, height: 26 }}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Live Search + Contextual Filters + Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            
            {/* Search Input */}
            <div className="input-group" style={{ flex: '1 1 200px', maxWidth: 320 }}>
              <Search size={13} className="input-icon" />
              <input
                type="text"
                className="input-neu"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por folio, cliente, SKU o producto..."
                style={{ fontSize: '0.76rem', padding: '4px 8px 4px 30px', height: 28 }}
              />
            </div>

            {/* Contextual Filters */}
            {activeTab === 'sales' && (
              <select
                className="input-neu"
                value={paymentMethodFilter}
                onChange={e => setPaymentMethodFilter(e.target.value)}
                style={{ fontSize: '0.74rem', padding: '3px 8px', height: 28, width: 'auto', background: '#FFFFFF' }}
              >
                <option value="all">💳 Todos los medios de pago</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Nequi">Nequi</option>
                <option value="Daviplata">Daviplata</option>
                <option value="Tarjeta">Tarjeta Débito/Crédito</option>
                <option value="Transferencia">Transferencia Bancaria</option>
              </select>
            )}

            {activeTab === 'inventory' && (
              <>
                <select
                  className="input-neu"
                  value={stockStatusFilter}
                  onChange={e => setStockStatusFilter(e.target.value)}
                  style={{ fontSize: '0.74rem', padding: '3px 8px', height: 28, width: 'auto', background: '#FFFFFF' }}
                >
                  <option value="all">📦 Todo el stock</option>
                  <option value="low_stock">⚠️ Stock bajo (≤ alerta)</option>
                  <option value="out_of_stock">⛔ Agotados (0 u)</option>
                  <option value="in_stock">✅ Con existencias (&gt;0)</option>
                </select>

                {categoriesList.length > 0 && (
                  <select
                    className="input-neu"
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    style={{ fontSize: '0.74rem', padding: '3px 8px', height: 28, width: 'auto', background: '#FFFFFF' }}
                  >
                    <option value="all">🏷️ Todas las categorías</option>
                    {categoriesList.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}
              </>
            )}

            {activeTab === 'customers' && (
              <select
                className="input-neu"
                value={debtFilter}
                onChange={e => setDebtFilter(e.target.value)}
                style={{ fontSize: '0.74rem', padding: '3px 8px', height: 28, width: 'auto', background: '#FFFFFF' }}
              >
                <option value="all">👥 Todos los clientes</option>
                <option value="has_debt">📕 Con saldo pendiente (Fiao)</option>
                <option value="no_debt">✅ Al día (Sin deuda)</option>
              </select>
            )}

            {activeTab === 'purchases' && suppliersList.length > 0 && (
              <select
                className="input-neu"
                value={supplierFilter}
                onChange={e => setSupplierFilter(e.target.value)}
                style={{ fontSize: '0.74rem', padding: '3px 8px', height: 28, width: 'auto', background: '#FFFFFF' }}
              >
                <option value="all">🚚 Todos los proveedores</option>
                {suppliersList.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}

            {activeTab === 'cash' && (
              <select
                className="input-neu"
                value={cashStatusFilter}
                onChange={e => setCashStatusFilter(e.target.value)}
                style={{ fontSize: '0.74rem', padding: '3px 8px', height: 28, width: 'auto', background: '#FFFFFF' }}
              >
                <option value="all">💵 Todas las sesiones</option>
                <option value="diff">⚠️ Con descuadre / diferencia</option>
                <option value="exact">✅ Cuadradas exactamente</option>
              </select>
            )}

            {/* Reset Filters */}
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn-neu btn-ghost"
              style={{ padding: '3px 8px', fontSize: '0.72rem', height: 28, display: 'flex', alignItems: 'center', gap: 4 }}
              title="Restablecer filtros"
            >
              <RefreshCw size={11} />
              <span>Limpiar</span>
            </button>

            {/* Close drawer */}
            <button
              type="button"
              onClick={() => setShowFilters(false)}
              className="btn-neu btn-ghost"
              style={{ padding: '3px 8px', fontSize: '0.72rem', height: 28, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: '#64748B' }}
            >
              <X size={13} />
              <span>Cerrar</span>
            </button>
          </div>
        </div>
      )}

      {/* ── COMPACT INLINE KPIS ROW (SPACE-EFFICIENT) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
        {activeTab === 'sales' && (
          <>
            <div className="neu-card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Ventas Totales</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0F172A', marginTop: 1 }}>
                  {formatCurrency(filteredSales.reduce((s, x) => s + Number(x.total || 0), 0))}
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#008272', background: '#E6FAF7', padding: '3px 8px', borderRadius: 6 }}>
                {filteredSales.length} tickets
              </div>
            </div>
            <div className="neu-card" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Ticket Promedio</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#008272', marginTop: 1 }}>
                {formatCurrency(filteredSales.length ? filteredSales.reduce((s, x) => s + Number(x.total || 0), 0) / filteredSales.length : 0)}
              </div>
            </div>
            <div className="neu-card" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Descuentos</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#714AD9', marginTop: 1 }}>
                {formatCurrency(filteredSales.reduce((s, x) => s + Number(x.discount_amount || 0), 0))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'inventory' && (
          <>
            <div className="neu-card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Valor Total Inventario</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0F172A', marginTop: 1 }}>
                  {formatCurrency(filteredProducts.reduce((s, p) => s + (p.inventory?.reduce((a: number, c: any) => a + Number(c.quantity || 0), 0) || 0) * Number(p.cost_price || 0), 0))}
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#008272', background: '#E6FAF7', padding: '3px 8px', borderRadius: 6 }}>
                {filteredProducts.length} prods
              </div>
            </div>
            <div className="neu-card" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Stock Bajo / Agotado</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#DC2626', marginTop: 1 }}>
                {filteredProducts.filter(p => (p.inventory?.reduce((a: number, c: any) => a + Number(c.quantity || 0), 0) || 0) <= Number(p.min_stock || 5)).length} alertas
              </div>
            </div>
            <div className="neu-card" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Margen Promedio</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#008272', marginTop: 1 }}>
                {filteredProducts.length > 0 ? (
                  (filteredProducts.reduce((acc, p) => {
                    const price = Number(p.sale_price || 0)
                    const cost = Number(p.cost_price || 0)
                    return acc + (price > 0 ? ((price - cost) / price) * 100 : 0)
                  }, 0) / filteredProducts.length).toFixed(1)
                ) : '0'}%
              </div>
            </div>
          </>
        )}

        {activeTab === 'customers' && (
          <>
            <div className="neu-card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Cartera Fiada Total</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#DC2626', marginTop: 1 }}>
                  {formatCurrency(filteredCustomers.reduce((s, c) => s + Number(c.credit_used || 0), 0))}
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', background: '#F1F5F9', padding: '3px 8px', borderRadius: 6 }}>
                {filteredCustomers.length} clientes
              </div>
            </div>
            <div className="neu-card" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Cupo Total Otorgado</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0F172A', marginTop: 1 }}>
                {formatCurrency(filteredCustomers.reduce((s, c) => s + Number(c.credit_limit || 0), 0))}
              </div>
            </div>
            <div className="neu-card" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Clientes con Deuda</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#714AD9', marginTop: 1 }}>
                {filteredCustomers.filter(c => Number(c.credit_used || 0) > 0).length} personas
              </div>
            </div>
          </>
        )}

        {activeTab === 'purchases' && (
          <>
            <div className="neu-card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Compras Totales</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0F172A', marginTop: 1 }}>
                  {formatCurrency(filteredPurchases.reduce((s, p) => s + Number(p.total || 0), 0))}
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#008272', background: '#E6FAF7', padding: '3px 8px', borderRadius: 6 }}>
                {filteredPurchases.length} órdenes
              </div>
            </div>
            <div className="neu-card" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Proveedores Activos</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#008272', marginTop: 1 }}>
                {suppliersList.length} proveedores
              </div>
            </div>
          </>
        )}

        {activeTab === 'cash' && (
          <>
            <div className="neu-card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Efectivo Esperado Total</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0F172A', marginTop: 1 }}>
                  {formatCurrency(filteredCashSessions.reduce((s, c) => s + Number(c.expected_amount || 0), 0))}
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', background: '#F1F5F9', padding: '3px 8px', borderRadius: 6 }}>
                {filteredCashSessions.length} turnos
              </div>
            </div>
            <div className="neu-card" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Diferencia Neta</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: filteredCashSessions.reduce((s, c) => s + Number(c.difference_amount || 0), 0) < 0 ? '#DC2626' : '#059669', marginTop: 1 }}>
                {formatCurrency(filteredCashSessions.reduce((s, c) => s + Number(c.difference_amount || 0), 0))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'pnl' && (
          <>
            <div className="neu-card" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Ventas Netas</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0F172A', marginTop: 1 }}>
                {formatCurrency(pnlMetrics.netSales)}
              </div>
            </div>
            <div className="neu-card" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Costo COGS</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#64748B', marginTop: 1 }}>
                {formatCurrency(pnlMetrics.costOfGoods)}
              </div>
            </div>
            <div className="neu-card" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Utilidad Bruta</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#059669', marginTop: 1 }}>
                {formatCurrency(pnlMetrics.grossProfit)}
              </div>
            </div>
            <div className="neu-card" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Margen Bruto</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#008272', marginTop: 1 }}>
                {pnlMetrics.marginPct}%
              </div>
            </div>
          </>
        )}

        {activeTab === 'refunds' && (
          <>
            <div className="neu-card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Reembolsado</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#DC2626', marginTop: 1 }}>
                  {formatCurrency(filteredRefunds.reduce((s, r) => s + Number(r.total_refunded || 0), 0))}
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', background: '#F1F5F9', padding: '3px 8px', borderRadius: 6 }}>
                {filteredRefunds.length} dev.
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── DATA TABLE (OCCUPIES MAXIMUM SCREEN REAL ESTATE) ── */}
      <div className="neu-card" style={{ padding: 0, overflow: 'hidden' }}>
        
        {/* Table Subtitle Bar */}
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFA' }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155' }}>
            Resultados ({
              activeTab === 'sales' ? filteredSales.length :
              activeTab === 'inventory' ? filteredProducts.length :
              activeTab === 'customers' ? filteredCustomers.length :
              activeTab === 'purchases' ? filteredPurchases.length :
              activeTab === 'cash' ? filteredCashSessions.length :
              activeTab === 'refunds' ? filteredRefunds.length : 7
            } registros)
          </div>
          <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
            {businessName} • Actualizado en vivo
          </div>
        </div>

        <div style={{ width: '100%', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem', tableLayout: 'fixed' }}>
            
            {/* 1. VENTAS */}
            {activeTab === 'sales' && (
              <>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '8px 14px', width: '15%' }}>Folio</th>
                    <th style={{ padding: '8px 14px', width: '15%' }}>Fecha</th>
                    <th style={{ padding: '8px 14px', width: '23%' }}>Cliente</th>
                    <th style={{ padding: '8px 14px', width: '16%' }}>Método Pago</th>
                    <th style={{ padding: '8px 14px', width: '11%', textAlign: 'right' }}>Subtotal</th>
                    <th style={{ padding: '8px 14px', width: '10%', textAlign: 'right' }}>Descuento</th>
                    <th style={{ padding: '8px 14px', width: '11%', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                      <td style={{ padding: '8px 14px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>{s.number}</td>
                      <td style={{ padding: '8px 14px', color: '#64748B' }}>{formatDate(s.created_at)}</td>
                      <td style={{ padding: '8px 14px', fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.customers?.full_name || 'Público General'}</td>
                      <td style={{ padding: '8px 14px' }}>
                        <span className="badge badge-gray">{s.payments?.[0]?.payment_method || 'Efectivo'}</span>
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', color: '#64748B' }}>{formatCurrency(s.subtotal || s.total)}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', color: '#714AD9' }}>{Number(s.discount_amount) > 0 ? formatCurrency(s.discount_amount) : '-'}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>{formatCurrency(s.total)}</td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px 14px', textAlign: 'center', color: '#94A3B8' }}>
                        No se encontraron ventas con los filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
                {filteredSales.length > 0 && (
                  <tfoot>
                    <tr style={{ background: '#F8FAFC', borderTop: '2px solid #E2E8F0', fontWeight: 800 }}>
                      <td colSpan={4} style={{ padding: '10px 14px', textTransform: 'uppercase', color: '#334155' }}>Total General</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>{formatCurrency(filteredSales.reduce((s, x) => s + Number(x.subtotal || x.total || 0), 0))}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#714AD9' }}>{formatCurrency(filteredSales.reduce((s, x) => s + Number(x.discount_amount || 0), 0))}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#008272', fontSize: '0.86rem' }}>{formatCurrency(filteredSales.reduce((s, x) => s + Number(x.total || 0), 0))}</td>
                    </tr>
                  </tfoot>
                )}
              </>
            )}

            {/* 2. INVENTARIO */}
            {activeTab === 'inventory' && (
              <>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '8px 14px', width: '13%' }}>SKU</th>
                    <th style={{ padding: '8px 14px', width: '27%' }}>Producto</th>
                    <th style={{ padding: '8px 14px', width: '16%' }}>Categoría</th>
                    <th style={{ padding: '8px 14px', width: '10%', textAlign: 'center' }}>Stock</th>
                    <th style={{ padding: '8px 14px', width: '11%', textAlign: 'right' }}>Costo</th>
                    <th style={{ padding: '8px 14px', width: '11%', textAlign: 'right' }}>Precio</th>
                    <th style={{ padding: '8px 14px', width: '12%', textAlign: 'right' }}>Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p, i) => {
                    const stock = p.inventory?.reduce((acc: number, curr: any) => acc + Number(curr.quantity || 0), 0) || 0
                    const cost = Number(p.cost_price || 0)
                    const price = Number(p.sale_price || 0)
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                        <td style={{ padding: '8px 14px', fontFamily: 'monospace', color: '#64748B' }}>{p.sku || '-'}</td>
                        <td style={{ padding: '8px 14px', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                        <td style={{ padding: '8px 14px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.categories?.name || 'General'}</td>
                        <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                          <span className={`badge ${stock <= 0 ? 'badge-coral' : stock <= Number(p.min_stock || 5) ? 'badge-amber' : 'badge-green'}`}>
                            {stock} u
                          </span>
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', color: '#64748B' }}>{formatCurrency(cost)}</td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>{formatCurrency(price)}</td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>{formatCurrency(stock * cost)}</td>
                      </tr>
                    )
                  })}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px 14px', textAlign: 'center', color: '#94A3B8' }}>
                        No se encontraron productos con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
                {filteredProducts.length > 0 && (
                  <tfoot>
                    <tr style={{ background: '#F8FAFC', borderTop: '2px solid #E2E8F0', fontWeight: 800 }}>
                      <td colSpan={3} style={{ padding: '10px 14px', textTransform: 'uppercase' }}>Valor Total Inventario</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>{filteredProducts.reduce((s, p) => s + (p.inventory?.reduce((a: number, c: any) => a + Number(c.quantity || 0), 0) || 0), 0)} u</td>
                      <td colSpan={2}></td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#008272', fontSize: '0.86rem' }}>
                        {formatCurrency(filteredProducts.reduce((s, p) => s + (p.inventory?.reduce((a: number, c: any) => a + Number(c.quantity || 0), 0) || 0) * Number(p.cost_price || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </>
            )}

            {/* 3. CLIENTES & CARTERA */}
            {activeTab === 'customers' && (
              <>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '8px 14px', width: '26%' }}>Cliente</th>
                    <th style={{ padding: '8px 14px', width: '16%' }}>Teléfono</th>
                    <th style={{ padding: '8px 14px', width: '15%', textAlign: 'right' }}>Cupo Asignado</th>
                    <th style={{ padding: '8px 14px', width: '15%', textAlign: 'right' }}>Deuda (Fiado)</th>
                    <th style={{ padding: '8px 14px', width: '15%', textAlign: 'right' }}>Disponible</th>
                    <th style={{ padding: '8px 14px', width: '13%', textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c, i) => {
                    const debt = Number(c.credit_used || 0)
                    const limit = Number(c.credit_limit || 0)
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                        <td style={{ padding: '8px 14px', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.full_name}</td>
                        <td style={{ padding: '8px 14px', color: '#64748B' }}>{c.phone || '-'}</td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', color: '#64748B' }}>{formatCurrency(limit)}</td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 800, color: debt > 0 ? '#DC2626' : '#059669' }}>
                          {formatCurrency(debt)}
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', color: '#334155' }}>{formatCurrency(Math.max(0, limit - debt))}</td>
                        <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                          <span className={`badge ${debt > 0 ? 'badge-coral' : 'badge-green'}`}>
                            {debt > 0 ? 'Deudor' : 'Al día'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '36px 14px', textAlign: 'center', color: '#94A3B8' }}>
                        No se encontraron clientes con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
                {filteredCustomers.length > 0 && (
                  <tfoot>
                    <tr style={{ background: '#F8FAFC', borderTop: '2px solid #E2E8F0', fontWeight: 800 }}>
                      <td colSpan={3} style={{ padding: '10px 14px', textTransform: 'uppercase' }}>Total Cartera por Cobrar</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#DC2626', fontSize: '0.86rem' }}>
                        {formatCurrency(filteredCustomers.reduce((s, c) => s + Number(c.credit_used || 0), 0))}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </>
            )}

            {/* 4. COMPRAS */}
            {activeTab === 'purchases' && (
              <>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '8px 14px', width: '20%' }}>Número OC</th>
                    <th style={{ padding: '8px 14px', width: '36%' }}>Proveedor</th>
                    <th style={{ padding: '8px 14px', width: '20%' }}>Fecha</th>
                    <th style={{ padding: '8px 14px', width: '12%', textAlign: 'center' }}>Estado</th>
                    <th style={{ padding: '8px 14px', width: '12%', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                      <td style={{ padding: '8px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>{p.number}</td>
                      <td style={{ padding: '8px 14px', fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.suppliers?.company_name || 'General'}</td>
                      <td style={{ padding: '8px 14px', color: '#64748B' }}>{formatDate(p.order_date || p.created_at)}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                        <span className="badge badge-green">{p.status || 'Completada'}</span>
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>{formatCurrency(p.total)}</td>
                    </tr>
                  ))}
                  {filteredPurchases.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '36px 14px', textAlign: 'center', color: '#94A3B8' }}>
                        No se encontraron compras con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </>
            )}

            {/* 5. CAJAS & TURNOS */}
            {activeTab === 'cash' && (
              <>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '8px 14px', width: '14%' }}>Turno</th>
                    <th style={{ padding: '8px 14px', width: '20%' }}>Apertura</th>
                    <th style={{ padding: '8px 14px', width: '20%' }}>Cierre</th>
                    <th style={{ padding: '8px 14px', width: '18%', textAlign: 'right' }}>Esperado</th>
                    <th style={{ padding: '8px 14px', width: '16%', textAlign: 'right' }}>Diferencia</th>
                    <th style={{ padding: '8px 14px', width: '12%', textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCashSessions.map((cs, i) => {
                    const diff = Number(cs.difference_amount || 0)
                    return (
                      <tr key={cs.id} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                        <td style={{ padding: '8px 14px', fontFamily: 'monospace', fontWeight: 700 }}>#{cs.id?.slice(0, 6)}</td>
                        <td style={{ padding: '8px 14px', color: '#64748B' }}>{formatDate(cs.opened_at)}</td>
                        <td style={{ padding: '8px 14px', color: '#64748B' }}>{cs.closed_at ? formatDate(cs.closed_at) : 'En curso'}</td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(cs.expected_amount)}</td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 800, color: diff === 0 ? '#059669' : diff < 0 ? '#DC2626' : '#714AD9' }}>{formatCurrency(diff)}</td>
                        <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                          <span className={`badge ${cs.status === 'open' ? 'badge-blue' : diff === 0 ? 'badge-green' : 'badge-coral'}`}>
                            {cs.status === 'open' ? 'Abierta' : diff === 0 ? 'Cuadrada' : 'Descuadre'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredCashSessions.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '36px 14px', textAlign: 'center', color: '#94A3B8' }}>
                        No se encontraron sesiones de caja en el período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </>
            )}

            {/* 6. ESTADO DE RESULTADOS P&L */}
            {activeTab === 'pnl' && (
              <>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '10px 16px' }}>Concepto Financiero</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Monto Contable</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>% sobre Ventas</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#FFFFFF' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600 }}>Ventas Brutas Totales</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(pnlMetrics.grossSales)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#64748B' }}>100.0%</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#FAFAFA' }}>
                    <td style={{ padding: '10px 16px', color: '#DC2626' }}>(-) Descuentos y Rebajas Concedidas</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#DC2626', fontWeight: 700 }}>-{formatCurrency(pnlMetrics.discounts)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#64748B' }}>
                      {pnlMetrics.grossSales > 0 ? ((pnlMetrics.discounts / pnlMetrics.grossSales) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#E6FAF7', fontWeight: 800 }}>
                    <td style={{ padding: '10px 16px', color: '#008272' }}>(=) Ventas Netas Facturadas</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#008272' }}>{formatCurrency(pnlMetrics.netSales)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#008272' }}>100.0%</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#FAFAFA' }}>
                    <td style={{ padding: '10px 16px', color: '#64748B' }}>(-) Costo de Mercancía Vendida (COGS estimado)</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#64748B', fontWeight: 700 }}>-{formatCurrency(pnlMetrics.costOfGoods)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#64748B' }}>
                      {pnlMetrics.netSales > 0 ? ((pnlMetrics.costOfGoods / pnlMetrics.netSales) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr style={{ background: '#ECFDF5', borderTop: '2px solid #A7F3D0', fontWeight: 900, fontSize: '0.84rem' }}>
                    <td style={{ padding: '12px 16px', color: '#059669' }}>(=) UTILIDAD BRUTA ESTIMADA</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#059669' }}>{formatCurrency(pnlMetrics.grossProfit)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#059669' }}>{pnlMetrics.marginPct}%</td>
                  </tr>
                </tbody>
              </>
            )}

            {/* 7. DEVOLUCIONES */}
            {activeTab === 'refunds' && (
              <>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '8px 14px', width: '18%' }}>Folio Dev.</th>
                    <th style={{ padding: '8px 14px', width: '18%' }}>Venta Orig.</th>
                    <th style={{ padding: '8px 14px', width: '18%' }}>Fecha</th>
                    <th style={{ padding: '8px 14px', width: '32%' }}>Cliente</th>
                    <th style={{ padding: '8px 14px', width: '14%', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRefunds.map((r, i) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                      <td style={{ padding: '8px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>{r.number}</td>
                      <td style={{ padding: '8px 14px', fontFamily: 'monospace', color: '#64748B' }}>{r.sales?.number || '-'}</td>
                      <td style={{ padding: '8px 14px', color: '#64748B' }}>{formatDate(r.created_at)}</td>
                      <td style={{ padding: '8px 14px', fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sales?.customers?.full_name || 'Cliente general'}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 800, color: '#DC2626' }}>{formatCurrency(r.total_refunded)}</td>
                    </tr>
                  ))}
                  {filteredRefunds.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '36px 14px', textAlign: 'center', color: '#94A3B8' }}>
                        No se registraron devoluciones en el período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </>
            )}

          </table>
        </div>
      </div>
    </div>
  )
}
