'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  BarChart3,
  Package,
  Users,
  DollarSign,
  ClipboardList,
  Truck,
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  X,
  TrendingUp,
  Calendar,
  Layers
} from 'lucide-react'

interface MonthlySalesData {
  month: string
  ventas: number
  pedidos: number
}

export default function ReportsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState('')
  const [businessName, setBusinessName] = useState('MI TIENDA')
  const [taxId, setTaxId] = useState('901234567-1')

  // Real data state
  const [sales, setSales] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [cashSessions, setCashSessions] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([])
  const [monthlyChart, setMonthlyChart] = useState<MonthlySalesData[]>([])

  // Active Detailed Report Modal
  const [activeReportModal, setActiveReportModal] = useState<string | null>(null)

  useEffect(() => {
    async function loadAllReportData() {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const tid = user.user_metadata?.tenant_id
        if (!tid) return
        setTenantId(tid)

        // 1. Settings
        const { data: tSettings } = await supabase
          .from('tenant_settings')
          .select('business_name, tax_id')
          .eq('tenant_id', tid)
          .limit(1)

        if (tSettings?.[0]) {
          setBusinessName(tSettings[0].business_name || 'MI NEGOCIO')
          setTaxId(tSettings[0].tax_id || '901234567-1')
        }

        // 2. Sales
        const { data: salesData } = await supabase
          .from('sales')
          .select(`
            id, number, subtotal, discount_amount, tax_amount, total, change_amount,
            payment_status, created_at, customer_id,
            customers (full_name, phone),
            sale_items (product_name, quantity, unit_price, total, cost_price),
            payments (payment_method, amount)
          `)
          .eq('tenant_id', tid)
          .order('created_at', { ascending: false })

        const loadedSales = salesData || []
        setSales(loadedSales)

        // Compute Monthly Sales Aggregation
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        const currentYear = new Date().getFullYear()
        const monthlyMap: Record<string, { ventas: number; pedidos: number }> = {}

        monthNames.forEach(m => { monthlyMap[m] = { ventas: 0, pedidos: 0 } })

        loadedSales.forEach(s => {
          const d = new Date(s.created_at)
          if (d.getFullYear() === currentYear) {
            const mName = monthNames[d.getMonth()]
            monthlyMap[mName].ventas += Number(s.total || 0)
            monthlyMap[mName].pedidos += 1
          }
        })

        const chartArray = monthNames.map(m => ({
          month: m,
          ventas: monthlyMap[m].ventas,
          pedidos: monthlyMap[m].pedidos
        }))
        setMonthlyChart(chartArray)

        // 3. Products & Stock
        const { data: prodData } = await supabase
          .from('products')
          .select('id, name, sku, sale_price, cost_price, is_active, categories(name), inventory(quantity)')
          .eq('tenant_id', tid)
        setProducts(prodData || [])

        // 4. Customers
        const { data: custData } = await supabase
          .from('customers')
          .select('*')
          .eq('tenant_id', tid)
          .order('credit_used', { ascending: false })
        setCustomers(custData || [])

        // 5. Cash Sessions
        const { data: sessData } = await supabase
          .from('cash_sessions')
          .select('*')
          .eq('tenant_id', tid)
          .order('opened_at', { ascending: false })
        setCashSessions(sessData || [])

        // 6. Purchases
        const { data: poData } = await supabase
          .from('purchase_orders')
          .select('*, suppliers(company_name)')
          .eq('tenant_id', tid)
          .order('created_at', { ascending: false })
        setPurchases(poData || [])

      } catch (err) {
        console.error('Error loading report data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadAllReportData()
  }, [])

  function downloadCSV(csvContent: string, filename: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // EXPORT: Refunds Excel / CSV
  function exportRefundsExcel() {
    if (refunds.length === 0) return alert('No hay devoluciones para exportar')
    let csv = '\uFEFF'
    csv += `REPORTE DE DEVOLUCIONES - ${businessName.toUpperCase()}\n`
    csv += `Generado: ${new Date().toLocaleString('es-CO')}\n\n`
    csv += 'Folio Devolucion,Venta Original,Fecha,Cliente,Motivo,Tipo,Metodo Reembolso,Total Devuelto\n'
    refunds.forEach(r => {
      csv += `"${r.number}","${r.sales?.number || ''}","${formatDate(r.created_at)}","${r.sales?.customers?.full_name || 'Cliente general'}","${r.reason || ''}","${r.refund_type}","${r.payment_method}","${r.total_refunded}"\n`
    })
    downloadCSV(csv, `MrTender_Devoluciones_${new Date().toISOString().split('T')[0]}.csv`)
  }

  function exportSalesExcel() {
    if (sales.length === 0) {
      alert('No hay ventas registradas para exportar.')
      return
    }

    let csvContent = '\uFEFF' // UTF-8 BOM for Excel
    csvContent += `REPORTE DE VENTAS - ${businessName.toUpperCase()}\n`
    csvContent += `NIT: ${taxId} - Generado: ${new Date().toLocaleString('es-CO')}\n\n`
    csvContent += 'Folio,Fecha,Cliente,Telefono,MetodoPago,Subtotal,Descuento,Total\n'

    sales.forEach(s => {
      const clientName = s.customers?.full_name?.replace(/,/g, ' ') || 'Publico General'
      const clientPhone = s.customers?.phone || 'N/A'
      const payMethod = s.payments?.[0]?.payment_method || 'Efectivo'
      const date = new Date(s.created_at).toLocaleString('es-CO').replace(/,/g, ' ')

      csvContent += `${s.number},${date},${clientName},${clientPhone},${payMethod},${s.subtotal || s.total},${s.discount_amount || 0},${s.total}\n`
    })

    const totalVentas = sales.reduce((acc, s) => acc + Number(s.total || 0), 0)
    csvContent += `\nTOTAL GENERAL,,,,,,,${totalVentas}\n`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `reporte_ventas_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // EXPORT 2: Inventory Excel / CSV
  function exportInventoryExcel() {
    if (products.length === 0) {
      alert('No hay productos en el inventario.')
      return
    }

    let csvContent = '\uFEFF'
    csvContent += `REPORTE DE INVENTARIO Y STOCK - ${businessName.toUpperCase()}\n`
    csvContent += `Fecha: ${new Date().toLocaleString('es-CO')}\n\n`
    csvContent += 'SKU,Producto,Categoria,Stock,CostoUnitario,PrecioVenta,MargenPct,ValorInventario\n'

    let totalVal = 0
    products.forEach(p => {
      const stock = p.inventory?.reduce((acc: number, curr: any) => acc + Number(curr.quantity || 0), 0) || 0
      const cat = p.categories?.name?.replace(/,/g, ' ') || 'General'
      const cost = Number(p.cost_price || 0)
      const price = Number(p.sale_price || 0)
      const margin = price > 0 ? (((price - cost) / price) * 100).toFixed(0) : '0'
      const val = stock * cost
      totalVal += val

      csvContent += `${p.sku || 'N/A'},${p.name.replace(/,/g, ' ')},${cat},${stock},${cost},${price},${margin}%,${val}\n`
    })

    csvContent += `\nVALOR TOTAL INVENTARIO (COSTO),,,,,,,${totalVal}\n`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `reporte_inventario_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // EXPORT 3: Customers / Fiao Excel
  function exportCustomersExcel() {
    let csvContent = '\uFEFF'
    csvContent += `REPORTE DE CLIENTES Y LIBRETA DE FIAO - ${businessName.toUpperCase()}\n`
    csvContent += `Fecha: ${new Date().toLocaleString('es-CO')}\n\n`
    csvContent += 'Cliente,Telefono,CupoCredito,DeudaActual,Disponible,ComprasTotales,Pedidos\n'

    customers.forEach(c => {
      const name = c.full_name.replace(/,/g, ' ')
      const phone = c.phone || 'N/A'
      const limit = Number(c.credit_limit || 0)
      const debt = Number(c.credit_used || 0)
      const avail = Math.max(0, limit - debt)
      const purchases = Number(c.total_purchases || 0)
      const orders = Number(c.total_orders || 0)

      csvContent += `${name},${phone},${limit},${debt},${avail},${purchases},${orders}\n`
    })

    const totalDeuda = customers.reduce((acc, c) => acc + Number(c.credit_used || 0), 0)
    csvContent += `\nTOTAL CARTERA POR COBRAR (FIAO),,,${totalDeuda},,,\n`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `reporte_fiao_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // EXPORT 4: Printable Executive PDF Report
  function printExecutiveReport() {
    window.print()
  }

  const REPORT_TYPES = [
    { id: 'sales', Icon: BarChart3, title: 'Ventas por perÃ­odo', desc: 'Reporte detallado de ventas con filtros de fecha, cliente y totales.', color: 'var(--accent-blue)', bg: 'var(--accent-blue-lt)' },
    { id: 'inventory', Icon: Package, title: 'Inventario & Stock', desc: 'Estado del stock, costos, precios de venta y valorizaciÃ³n total.', color: 'var(--accent-green)', bg: 'var(--accent-green-lt)' },
    { id: 'customers', Icon: Users, title: 'Clientes & Libreta de Fiao', desc: 'Saldos pendientes por cobrar, cupos asignados y compras acumuladas.', color: 'var(--accent-purple)', bg: 'var(--accent-purple-lt)' },
    { id: 'cash', Icon: DollarSign, title: 'Caja y arqueos', desc: 'Historial de turnos, efectivo esperado vs contado y diferencias.', color: 'var(--accent-amber)', bg: 'var(--accent-amber-lt)' },
    { id: 'pnl', Icon: ClipboardList, title: 'Estado de resultados (P&L)', desc: 'Ingresos por ventas, costo de mercancÃ­a y ganancia bruta estimada.', color: 'var(--accent-coral)', bg: 'var(--accent-coral-lt)' },
    { id: 'purchases', Icon: Truck, title: 'Proveedores y compras', desc: 'Ã“rdenes de compra, gastos por proveedor y entradas a bodega.', color: 'var(--accent-blue)', bg: 'var(--accent-blue-lt)' },
  ]

  // Compute Financial Totals
  const totalSalesRevenue = sales.reduce((sum, s) => sum + Number(s.total || 0), 0)
  const totalCostOfGoods = sales.reduce((sum, s) => {
    const itemsCost = s.sale_items?.reduce((iSum: number, item: any) => iSum + (Number(item.cost_price || item.unit_price * 0.75) * Number(item.quantity || 1)), 0) || 0
    return sum + itemsCost
  }, 0)
  const grossProfit = totalSalesRevenue - totalCostOfGoods
  const grossMargin = totalSalesRevenue > 0 ? ((grossProfit / totalSalesRevenue) * 100).toFixed(1) : '0'

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Cargando analÃ­tica y reportes...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header & Main Export Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Reportes y AnalÃ­tica</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2 }}>{businessName} â€¢ Actualizado al {new Date().toLocaleDateString('es-CO')}</p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-neu" onClick={exportSalesExcel} style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileSpreadsheet size={15} style={{ color: 'var(--accent-green)' }} />
            <span>Descargar Excel</span>
          </button>
          <button className="btn-neu btn-primary" onClick={printExecutiveReport} style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Printer size={15} />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Financial Overview KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        {[
          { label: 'Ventas Totales', value: formatCurrency(totalSalesRevenue), Icon: DollarSign, color: 'var(--accent-blue)', bg: 'var(--accent-blue-lt)' },
          { label: 'Utilidad Bruta', value: formatCurrency(grossProfit), Icon: TrendingUp, color: 'var(--accent-green)', bg: 'var(--accent-green-lt)' },
          { label: 'Margen Promedio', value: `${grossMargin}%`, Icon: Layers, color: 'var(--accent-purple)', bg: 'var(--accent-purple-lt)' },
          { label: 'Cartera Fiada', value: formatCurrency(customers.reduce((s, c) => s + Number(c.credit_used || 0), 0)), Icon: Users, color: 'var(--accent-coral)', bg: 'var(--accent-coral-lt)' },
        ].map(s => {
          const StatIcon = s.Icon
          return (
            <div key={s.label} className="neu-card-sm" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="kpi-icon-wrap" style={{ background: s.bg, width: 32, height: 32, flexShrink: 0 }}>
                <StatIcon size={16} strokeWidth={2} style={{ color: s.color }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Dynamic Monthly Chart from Real Sales */}
      <div className="neu-card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Ventas Mensuales {new Date().getFullYear()}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Historial consolidado por mes</div>
          </div>
          <span className="badge badge-blue" style={{ fontSize: '0.72rem', padding: '4px 8px' }}>
            {sales.length} transacciones registradas
          </span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-deep)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${Math.round(v/1000)}k`} />
            <Tooltip formatter={v => [`${formatCurrency(Number(v))}`, 'Ventas']} contentStyle={{ background: 'var(--bg)', border: 'none', borderRadius: 12, boxShadow: 'var(--neu-card)', fontSize: 12 }} />
            <Bar dataKey="ventas" fill="#4A90D9" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 6 Interactive Report Cards with Dedicated Exports */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {REPORT_TYPES.map(r => {
          const ReportIcon = r.Icon
          return (
            <button
              key={r.id}
              onClick={() => setActiveReportModal(r.id)}
              className="neu-card"
              style={{ padding: '16px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start', border: 'none', width: '100%', textAlign: 'left' }}
            >
              <div className="kpi-icon-wrap" style={{ background: r.bg, width: 36, height: 36, flexShrink: 0 }}>
                <ReportIcon size={18} strokeWidth={2} style={{ color: r.color }} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2, fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{r.title}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-blue)' }}>Ver â†’</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>{r.desc}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* â”€â”€ MODAL: DETAILED REPORT EXPLORER & EXPORTER â”€â”€ */}
      {activeReportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 20 }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {REPORT_TYPES.find(r => r.id === activeReportModal)?.title}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>{businessName} â€¢ Datos al dÃ­a</p>
              </div>
              <button className="btn-neu btn-ghost" onClick={() => setActiveReportModal(null)} style={{ padding: '2px 6px' }}>âœ•</button>
            </div>

            {/* Modal Content Switch */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
              
              {/* 1. VENTAS */}
              {activeReportModal === 'sales' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sales.map(s => (
                    <div key={s.id} className="neu-flat" style={{ padding: '8px 10px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                      <div>
                        <strong>{s.number}</strong>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{formatDate(s.created_at)}</span>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Cliente: {s.customers?.full_name || 'PÃºblico General'}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-blue)' }}>
                        {formatCurrency(s.total)}
                      </div>
                    </div>
                  ))}
                  {sales.length === 0 && <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Sin ventas registradas</div>}
                </div>
              )}

              {/* 2. INVENTARIO */}
              {activeReportModal === 'inventory' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {products.map(p => {
                    const stock = p.inventory?.reduce((acc: number, curr: any) => acc + Number(curr.quantity || 0), 0) || 0
                    return (
                      <div key={p.id} className="neu-flat" style={{ padding: '8px 10px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                        <div>
                          <strong>{p.name}</strong>
                          <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>SKU: {p.sku || 'N/A'}</span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Costo: {formatCurrency(p.cost_price)} | Precio: {formatCurrency(p.sale_price)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className={`badge ${stock <= 5 ? 'badge-coral' : 'badge-green'}`}>{stock} u</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* 3. CLIENTES / FIAO */}
              {activeReportModal === 'customers' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {customers.map(c => (
                    <div key={c.id} className="neu-flat" style={{ padding: '8px 10px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                      <div>
                        <strong>{c.full_name}</strong>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tel: {c.phone || 'N/A'} â€¢ Cupo: {formatCurrency(c.credit_limit)}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontWeight: 800, color: c.credit_used > 0 ? 'var(--accent-coral)' : 'var(--accent-green)' }}>
                        {c.credit_used > 0 ? `Debe: ${formatCurrency(c.credit_used)}` : 'Al dÃ­a'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 4. CAJA */}
              {activeReportModal === 'cash' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {cashSessions.map(cs => (
                    <div key={cs.id} className="neu-flat" style={{ padding: '8px 10px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                      <div>
                        <strong>Turno: {formatDate(cs.opened_at)}</strong>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Apertura: {formatCurrency(cs.opening_amount)} | Estado: {cs.status}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800 }}>Ventas: {formatCurrency(cs.total_sales || 0)}</div>
                        {cs.difference_amount !== null && (
                          <span style={{ fontSize: '0.7rem', color: cs.difference_amount === 0 ? 'var(--accent-green)' : 'var(--accent-coral)' }}>
                            Diff: {formatCurrency(cs.difference_amount)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 5. ESTADO DE RESULTADOS */}
              {activeReportModal === 'pnl' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="neu-flat" style={{ padding: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>(+) Ventas Totales Facturadas</span>
                    <strong>{formatCurrency(totalSalesRevenue)}</strong>
                  </div>
                  <div className="neu-flat" style={{ padding: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between', color: 'var(--accent-coral)' }}>
                    <span>(-) Costo Estimado de MercancÃ­a</span>
                    <strong>-{formatCurrency(totalCostOfGoods)}</strong>
                  </div>
                  <div className="divider" style={{ margin: '4px 0' }} />
                  <div className="neu-flat" style={{ padding: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between', background: 'var(--accent-green-lt)', color: 'var(--accent-green)' }}>
                    <span style={{ fontWeight: 800 }}>(=) Utilidad Bruta Estimada</span>
                    <strong style={{ fontSize: '1.1rem' }}>{formatCurrency(grossProfit)} ({grossMargin}%)</strong>
                  </div>
                </div>
              )}

              {/* 6. COMPRAS Y PROVEEDORES */}
                            {activeReportModal === 'refunds' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--bg-deep)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '8px 6px' }}>Folio</th>
                      <th style={{ padding: '8px 6px' }}>Venta Ref</th>
                      <th style={{ padding: '8px 6px' }}>Fecha</th>
                      <th style={{ padding: '8px 6px' }}>Cliente</th>
                      <th style={{ padding: '8px 6px' }}>Motivo</th>
                      <th style={{ padding: '8px 6px' }}>Método</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total Devuelto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refunds.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--bg-deep)' }}>
                        <td style={{ padding: '8px 6px', fontWeight: 800, color: 'var(--accent-coral)' }}>{r.number}</td>
                        <td style={{ padding: '8px 6px', fontWeight: 700 }}>{r.sales?.number || '-'}</td>
                        <td style={{ padding: '8px 6px', color: 'var(--text-muted)' }}>{formatDate(r.created_at)}</td>
                        <td style={{ padding: '8px 6px' }}>{r.sales?.customers?.full_name || 'Cliente general'}</td>
                        <td style={{ padding: '8px 6px', color: 'var(--text-secondary)' }}>{r.reason}</td>
                        <td style={{ padding: '8px 6px' }}>
                          <span className="badge badge-gray" style={{ fontSize: '0.68rem' }}>
                            {r.payment_method === 'cash' ? 'Efectivo' : r.payment_method === 'fiao' ? 'Crédito/Fiao' : r.payment_method === 'transfer' ? 'Transferencia' : 'Nota Crédito'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 900, color: 'var(--accent-coral)' }}>{formatCurrency(Number(r.total_refunded))}</td>
                      </tr>
                    ))}
                    {refunds.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No hay devoluciones registradas</td></tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeReportModal === 'purchases' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {purchases.map(po => (
                    <div key={po.id} className="neu-flat" style={{ padding: '8px 10px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                      <div>
                        <strong>{po.number}</strong>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{formatDate(po.order_date || po.created_at)}</span>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Proveedor: {po.suppliers?.company_name || 'General'}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-blue)' }}>
                        {formatCurrency(po.total)}
                      </div>
                    </div>
                  ))}
                  {purchases.length === 0 && <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Sin compras registradas</div>}
                </div>
              )}

            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexShrink: 0 }}>
              <button className="btn-neu" onClick={() => setActiveReportModal(null)} style={{ flex: 1, padding: 10 }}>Cerrar</button>
              
              <button className="btn-neu" onClick={() => {
                if (activeReportModal === 'inventory') exportInventoryExcel()
                else if (activeReportModal === 'customers') exportCustomersExcel()
                else exportSalesExcel()
              }} style={{ flex: 1, padding: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <FileSpreadsheet size={15} style={{ color: 'var(--accent-green)' }} />
                <span>Exportar Excel</span>
              </button>

              <button className="btn-neu btn-primary" onClick={printExecutiveReport} style={{ flex: 1, padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Printer size={15} />
                <span>Imprimir PDF</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

