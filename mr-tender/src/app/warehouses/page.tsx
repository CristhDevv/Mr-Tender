'use client'
import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  Building2,
  Package,
  Boxes,
  ArrowLeftRight,
  Plus,
  Search,
  FileSpreadsheet,
  Download,
  Printer,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wrench,
  History,
  MapPin,
  Shield,
  Layers,
  ChevronRight,
  Check,
  X,
  Filter,
  RefreshCw,
  TrendingUp,
  BarChart2
} from 'lucide-react'

interface Warehouse {
  id: string
  name: string
  code: string | null
  address: string | null
  is_main: boolean
  is_active: boolean
  created_at: string
}

interface InventoryItem {
  id: string
  quantity: number
  avg_cost: number
  warehouse_id?: string
  products?: {
    id: string
    name: string
    sku: string | null
    barcode: string | null
    min_stock: number
    max_stock: number
    cost_price: number
    sale_price: number
    categories?: { name: string } | null
  } | null
  warehouses?: {
    id: string
    name: string
    code: string | null
    is_main: boolean
  } | null
}

export default function WarehousesPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState('')
  const [userId, setUserId] = useState('')
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [productsList, setProductsList] = useState<any[]>([])
  const [transfers, setTransfers] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])

  // Selected view: 'all' or warehouse.id
  const [selectedWhId, setSelectedWhId] = useState<string>('all')
  // Sub-tab inside selected warehouse: 'stock' | 'movements' | 'transfers'
  const [whSubTab, setWhSubTab] = useState<'stock' | 'movements' | 'transfers'>('stock')

  // Stock filters
  const [stockSearch, setStockSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Modal states
  const [showWhModal, setShowWhModal] = useState(false)
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null)
  const [whForm, setWhForm] = useState({
    name: '',
    code: '',
    address: '',
    is_main: false,
    is_active: true
  })
  const [savingWh, setSavingWh] = useState(false)

  // Transfer modal
  const [showTrfModal, setShowTrfModal] = useState(false)
  const [trfForm, setTrfForm] = useState({
    from_warehouse_id: '',
    to_warehouse_id: '',
    product_id: '',
    quantity: '1',
    notes: ''
  })
  const [submittingTrf, setSubmittingTrf] = useState(false)

  // Adjustment modal
  const [showAdjModal, setShowAdjModal] = useState(false)
  const [adjForm, setAdjForm] = useState({
    warehouse_id: '',
    product_id: '',
    adjustment_type: 'decrease',
    reason: 'Merma / Deterioro',
    notes: '',
    quantity: '1'
  })
  const [submittingAdj, setSubmittingAdj] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)
      setUserId(user.id)

      const [whRes, invRes, prodRes, trfRes, movRes] = await Promise.all([
        supabase
          .from('warehouses')
          .select('id, name, code, address, is_main, is_active, created_at')
          .eq('tenant_id', tid)
          .order('is_main', { ascending: false })
          .order('name', { ascending: true }),
        supabase
          .from('inventory')
          .select(`
            id, quantity, avg_cost, warehouse_id,
            products (id, name, sku, barcode, min_stock, max_stock, cost_price, sale_price, categories (name)),
            warehouses (id, name, code, is_main)
          `)
          .eq('tenant_id', tid),
        supabase
          .from('products')
          .select('id, name, sku, cost_price, sale_price')
          .eq('tenant_id', tid)
          .eq('is_active', true),
        supabase
          .from('warehouse_transfers')
          .select(`
            id, created_at, status, notes,
            from_warehouse:warehouses!from_warehouse_id(id, name, code),
            to_warehouse:warehouses!to_warehouse_id(id, name, code)
          `)
          .eq('tenant_id', tid)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('stock_movements')
          .select(`
            id, created_at, movement_type, quantity, unit_cost, total_cost, balance_after, notes, warehouse_id,
            products (id, name, sku),
            warehouses (id, name, code)
          `)
          .eq('tenant_id', tid)
          .order('created_at', { ascending: false })
          .limit(100)
      ])

      if (whRes.data) {
        setWarehouses(whRes.data)
        if (whRes.data.length > 0 && selectedWhId === 'all') {
          // Keep 'all' or default
        }
      }
      if (invRes.data) setInventory(invRes.data as any)
      if (prodRes.data) setProductsList(prodRes.data)
      if (trfRes.data) setTransfers(trfRes.data)
      if (movRes.data) setMovements(movRes.data)
    } catch (err) {
      console.error('Error loading warehouse data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Active warehouse object if not 'all'
  const activeWarehouse = warehouses.find(w => w.id === selectedWhId)

  // Filtered inventory items based on selected warehouse
  const whInventory = inventory.filter(i => {
    if (selectedWhId === 'all') return true
    const wid = i.warehouses?.id || i.warehouse_id
    return wid === selectedWhId
  })

  // Available categories in current filtered inventory
  const availableCategories = Array.from(
    new Set(
      whInventory
        .map(i => i.products?.categories?.name)
        .filter(Boolean) as string[]
    )
  ).sort()

  // Filtered stock list based on search & filters
  const displayedStock = whInventory.filter(item => {
    const p = item.products
    if (!p) return false
    const name = (p.name || '').toLowerCase()
    const sku = (p.sku || '').toLowerCase()
    const barcode = (p.barcode || '').toLowerCase()
    const q = stockSearch.toLowerCase()

    const matchesSearch = name.includes(q) || sku.includes(q) || barcode.includes(q)
    if (!matchesSearch) return false

    if (categoryFilter !== 'all' && p.categories?.name !== categoryFilter) {
      return false
    }

    const min = p.min_stock || 0
    if (stockFilter === 'in_stock') return item.quantity > min
    if (stockFilter === 'low_stock') return item.quantity <= min && item.quantity > 0
    if (stockFilter === 'out_of_stock') return item.quantity === 0

    return true
  })

  // Movements filtered for selected warehouse
  const displayedMovements = movements.filter(m => {
    if (selectedWhId === 'all') return true
    return m.warehouse_id === selectedWhId || m.warehouses?.id === selectedWhId
  })

  // Transfers filtered for selected warehouse
  const displayedTransfers = transfers.filter(t => {
    if (selectedWhId === 'all') return true
    return t.from_warehouse?.id === selectedWhId || t.to_warehouse?.id === selectedWhId
  })

  // Total KPIs
  const totalWarehousesCount = warehouses.filter(w => w.is_active !== false).length
  const totalPhysicalUnits = inventory.reduce((s, i) => s + Number(i.quantity || 0), 0)
  const totalValuation = inventory.reduce((s, i) => s + (Number(i.quantity || 0) * Number(i.avg_cost || 0)), 0)
  const mainWarehouse = warehouses.find(w => w.is_main) || warehouses[0]

  // KPIs for selected single warehouse
  const selectedWhUnits = whInventory.reduce((s, i) => s + Number(i.quantity || 0), 0)
  const selectedWhValuation = whInventory.reduce((s, i) => s + (Number(i.quantity || 0) * Number(i.avg_cost || 0)), 0)
  const selectedWhLowStock = whInventory.filter(i => Number(i.quantity || 0) <= Number(i.products?.min_stock || 0) && Number(i.quantity || 0) > 0).length
  const selectedWhOutOfStock = whInventory.filter(i => Number(i.quantity || 0) === 0).length

  // Warehouse CRUD functions
  function openCreateWarehouse() {
    setEditingWh(null)
    setWhForm({
      name: '',
      code: `BOD-00${warehouses.length + 1}`,
      address: '',
      is_main: warehouses.length === 0,
      is_active: true
    })
    setShowWhModal(true)
  }

  function openEditWarehouse(wh: Warehouse) {
    setEditingWh(wh)
    setWhForm({
      name: wh.name || '',
      code: wh.code || '',
      address: wh.address || '',
      is_main: Boolean(wh.is_main),
      is_active: wh.is_active !== false
    })
    setShowWhModal(true)
  }

  async function handleSaveWarehouse(e: React.FormEvent) {
    e.preventDefault()
    if (!whForm.name.trim() || !tenantId) return
    setSavingWh(true)
    try {
      if (whForm.is_main) {
        await supabase
          .from('warehouses')
          .update({ is_main: false })
          .eq('tenant_id', tenantId)
      }

      if (editingWh) {
        const { error } = await supabase
          .from('warehouses')
          .update({
            name: whForm.name.trim(),
            code: whForm.code.trim() || null,
            address: whForm.address.trim() || null,
            is_main: whForm.is_main,
            is_active: whForm.is_active
          })
          .eq('id', editingWh.id)

        if (error) throw error
      } else {
        const { data: brs } = await supabase
          .from('branches')
          .select('id')
          .eq('tenant_id', tenantId)
          .limit(1)

        const branch_id = brs?.[0]?.id || null

        const { data: newWh, error } = await supabase
          .from('warehouses')
          .insert([{
            tenant_id: tenantId,
            branch_id,
            name: whForm.name.trim(),
            code: whForm.code.trim() || `BOD-${Math.floor(100 + Math.random() * 900)}`,
            address: whForm.address.trim() || null,
            is_main: whForm.is_main,
            is_active: whForm.is_active
          }])
          .select()
          .single()

        if (error) throw error

        // Sync initial inventory rows for products in this new warehouse
        if (newWh && productsList.length > 0) {
          const invRows = productsList.map(p => ({
            tenant_id: tenantId,
            warehouse_id: newWh.id,
            product_id: p.id,
            quantity: 0,
            avg_cost: p.cost_price || 0
          }))
          await supabase.from('inventory').insert(invRows)
        }
      }

      setShowWhModal(false)
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Error al guardar la bodega')
    } finally {
      setSavingWh(false)
    }
  }

  // Transfer Handlers
  function openTransferModal(fromWhId?: string, prodId?: string) {
    const origin = fromWhId || (warehouses[0]?.id || '')
    const dest = warehouses.find(w => w.id !== origin)?.id || ''
    setTrfForm({
      from_warehouse_id: origin,
      to_warehouse_id: dest,
      product_id: prodId || (productsList[0]?.id || ''),
      quantity: '1',
      notes: ''
    })
    setShowTrfModal(true)
  }

  async function handleCreateTransfer(e: React.FormEvent) {
    e.preventDefault()
    if (!trfForm.from_warehouse_id || !trfForm.to_warehouse_id || !trfForm.product_id || !trfForm.quantity) return
    if (trfForm.from_warehouse_id === trfForm.to_warehouse_id) {
      alert('El almacén de origen y destino deben ser diferentes')
      return
    }
    setSubmittingTrf(true)
    try {
      const prod = productsList.find(p => p.id === trfForm.product_id)
      const payload = {
        tenant_id: tenantId,
        user_id: userId,
        from_warehouse_id: trfForm.from_warehouse_id,
        to_warehouse_id: trfForm.to_warehouse_id,
        product_id: trfForm.product_id,
        quantity: parseFloat(trfForm.quantity) || 1,
        unit_cost: prod?.cost_price || 0,
        notes: trfForm.notes
      }
      const { data, error } = await supabase.rpc('record_warehouse_transfer', { p_data: payload })
      if (error) throw error
      if (data && data.success === false) throw new Error(data.error)
      setShowTrfModal(false)
      await loadData()
      alert('Transferencia realizada con éxito')
    } catch (err: any) {
      alert(err.message || 'Error al procesar la transferencia')
    } finally {
      setSubmittingTrf(false)
    }
  }

  // Adjustment Handlers
  function openAdjustmentModal(whId?: string, prodId?: string) {
    setAdjForm({
      warehouse_id: whId || (warehouses[0]?.id || ''),
      product_id: prodId || (productsList[0]?.id || ''),
      adjustment_type: 'decrease',
      reason: 'Merma / Deterioro',
      notes: '',
      quantity: '1'
    })
    setShowAdjModal(true)
  }

  async function handleCreateAdjustment(e: React.FormEvent) {
    e.preventDefault()
    if (!adjForm.warehouse_id || !adjForm.product_id || !adjForm.quantity) return
    setSubmittingAdj(true)
    try {
      const prod = productsList.find(p => p.id === adjForm.product_id)
      const payload = {
        tenant_id: tenantId,
        user_id: userId,
        warehouse_id: adjForm.warehouse_id,
        product_id: adjForm.product_id,
        adjustment_type: adjForm.adjustment_type,
        reason: adjForm.reason,
        notes: adjForm.notes,
        quantity: parseFloat(adjForm.quantity) || 1,
        unit_cost: prod?.cost_price || 0
      }
      const { data, error } = await supabase.rpc('record_stock_adjustment', { p_data: payload })
      if (error) throw error
      if (data && data.success === false) throw new Error(data.error)
      setShowAdjModal(false)
      await loadData()
      alert('Ajuste de inventario aplicado con éxito')
    } catch (err: any) {
      alert(err.message || 'Error al guardar el ajuste')
    } finally {
      setSubmittingAdj(false)
    }
  }

  // EXPORT 1: Single Warehouse Inventory Export
  function exportWarehouseStockCsv(wh: Warehouse) {
    const items = inventory.filter(i => (i.warehouses?.id === wh.id || i.warehouse_id === wh.id))
    if (items.length === 0) {
      alert(`No hay existencias registradas en la bodega ${wh.name}.`)
      return
    }

    let csv = '\uFEFF'
    csv += `INVENTARIO DE BODEGA: ${wh.name.toUpperCase()} (${wh.code || 'BOD'})\n`
    csv += `Dirección: ${wh.address || 'Principal'} | Fecha de Generación: ${new Date().toLocaleString('es-CO')}\n\n`
    csv += 'SKU,CodigoBarras,Producto,Categoria,StockFisico,CostoUnitarioCOP,ValorTotalCOP,PrecioVentaCOP,EstadoStock\n'

    items.forEach(item => {
      const p = item.products
      const sku = p?.sku || 'N/A'
      const barcode = p?.barcode || 'N/A'
      const name = (p?.name || 'Producto').replace(/,/g, ' ')
      const cat = (p?.categories?.name || 'General').replace(/,/g, ' ')
      const qty = Number(item.quantity || 0)
      const cost = Number(item.avg_cost || 0)
      const total = qty * cost
      const price = Number(p?.sale_price || 0)
      const min = p?.min_stock || 0
      const status = qty === 0 ? 'Sin Stock' : qty <= min ? 'Stock Bajo' : 'En Stock'

      csv += `"${sku}","${barcode}","${name}","${cat}",${qty},${cost},${total},${price},"${status}"\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `inventario_${wh.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // EXPORT 2: Multi-Warehouse Consolidated Matrix Export
  function exportConsolidatedMatrixCsv() {
    if (productsList.length === 0) {
      alert('No hay productos en el catálogo para exportar.')
      return
    }

    let csv = '\uFEFF'
    csv += `REPORTE MATRICIAL CONSOLIDADO DE TODAS LAS BODEGAS - MR TENDER\n`
    csv += `Fecha de Generación: ${new Date().toLocaleString('es-CO')}\n\n`

    // Header with dynamic warehouse columns
    let header = 'SKU,Producto,Categoria'
    warehouses.forEach(w => {
      header += `,"Stock_${w.name.replace(/,/g, ' ')}"`
    })
    header += ',TotalStockFisico,CostoPromedioCOP,ValorizacionTotalCOP\n'
    csv += header

    productsList.forEach(prod => {
      const pInv = inventory.filter(i => (i.products?.id === prod.id || (i as any).product_id === prod.id))
      const sku = prod.sku || 'N/A'
      const name = (prod.name || 'Producto').replace(/,/g, ' ')
      const cat = 'General'
      const cost = Number(prod.cost_price || 0)

      let row = `"${sku}","${name}","${cat}"`
      let prodTotalQty = 0

      warehouses.forEach(w => {
        const itemWh = pInv.find(i => (i.warehouses?.id === w.id || i.warehouse_id === w.id))
        const qty = Number(itemWh?.quantity || 0)
        prodTotalQty += qty
        row += `,${qty}`
      })

      const totalVal = prodTotalQty * cost
      row += `,${prodTotalQty},${cost},${totalVal}\n`
      csv += row
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `consolidado_bodegas_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // EXPORT 3: Physical Count / Inventory Audit Sheet
  function exportAuditCountSheetCsv(wh: Warehouse) {
    const items = inventory.filter(i => (i.warehouses?.id === wh.id || i.warehouse_id === wh.id))
    if (items.length === 0) {
      alert(`No hay existencias registradas en la bodega ${wh.name}.`)
      return
    }

    let csv = '\uFEFF'
    csv += `HOJA DE CONTEO FISICO Y AUDITORIA - BODEGA: ${wh.name.toUpperCase()}\n`
    csv += `Auditor / Responsable: ____________________ | Fecha de Conteo: ____/____/2026\n\n`
    csv += 'SKU,CodigoBarras,Producto,Categoria,StockSistema,ConteoFisicoReal,Diferencia,Observaciones\n'

    items.forEach(item => {
      const p = item.products
      const sku = p?.sku || 'N/A'
      const barcode = p?.barcode || 'N/A'
      const name = (p?.name || 'Producto').replace(/,/g, ' ')
      const cat = (p?.categories?.name || 'General').replace(/,/g, ' ')
      const qty = Number(item.quantity || 0)

      csv += `"${sku}","${barcode}","${name}","${cat}",${qty},"","",""\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `toma_fisica_${wh.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 12 }}>
        <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Cargando centro de bodegas...</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      {/* ── TOP HEADER & ACTIONS ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Bodegas & Almacenes
            </h1>
            <span className="badge badge-blue" style={{ fontSize: '0.72rem', fontWeight: 800 }}>
              {totalWarehousesCount} {totalWarehousesCount === 1 ? 'Bodega Activa' : 'Bodegas Activas'}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0' }}>
            Control multi-almacén, existencias físicas por ubicación, traslados y exportaciones
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={exportConsolidatedMatrixCsv}
            className="btn-neu"
            style={{ padding: '8px 12px', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-green)' }}
            title="Exportar matriz consolidada de todos los productos en todas las bodegas"
          >
            <FileSpreadsheet size={15} />
            <span>Exportar Consolidado</span>
          </button>

          <button
            onClick={() => openTransferModal()}
            className="btn-neu"
            style={{ padding: '8px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-purple)' }}
          >
            <ArrowLeftRight size={15} strokeWidth={2} />
            <span>Transferir</span>
          </button>

          <button
            onClick={openCreateWarehouse}
            className="btn-neu btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>+ Nueva Bodega</span>
          </button>
        </div>
      </div>

      {/* ── KPI METRICS ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        {[
          { label: 'Bodegas Totales', value: `${warehouses.length}`, Icon: Building2, color: 'var(--accent-blue)', bg: 'var(--accent-blue-lt)' },
          { label: 'Stock Consolidado', value: `${totalPhysicalUnits} uds`, Icon: Package, color: 'var(--accent-green)', bg: 'var(--accent-green-lt)' },
          { label: 'Valorización Total', value: formatCurrency(totalValuation), Icon: TrendingUp, color: 'var(--accent-purple)', bg: 'rgba(139, 92, 246, 0.12)' },
          { label: 'Bodega Central', value: mainWarehouse?.name || 'Bodega Principal', Icon: Shield, color: 'var(--accent-amber)', bg: 'var(--accent-amber-lt)' }
        ].map(s => {
          const StatIcon = s.Icon
          return (
            <div key={s.label} className="kpi-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="kpi-icon-wrap" style={{ background: s.bg, width: 34, height: 34, flexShrink: 0 }}>
                <StatIcon size={16} strokeWidth={2} style={{ color: s.color }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {s.label}
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: s.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.value}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── WAREHOUSE SELECTOR TABS BAR ── */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, alignItems: 'center' }}>
        <button
          className="btn-neu"
          onClick={() => setSelectedWhId('all')}
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
            background: selectedWhId === 'all' ? 'var(--accent-blue)' : 'var(--bg)',
            color: selectedWhId === 'all' ? '#fff' : 'var(--text-primary)',
            boxShadow: selectedWhId === 'all' ? '0 4px 12px rgba(59, 130, 246, 0.35)' : 'var(--neu-raised)'
          }}
        >
          <Layers size={15} />
          <span>Todas las Bodegas ({warehouses.length})</span>
        </button>

        {warehouses.map(w => {
          const isSelected = selectedWhId === w.id
          return (
            <button
              key={w.id}
              className="btn-neu"
              onClick={() => setSelectedWhId(w.id)}
              style={{
                padding: '8px 14px',
                fontSize: '0.8rem',
                fontWeight: isSelected ? 800 : 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
                background: isSelected ? 'var(--accent-blue)' : 'var(--bg)',
                color: isSelected ? '#fff' : 'var(--text-secondary)',
                boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.35)' : 'var(--neu-raised)'
              }}
            >
              <Building2 size={14} style={{ color: isSelected ? '#fff' : w.is_main ? 'var(--accent-blue)' : 'inherit' }} />
              <span>{w.name}</span>
              {w.is_main && (
                <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: 4, background: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--accent-blue-lt)', color: isSelected ? '#fff' : 'var(--accent-blue)', fontWeight: 800 }}>
                  ★ Principal
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── SECTION 1: GLOBAL VIEW (ALL WAREHOUSES CARDS) ── */}
      {selectedWhId === 'all' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Warehouses Grid Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
            {warehouses.map(wh => {
              const whItems = inventory.filter(i => (i.warehouses?.id === wh.id || i.warehouse_id === wh.id))
              const totalUnits = whItems.reduce((acc, curr) => acc + Number(curr.quantity || 0), 0)
              const totalVal = whItems.reduce((acc, curr) => acc + (Number(curr.quantity || 0) * Number(curr.avg_cost || 0)), 0)
              const lowStockCount = whItems.filter(i => Number(i.quantity || 0) <= Number(i.products?.min_stock || 0) && Number(i.quantity || 0) > 0).length
              const outStockCount = whItems.filter(i => Number(i.quantity || 0) === 0).length

              return (
                <div key={wh.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: wh.is_main ? 'var(--accent-blue-lt)' : 'var(--bg-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Building2 size={20} style={{ color: wh.is_main ? 'var(--accent-blue)' : 'var(--text-secondary)' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                          {wh.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Código: {wh.code || 'BOD-001'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {wh.is_main && (
                        <span className="badge badge-blue" style={{ fontSize: '0.66rem', fontWeight: 800 }}>
                          ★ Principal
                        </span>
                      )}
                      <span className={`badge ${wh.is_active !== false ? 'badge-green' : 'badge-coral'}`} style={{ fontSize: '0.66rem' }}>
                        {wh.is_active !== false ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>

                  {/* Address */}
                  {wh.address && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
                      <span>{wh.address}</span>
                    </div>
                  )}

                  {/* Stock Metrics Card */}
                  <div className="neu-flat" style={{ padding: '10px 14px', borderRadius: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>UNIDADES / ITEMS</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {totalUnits} <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)' }}>uds ({whItems.length} prods)</span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: lowStockCount > 0 ? 'var(--accent-amber)' : 'var(--text-muted)', marginTop: 2 }}>
                        {lowStockCount > 0 ? `⚠️ ${lowStockCount} stock bajo` : 'Stock normal'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>VALORIZACIÓN EN COP</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-blue)' }}>
                        {formatCurrency(totalVal)}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: outStockCount > 0 ? 'var(--accent-coral)' : 'var(--accent-green)', marginTop: 2 }}>
                        {outStockCount > 0 ? `🛑 ${outStockCount} agotados` : '✓ 100% disponible'}
                      </div>
                    </div>
                  </div>

                  {/* Action Toolbar for this specific warehouse */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 10, marginTop: 'auto', gap: 6, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        className="btn-neu btn-ghost"
                        onClick={() => exportWarehouseStockCsv(wh)}
                        style={{ padding: '5px 8px', fontSize: '0.72rem', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 4 }}
                        title="Exportar inventario de esta bodega a CSV/Excel"
                      >
                        <Download size={13} />
                        <span>Exportar</span>
                      </button>

                      <button
                        type="button"
                        className="btn-neu btn-ghost"
                        onClick={() => exportAuditCountSheetCsv(wh)}
                        style={{ padding: '5px 8px', fontSize: '0.72rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 4 }}
                        title="Exportar plantilla de conteo físico / auditoría ciega"
                      >
                        <Printer size={13} />
                        <span>Toma Física</span>
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        className="btn-neu btn-ghost"
                        onClick={() => openTransferModal(wh.id)}
                        style={{ padding: '5px 8px', fontSize: '0.72rem', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: 4 }}
                        title="Transferir productos desde esta bodega"
                      >
                        <ArrowLeftRight size={13} />
                        <span>Transferir</span>
                      </button>

                      <button
                        type="button"
                        className="btn-neu btn-ghost"
                        onClick={() => openEditWarehouse(wh)}
                        style={{ padding: '5px 8px', fontSize: '0.72rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Edit2 size={13} />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        className="btn-neu btn-primary"
                        onClick={() => {
                          setSelectedWhId(wh.id)
                          setWhSubTab('stock')
                        }}
                        style={{ padding: '5px 10px', fontSize: '0.72rem' }}
                      >
                        <span>Abrir</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── SECTION 2: SPECIFIC WAREHOUSE DEEP-DIVE VIEW ── */}
      {selectedWhId !== 'all' && activeWarehouse && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Specific Warehouse Hero Card */}
          <div className="neu-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-blue-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Building2 size={24} style={{ color: 'var(--accent-blue)' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {activeWarehouse.name}
                  </h2>
                  <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                    {activeWarehouse.code || 'BOD'}
                  </span>
                  {activeWarehouse.is_main && (
                    <span className="badge badge-amber" style={{ fontSize: '0.72rem', fontWeight: 800 }}>
                      ★ Bodega Principal
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
                  {activeWarehouse.address && <span>📍 {activeWarehouse.address}</span>}
                  <span>📦 {whInventory.length} variedades de productos</span>
                  <span>🔢 {selectedWhUnits} unidades físicas</span>
                  <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>💰 {formatCurrency(selectedWhValuation)}</span>
                </div>
              </div>
            </div>

            {/* Warehouse Quick Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => exportWarehouseStockCsv(activeWarehouse)}
                className="btn-neu"
                style={{ padding: '7px 12px', fontSize: '0.76rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, color: 'var(--accent-green)' }}
              >
                <Download size={14} />
                <span>Exportar Stock (.CSV)</span>
              </button>

              <button
                onClick={() => exportAuditCountSheetCsv(activeWarehouse)}
                className="btn-neu"
                style={{ padding: '7px 12px', fontSize: '0.76rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, color: 'var(--accent-blue)' }}
              >
                <Printer size={14} />
                <span>Hoja Conteo Físico</span>
              </button>

              <button
                onClick={() => openTransferModal(activeWarehouse.id)}
                className="btn-neu"
                style={{ padding: '7px 12px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--accent-purple)' }}
              >
                <ArrowLeftRight size={14} />
                <span>Trasladar</span>
              </button>

              <button
                onClick={() => openAdjustmentModal(activeWarehouse.id)}
                className="btn-neu"
                style={{ padding: '7px 12px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--accent-coral)' }}
              >
                <Wrench size={14} />
                <span>Ajuste / Merma</span>
              </button>

              <button
                onClick={() => openEditWarehouse(activeWarehouse)}
                className="btn-neu btn-ghost"
                style={{ padding: '7px 10px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Edit2 size={14} />
                <span>Configurar</span>
              </button>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div style={{ display: 'flex', gap: 6, padding: '4px', background: 'var(--bg-deep)', borderRadius: 'var(--radius-md)' }}>
            {[
              { key: 'stock', label: `Stock de la Bodega (${displayedStock.length})`, Icon: Package },
              { key: 'movements', label: `Kardex / Movimientos (${displayedMovements.length})`, Icon: History },
              { key: 'transfers', label: `Transferencias (${displayedTransfers.length})`, Icon: ArrowLeftRight }
            ].map(tab => {
              const Icon = tab.Icon
              const isActive = whSubTab === tab.key
              return (
                <button
                  key={tab.key}
                  className="btn-neu"
                  onClick={() => setWhSubTab(tab.key as any)}
                  style={{
                    flex: 1,
                    padding: '8px 14px',
                    fontSize: '0.78rem',
                    fontWeight: isActive ? 800 : 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    background: isActive ? 'var(--bg)' : 'transparent',
                    boxShadow: isActive ? 'var(--neu-raised)' : 'none',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)'
                  }}
                >
                  <Icon size={14} style={{ color: isActive ? 'var(--accent-blue)' : 'inherit' }} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* SUB-TAB 1: Stock list in this warehouse */}
          {whSubTab === 'stock' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Search & Filters */}
              <div className="neu-card" style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flex: 1, minWidth: 260 }}>
                  <div className="input-group" style={{ flex: '1 1 200px', minWidth: 180 }}>
                    <span className="input-icon"><Search size={15} style={{ color: 'var(--text-muted)' }} /></span>
                    <input
                      className="input-neu"
                      placeholder="Buscar por producto, SKU o código de barras..."
                      value={stockSearch}
                      onChange={e => setStockSearch(e.target.value)}
                      style={{ fontSize: '0.82rem', padding: '6px 8px 6px 28px' }}
                    />
                  </div>

                  <select
                    className="input-neu"
                    value={stockFilter}
                    onChange={e => setStockFilter(e.target.value as any)}
                    style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                  >
                    <option value="all">Todos los estados</option>
                    <option value="in_stock">En stock normal</option>
                    <option value="low_stock">Stock bajo / Crítico</option>
                    <option value="out_of_stock">Sin existencias (0)</option>
                  </select>

                  {availableCategories.length > 0 && (
                    <select
                      className="input-neu"
                      value={categoryFilter}
                      onChange={e => setCategoryFilter(e.target.value)}
                      style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                    >
                      <option value="all">Todas las categorías</option>
                      {availableCategories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Mostrando <strong>{displayedStock.length}</strong> de {whInventory.length} productos
                </div>
              </div>

              {/* Stock Items Table */}
              <div className="neu-card" style={{ padding: 12 }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--bg-deep)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '8px 6px' }}>Producto</th>
                        <th style={{ padding: '8px 6px' }}>SKU / Barras</th>
                        <th style={{ padding: '8px 6px' }}>Categoría</th>
                        <th style={{ padding: '8px 6px', textAlign: 'right' }}>Stock Físico</th>
                        <th style={{ padding: '8px 6px', textAlign: 'right' }}>Costo Prom.</th>
                        <th style={{ padding: '8px 6px', textAlign: 'right' }}>Valor Total</th>
                        <th style={{ padding: '8px 6px', textAlign: 'center' }}>Estado</th>
                        <th style={{ padding: '8px 6px', textAlign: 'right' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedStock.map(item => {
                        const p = item.products
                        const qty = Number(item.quantity || 0)
                        const cost = Number(item.avg_cost || 0)
                        const total = qty * cost
                        const min = p?.min_stock || 0
                        const isOut = qty === 0
                        const isLow = qty <= min && qty > 0

                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid var(--bg-deep)' }}>
                            <td style={{ padding: '8px 6px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              <div>{p?.name || 'Producto'}</div>
                            </td>
                            <td style={{ padding: '8px 6px', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                              {p?.sku || p?.barcode || '-'}
                            </td>
                            <td style={{ padding: '8px 6px', color: 'var(--text-secondary)', fontSize: '0.74rem' }}>
                              {p?.categories?.name || 'General'}
                            </td>
                            <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 800, color: isOut ? 'var(--accent-coral)' : isLow ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
                              {qty} <span style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-muted)' }}>uds</span>
                            </td>
                            <td style={{ padding: '8px 6px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                              {formatCurrency(cost)}
                            </td>
                            <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-blue)' }}>
                              {formatCurrency(total)}
                            </td>
                            <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                              {isOut ? (
                                <span className="badge badge-coral" style={{ fontSize: '0.65rem' }}>Agotado</span>
                              ) : isLow ? (
                                <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>Stock Bajo</span>
                              ) : (
                                <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>Disponible</span>
                              )}
                            </td>
                            <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: 4 }}>
                                <button
                                  type="button"
                                  className="btn-neu btn-ghost"
                                  onClick={() => openTransferModal(activeWarehouse.id, p?.id)}
                                  style={{ padding: '4px 6px', fontSize: '0.7rem', color: 'var(--accent-purple)' }}
                                  title="Transferir este producto a otra bodega"
                                >
                                  <ArrowLeftRight size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="btn-neu btn-ghost"
                                  onClick={() => openAdjustmentModal(activeWarehouse.id, p?.id)}
                                  style={{ padding: '4px 6px', fontSize: '0.7rem', color: 'var(--accent-coral)' }}
                                  title="Ajustar o registrar merma"
                                >
                                  <Wrench size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      {displayedStock.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                            <Boxes size={30} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
                            <div>No se encontraron productos que coincidan con la búsqueda</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: Movements / Kardex in this warehouse */}
          {whSubTab === 'movements' && (
            <div className="neu-card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Movimientos de Inventario en {activeWarehouse.name}
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--bg-deep)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '8px 6px' }}>Fecha</th>
                      <th style={{ padding: '8px 6px' }}>Producto</th>
                      <th style={{ padding: '8px 6px' }}>Tipo</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right' }}>Cantidad</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right' }}>Saldo Final</th>
                      <th style={{ padding: '8px 6px' }}>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedMovements.map(m => {
                      const isPos = Number(m.quantity) > 0
                      return (
                        <tr key={m.id} style={{ borderBottom: '1px solid var(--bg-deep)' }}>
                          <td style={{ padding: '8px 6px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {new Date(m.created_at).toLocaleDateString('es-CO')}
                          </td>
                          <td style={{ padding: '8px 6px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {m.products?.name || 'Producto'}
                          </td>
                          <td style={{ padding: '8px 6px' }}>
                            <span className={`badge ${m.movement_type?.includes('sale') ? 'badge-blue' : isPos ? 'badge-green' : 'badge-coral'}`} style={{ fontSize: '0.68rem' }}>
                              {m.movement_type === 'sale' ? 'Venta POS' : m.movement_type === 'purchase' ? 'Entrada Compra' : m.movement_type === 'adjustment' ? 'Ajuste Stock' : m.movement_type === 'transfer' ? 'Transferencia' : m.movement_type}
                            </span>
                          </td>
                          <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 800, color: isPos ? 'var(--accent-green)' : 'var(--accent-coral)' }}>
                            {isPos ? `+${m.quantity}` : m.quantity}
                          </td>
                          <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-blue)' }}>
                            {m.balance_after}
                          </td>
                          <td style={{ padding: '8px 6px', color: 'var(--text-secondary)', fontSize: '0.74rem' }}>
                            {m.notes || '-'}
                          </td>
                        </tr>
                      )
                    })}
                    {displayedMovements.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                          No hay movimientos registrados en esta bodega
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: Transfers in this warehouse */}
          {whSubTab === 'transfers' && (
            <div className="neu-card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Historial de Transferencias vinculadas a {activeWarehouse.name}
                </span>
                <button
                  type="button"
                  className="btn-neu btn-primary"
                  onClick={() => openTransferModal(activeWarehouse.id)}
                  style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                >
                  + Nueva Transferencia
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--bg-deep)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '8px 6px' }}>Fecha</th>
                      <th style={{ padding: '8px 6px' }}>Origen</th>
                      <th style={{ padding: '8px 6px' }}>Destino</th>
                      <th style={{ padding: '8px 6px' }}>Estado</th>
                      <th style={{ padding: '8px 6px' }}>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedTransfers.map(tr => {
                      const isDone = tr.status === 'completed' || tr.status === 'received' || !tr.status
                      return (
                        <tr key={tr.id} style={{ borderBottom: '1px solid var(--bg-deep)' }}>
                          <td style={{ padding: '8px 6px', color: 'var(--text-muted)' }}>
                            {new Date(tr.created_at).toLocaleDateString('es-CO')}
                          </td>
                          <td style={{ padding: '8px 6px', fontWeight: 700, color: tr.from_warehouse?.id === activeWarehouse.id ? 'var(--accent-coral)' : 'var(--text-primary)' }}>
                            {tr.from_warehouse?.name || 'Origen'}
                          </td>
                          <td style={{ padding: '8px 6px', fontWeight: 700, color: tr.to_warehouse?.id === activeWarehouse.id ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                            {tr.to_warehouse?.name || 'Destino'}
                          </td>
                          <td style={{ padding: '8px 6px' }}>
                            <span className={`badge ${isDone ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '0.68rem' }}>
                              {isDone ? 'Completada' : tr.status}
                            </span>
                          </td>
                          <td style={{ padding: '8px 6px', color: 'var(--text-secondary)', fontSize: '0.74rem' }}>
                            {tr.notes || '-'}
                          </td>
                        </tr>
                      )
                    })}
                    {displayedTransfers.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                          No hay transferencias registradas para esta bodega
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── MODAL: CREAR / EDITAR BODEGA ── */}
      {showWhModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 440, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={18} style={{ color: 'var(--accent-blue)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  {editingWh ? 'Editar Bodega' : 'Crear Nueva Bodega'}
                </h3>
              </div>
              <button className="btn-neu btn-ghost" onClick={() => setShowWhModal(false)} style={{ padding: '2px 6px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveWarehouse} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>
                  Nombre de la Bodega / Almacén *
                </label>
                <input
                  type="text"
                  required
                  className="input-neu"
                  placeholder="Ej: Bodega Norte, Mostrador Principal, Almacén Central"
                  value={whForm.name}
                  onChange={e => setWhForm({ ...whForm, name: e.target.value })}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>
                    Código / Prefijo
                  </label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="BOD-002"
                    value={whForm.code}
                    onChange={e => setWhForm({ ...whForm, code: e.target.value })}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>
                    Estado
                  </label>
                  <select
                    className="input-neu"
                    value={whForm.is_active ? 'active' : 'inactive'}
                    onChange={e => setWhForm({ ...whForm, is_active: e.target.value === 'active' })}
                    style={{ width: '100%', fontSize: '0.82rem', padding: 8 }}
                  >
                    <option value="active">Activa</option>
                    <option value="inactive">Inactiva</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>
                  Ubicación / Dirección física (Opcional)
                </label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Ej: Calle 45 # 12-34 Local 2"
                  value={whForm.address}
                  onChange={e => setWhForm({ ...whForm, address: e.target.value })}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg-deep)', borderRadius: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={whForm.is_main}
                  onChange={e => setWhForm({ ...whForm, is_main: e.target.checked })}
                  style={{ accentColor: 'var(--accent-blue)' }}
                />
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>Establecer como Bodega Principal</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Las ventas del POS y compras se asignarán a esta bodega por defecto</div>
                </div>
              </label>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  className="btn-neu btn-ghost"
                  onClick={() => setShowWhModal(false)}
                  style={{ flex: 1, padding: 10, fontSize: '0.8rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-neu btn-primary"
                  disabled={savingWh}
                  style={{ flex: 1.2, padding: 10, fontSize: '0.82rem', fontWeight: 800 }}
                >
                  {savingWh ? 'Guardando...' : (editingWh ? 'Actualizar Bodega' : 'Crear Bodega')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: TRANSFERENCIA ENTRE BODEGAS ── */}
      {showTrfModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 440, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Transferencia entre Bodegas</h3>
              <button className="btn-neu btn-ghost" onClick={() => setShowTrfModal(false)} style={{ padding: '2px 6px' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateTransfer} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Origen</label>
                  <select className="input-neu" value={trfForm.from_warehouse_id} onChange={e => setTrfForm({ ...trfForm, from_warehouse_id: e.target.value })} style={{ width: '100%', padding: 8 }}>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Destino</label>
                  <select className="input-neu" value={trfForm.to_warehouse_id} onChange={e => setTrfForm({ ...trfForm, to_warehouse_id: e.target.value })} style={{ width: '100%', padding: 8 }}>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Producto</label>
                <select className="input-neu" value={trfForm.product_id} onChange={e => setTrfForm({ ...trfForm, product_id: e.target.value })} style={{ width: '100%', padding: 8 }}>
                  {productsList.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku || 'Sin SKU'})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Cantidad a Trasladar</label>
                <input type="number" step="1" min="0.1" className="input-neu" value={trfForm.quantity} onChange={e => setTrfForm({ ...trfForm, quantity: e.target.value })} style={{ width: '100%', padding: 8, fontWeight: 800 }} required />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Notas / Motivo</label>
                <input className="input-neu" placeholder="Ej: Traslado de stock para mostrador..." value={trfForm.notes} onChange={e => setTrfForm({ ...trfForm, notes: e.target.value })} style={{ width: '100%', padding: 8 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" className="btn-neu btn-ghost" onClick={() => setShowTrfModal(false)} style={{ flex: 1, padding: 10 }}>Cancelar</button>
                <button type="submit" className="btn-neu btn-primary" disabled={submittingTrf} style={{ flex: 1.2, padding: 10, fontWeight: 800 }}>
                  {submittingTrf ? 'Moviendo...' : 'Confirmar Traslado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: AJUSTE / MERMA EN BODEGA ── */}
      {showAdjModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 440, padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Registrar Ajuste / Merma</h3>
            <form onSubmit={handleCreateAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Almacén / Bodega</label>
                <select className="input-neu" value={adjForm.warehouse_id} onChange={e => setAdjForm({ ...adjForm, warehouse_id: e.target.value })} style={{ width: '100%', padding: 8 }}>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Producto</label>
                <select className="input-neu" value={adjForm.product_id} onChange={e => setAdjForm({ ...adjForm, product_id: e.target.value })} style={{ width: '100%', padding: 8 }}>
                  {productsList.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku || 'Sin SKU'})</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Tipo</label>
                  <select className="input-neu" value={adjForm.adjustment_type} onChange={e => setAdjForm({ ...adjForm, adjustment_type: e.target.value })} style={{ width: '100%', padding: 8 }}>
                    <option value="decrease">Disminución / Merma (-)</option>
                    <option value="increase">Incremento / Entrada (+)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Cantidad</label>
                  <input type="number" step="1" min="0.1" className="input-neu" value={adjForm.quantity} onChange={e => setAdjForm({ ...adjForm, quantity: e.target.value })} style={{ width: '100%', padding: 8, fontWeight: 800 }} required />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Motivo</label>
                <select className="input-neu" value={adjForm.reason} onChange={e => setAdjForm({ ...adjForm, reason: e.target.value })} style={{ width: '100%', padding: 8 }}>
                  <option value="Merma / Deterioro">Merma / Deterioro</option>
                  <option value="Vencimiento">Vencimiento</option>
                  <option value="Conteo físico / Cuadre">Conteo físico / Cuadre</option>
                  <option value="Uso interno / Muestra">Uso interno / Muestra</option>
                  <option value="Corrección de inventario">Corrección de inventario</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Notas</label>
                <input className="input-neu" placeholder="Detalles..." value={adjForm.notes} onChange={e => setAdjForm({ ...adjForm, notes: e.target.value })} style={{ width: '100%', padding: 8 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" className="btn-neu btn-ghost" onClick={() => setShowAdjModal(false)} style={{ flex: 1, padding: 10 }}>Cancelar</button>
                <button type="submit" className="btn-neu btn-primary" disabled={submittingAdj} style={{ flex: 1.2, padding: 10, fontWeight: 800 }}>
                  {submittingAdj ? 'Guardando...' : 'Aplicar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
