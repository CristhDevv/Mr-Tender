'use client'
import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  DollarSign,
  Package,
  AlertTriangle,
  XCircle,
  Wrench,
  ArrowLeftRight,
  ClipboardCheck,
  Search,
  Building2,
  Boxes,
  CheckCircle2,
  FileSpreadsheet,
  Filter,
  RefreshCw,
  Download
} from 'lucide-react'

interface DBInventory {
  id: string
  quantity: number
  avg_cost: number
  products?: {
    name: string
    sku: string
    product_type: string
    min_stock: number
    max_stock: number
    categories?: { name: string } | null
  } | null
  warehouses?: {
    name: string
  } | null
}

type TabKey = 'stock' | 'movements' | 'adjustments' | 'transfers'

export default function InventoryPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<TabKey>('stock')
  const [search, setSearch] = useState('')
  const [inventory, setInventory] = useState<DBInventory[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [adjustments, setAdjustments] = useState<any[]>([])
  const [transfers, setTransfers] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [productsList, setProductsList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState('')
  const [userId, setUserId] = useState('')

  // Kardex filters & pagination
  const [kardexSearch, setKardexSearch] = useState('')
  const [kardexTypeFilter, setKardexTypeFilter] = useState('all')
  const [kardexWarehouseFilter, setKardexWarehouseFilter] = useState('all')
  const [kardexPage, setKardexPage] = useState(0)
  const [hasMoreMovements, setHasMoreMovements] = useState(true)
  const [loadingMoreMovs, setLoadingMoreMovs] = useState(false)

  // Modals state
  const [showAdjModal, setShowAdjModal] = useState(false)
  const [adjForm, setAdjForm] = useState({ warehouse_id: '', product_id: '', adjustment_type: 'decrease', reason: 'Merma / Deterioro', notes: '', quantity: '1' })
  const [showTrfModal, setShowTrfModal] = useState(false)
  const [trfForm, setTrfForm] = useState({ from_warehouse_id: '', to_warehouse_id: '', product_id: '', quantity: '1', notes: '' })
  const [submittingAction, setSubmittingAction] = useState(false)

  useEffect(() => {
    loadInventory()
  }, [])

  async function loadKardexMovements(page = 0, append = false, type = kardexTypeFilter, wh = kardexWarehouseFilter, tid = tenantId) {
    if (!tid) return
    try {
      if (append) setLoadingMoreMovs(true)
      const pageSize = 50
      let query = supabase
        .from('stock_movements')
        .select(`id, created_at, movement_type, quantity, unit_cost, total_cost, balance_after, notes, products (id, name, sku), warehouses (id, name)`)
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (type !== 'all') {
        query = query.ilike('movement_type', `%${type}%`)
      }
      if (wh !== 'all') {
        query = query.eq('warehouse_id', wh)
      }

      const { data, error } = await query
      if (error) throw error

      if (data) {
        if (data.length < pageSize) setHasMoreMovements(false)
        else setHasMoreMovements(true)

        if (append) {
          setMovements(prev => [...prev, ...data])
        } else {
          setMovements(data)
        }
        setKardexPage(page)
      }
    } catch (err) {
      console.error('Error loading kardex movements:', err)
    } finally {
      if (append) setLoadingMoreMovs(false)
    }
  }

  async function loadInventory() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const tenant_id = user.user_metadata?.tenant_id
      if (!tenant_id) return
      setTenantId(tenant_id)
      setUserId(user.id)

      const [invRes, adjRes, trfRes, whRes, prodRes] = await Promise.all([
        supabase
          .from('inventory')
          .select(`
            id, quantity, avg_cost,
            products (id, name, sku, product_type, min_stock, max_stock, cost_price, categories (name)),
            warehouses (id, name)
          `)
          .eq('tenant_id', tenant_id),
        supabase
          .from('stock_adjustments')
          .select(`id, created_at, adjustment_type, reason, notes, status, warehouses (name)`)
          .eq('tenant_id', tenant_id)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('warehouse_transfers')
          .select(`id, created_at, status, notes, from_warehouse:warehouses!from_warehouse_id(name), to_warehouse:warehouses!to_warehouse_id(name)`)
          .eq('tenant_id', tenant_id)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('warehouses')
          .select('id, name')
          .eq('tenant_id', tenant_id)
          .eq('is_active', true),
        supabase
          .from('products')
          .select('id, name, sku, cost_price')
          .eq('tenant_id', tenant_id)
          .eq('is_active', true)
      ])

      if (invRes.data) setInventory(invRes.data as any)
      if (adjRes.data) setAdjustments(adjRes.data)
      if (trfRes.data) setTransfers(trfRes.data)
      if (whRes.data) {
        setWarehouses(whRes.data)
        if (whRes.data.length > 0) {
          setAdjForm(f => ({ ...f, warehouse_id: whRes.data[0].id }))
          setTrfForm(f => ({ ...f, from_warehouse_id: whRes.data[0].id, to_warehouse_id: whRes.data[1]?.id || whRes.data[0].id }))
        }
      }
      if (prodRes.data) {
        setProductsList(prodRes.data)
        if (prodRes.data.length > 0) {
          setAdjForm(f => ({ ...f, product_id: prodRes.data[0].id }))
          setTrfForm(f => ({ ...f, product_id: prodRes.data[0].id }))
        }
      }

      await loadKardexMovements(0, false, kardexTypeFilter, kardexWarehouseFilter, tenant_id)
    } catch (err) {
      console.error('Error loading inventory:', err)
    } finally {
      setLoading(false)
    }
  }

  function exportKardexCsv() {
    if (movements.length === 0) {
      alert('No hay movimientos en el Kardex para exportar.')
      return
    }

    let csvContent = '\uFEFF'
    csvContent += `KARDEX Y MOVIMIENTOS DE INVENTARIO - MR TENDER\n`
    csvContent += `Generado: ${new Date().toLocaleString('es-CO')}\n\n`
    csvContent += 'Fecha,Producto,SKU,Almacen,TipoMovimiento,Cantidad,CostoUnitario,CostoTotal,SaldoFinal,Detalle\n'

    filteredKardex.forEach(m => {
      const date = new Date(m.created_at).toLocaleString('es-CO').replace(/,/g, ' ')
      const prod = (m.products?.name || 'Producto').replace(/,/g, ' ')
      const sku = m.products?.sku || 'N/A'
      const wh = (m.warehouses?.name || 'Almacen').replace(/,/g, ' ')
      const type = m.movement_type
      const qty = m.quantity
      const unitCost = m.unit_cost || 0
      const totalCost = m.total_cost || 0
      const balance = m.balance_after || 0
      const notes = (m.notes || '-').replace(/,/g, ' ')

      csvContent += `"${date}","${prod}","${sku}","${wh}","${type}",${qty},${unitCost},${totalCost},${balance},"${notes}"\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `kardex_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredKardex = movements.filter(m => {
    if (!kardexSearch.trim()) return true
    const s = kardexSearch.toLowerCase()
    const prodName = (m.products?.name || '').toLowerCase()
    const sku = (m.products?.sku || '').toLowerCase()
    const whName = (m.warehouses?.name || '').toLowerCase()
    const notes = (m.notes || '').toLowerCase()
    return prodName.includes(s) || sku.includes(s) || whName.includes(s) || notes.includes(s)
  })

  const filtered = inventory.filter(i => {
    const name = i.products?.name || ''
    const sku = i.products?.sku || ''
    return name.toLowerCase().includes(search.toLowerCase()) || sku.toLowerCase().includes(search.toLowerCase())
  })

  const lowStock = inventory.filter(i => {
    const min = i.products?.min_stock || 0
    return i.quantity <= min && i.quantity > 0
  }).length

  const outOfStock = inventory.filter(i => i.quantity === 0).length
  const totalValue = inventory.reduce((s, i) => s + Number(i.quantity) * Number(i.avg_cost), 0)

  const TABS: { key: TabKey; label: string; Icon: any }[] = [
    { key: 'stock', label: 'Stock actual', Icon: Package },
    { key: 'movements', label: 'Kardex', Icon: Boxes },
    { key: 'adjustments', label: 'Ajustes', Icon: Wrench },
    { key: 'transfers', label: 'Transferencias', Icon: ArrowLeftRight },
  ]

  async function handleCreateAdjustment(e: React.FormEvent) {
    e.preventDefault()
    if (!adjForm.warehouse_id || !adjForm.product_id || !adjForm.quantity) return
    setSubmittingAction(true)
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
      loadInventory()
      alert('Ajuste de inventario aplicado con éxito')
    } catch (err: any) {
      alert(err.message || 'Error al guardar el ajuste')
    } finally {
      setSubmittingAction(false)
    }
  }

  async function handleCreateTransfer(e: React.FormEvent) {
    e.preventDefault()
    if (!trfForm.from_warehouse_id || !trfForm.to_warehouse_id || !trfForm.product_id || !trfForm.quantity) return
    if (trfForm.from_warehouse_id === trfForm.to_warehouse_id) {
      alert('El almacén de origen y destino deben ser diferentes')
      return
    }
    setSubmittingAction(true)
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
      loadInventory()
      alert('Transferencia entre almacenes completada')
    } catch (err: any) {
      alert(err.message || 'Error al procesar la transferencia')
    } finally {
      setSubmittingAction(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Cargando inventarios...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>Inventario & Kardex</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0 }}>Control de stock, mermas, transferencias y trazabilidad</p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-neu" onClick={() => setShowAdjModal(true)} style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-coral)' }}>
            <Wrench size={15} strokeWidth={2} />
            <span>Ajuste / Merma</span>
          </button>
          <button className="btn-neu btn-primary" onClick={() => setShowTrfModal(true)} style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeftRight size={15} strokeWidth={2} />
            <span>Transferir</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
        {[
          { label: 'Valor total', value: formatCurrency(totalValue), Icon: DollarSign, color: 'var(--accent-blue)', bg: 'var(--accent-blue-lt)' },
          { label: 'En stock', value: `${inventory.length} prods`, Icon: Package, color: 'var(--accent-green)', bg: 'var(--accent-green-lt)' },
          { label: 'Stock bajo', value: lowStock, Icon: AlertTriangle, color: 'var(--accent-amber)', bg: 'var(--accent-amber-lt)' },
          { label: 'Sin stock', value: outOfStock, Icon: XCircle, color: 'var(--accent-coral)', bg: 'var(--accent-coral-lt)' },
        ].map(s => {
          const StatIcon = s.Icon
          return (
            <div key={s.label} className="kpi-card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <div className="kpi-icon-wrap" style={{ background: s.bg, width: 32, height: 32, flexShrink: 0 }}>
                <StatIcon size={16} strokeWidth={2} style={{ color: s.color }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Segmented Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px', background: 'var(--bg-deep)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--neu-pressed)' }}>
        {TABS.map(t => {
          const TabIcon = t.Icon
          const isActive = tab === t.key
          return (
            <button key={t.key} className="btn-neu" onClick={() => setTab(t.key)}
              style={{ flex: '1 1 auto', minWidth: 100, padding: '7px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: isActive ? 'var(--bg)' : 'transparent', boxShadow: isActive ? 'var(--neu-raised)' : 'none', color: isActive ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: isActive ? 800 : 500 }}>
              <TabIcon size={14} strokeWidth={2} style={{ color: isActive ? 'var(--accent-blue)' : 'inherit' }} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* TAB 1: Stock Actual */}
      {tab === 'stock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="input-group">
            <span className="input-icon"><Search size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} /></span>
            <input className="input-neu" placeholder="Buscar por producto o SKU..." value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: '0.85rem' }} />
          </div>

          <div className="neu-card" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(item => {
              const sku = item.products?.sku || 'S/N'
              const name = item.products?.name || 'Producto'
              const warehouse = item.warehouses?.name || 'Almacén principal'
              const min = item.products?.min_stock || 0
              const isLow = item.quantity <= min && item.quantity > 0
              const isOut = item.quantity === 0

              return (
                <div key={item.id} className="neu-flat" style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span>SKU: {sku}</span>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Building2 size={11} /> {warehouse}</span>
                      </div>
                    </div>
                    
                    <div style={{ flexShrink: 0 }}>
                      {isOut ? (
                        <span className="badge badge-coral" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>Sin stock</span>
                      ) : isLow ? (
                        <span className="badge badge-amber" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>Stock bajo</span>
                      ) : (
                        <span className="badge badge-green" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>En stock</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--bg-deep)', paddingTop: 6, fontSize: '0.75rem' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      Stock: <strong style={{ color: isOut ? 'var(--accent-coral)' : isLow ? 'var(--accent-amber)' : 'var(--text-primary)' }}>{item.quantity} uds</strong>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 4 }}>(Mín: {min})</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>Total:</span>
                      <strong style={{ color: 'var(--accent-blue)', fontSize: '0.82rem' }}>{formatCurrency(Number(item.quantity) * Number(item.avg_cost))}</strong>
                    </div>
                  </div>
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                <Boxes size={32} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
                <div style={{ fontSize: '0.85rem' }}>No se encontraron productos en el inventario</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Kardex / Movimientos */}
      {tab === 'movements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Kardex Controls & Filters Bar */}
          <div className="neu-card" style={{ padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flex: 1, minWidth: 280 }}>
              <div className="input-group" style={{ flex: '1 1 180px', minWidth: 160 }}>
                <span className="input-icon"><Search size={14} style={{ color: 'var(--text-muted)' }} /></span>
                <input
                  className="input-neu"
                  placeholder="Buscar en kardex (producto, SKU, notas)..."
                  value={kardexSearch}
                  onChange={e => setKardexSearch(e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '6px 8px 6px 28px' }}
                />
              </div>

              <select
                className="input-neu"
                value={kardexTypeFilter}
                onChange={e => {
                  const val = e.target.value
                  setKardexTypeFilter(val)
                  loadKardexMovements(0, false, val, kardexWarehouseFilter)
                }}
                style={{ fontSize: '0.78rem', padding: '6px 10px' }}
              >
                <option value="all">Todos los movimientos</option>
                <option value="sale">Ventas</option>
                <option value="purchase">Compras / Entradas</option>
                <option value="adjustment">Ajustes / Mermas</option>
                <option value="transfer">Transferencias</option>
              </select>

              {warehouses.length > 1 && (
                <select
                  className="input-neu"
                  value={kardexWarehouseFilter}
                  onChange={e => {
                    const val = e.target.value
                    setKardexWarehouseFilter(val)
                    loadKardexMovements(0, false, kardexTypeFilter, val)
                  }}
                  style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                >
                  <option value="all">Todas las bodegas</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn-neu"
                onClick={() => loadKardexMovements(0, false, kardexTypeFilter, kardexWarehouseFilter)}
                title="Recargar kardex"
                style={{ padding: '6px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <RefreshCw size={13} />
                <span>Refrescar</span>
              </button>

              <button
                className="btn-neu"
                onClick={exportKardexCsv}
                style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-green)' }}
              >
                <FileSpreadsheet size={14} />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          {/* Kardex Table */}
          <div className="neu-card" style={{ padding: 12 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--bg-deep)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '8px 6px' }}>Fecha</th>
                    <th style={{ padding: '8px 6px' }}>Producto</th>
                    <th style={{ padding: '8px 6px' }}>Bodega</th>
                    <th style={{ padding: '8px 6px' }}>Tipo</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Cantidad</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Saldo Final</th>
                    <th style={{ padding: '8px 6px' }}>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKardex.map(m => {
                    const isPos = Number(m.quantity) > 0
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--bg-deep)' }}>
                        <td style={{ padding: '8px 6px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(m.created_at).toLocaleDateString('es-CO')}
                        </td>
                        <td style={{ padding: '8px 6px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          <div>{m.products?.name || 'Producto'}</div>
                          {m.products?.sku && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>SKU: {m.products.sku}</div>}
                        </td>
                        <td style={{ padding: '8px 6px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                          {m.warehouses?.name || 'Principal'}
                        </td>
                        <td style={{ padding: '8px 6px' }}>
                          <span className={`badge ${m.movement_type.includes('sale') ? 'badge-blue' : isPos ? 'badge-green' : 'badge-coral'}`} style={{ fontSize: '0.68rem' }}>
                            {m.movement_type === 'sale' ? 'Venta POS' : m.movement_type === 'purchase' ? 'Entrada Compra' : m.movement_type === 'adjustment' ? 'Ajuste Stock' : m.movement_type === 'transfer' ? 'Transferencia' : m.movement_type}
                          </span>
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 800, color: isPos ? 'var(--accent-green)' : 'var(--accent-coral)' }}>
                          {isPos ? `+${m.quantity}` : m.quantity}
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-blue)' }}>{m.balance_after}</td>
                        <td style={{ padding: '8px 6px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{m.notes || '-'}</td>
                      </tr>
                    )
                  })}
                  {filteredKardex.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No hay movimientos que coincidan con el filtro</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {hasMoreMovements && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--bg-deep)' }}>
                <button
                  className="btn-neu"
                  onClick={() => loadKardexMovements(kardexPage + 1, true, kardexTypeFilter, kardexWarehouseFilter)}
                  disabled={loadingMoreMovs}
                  style={{ padding: '8px 18px', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <RefreshCw size={13} className={loadingMoreMovs ? 'animate-spin' : ''} />
                  <span>{loadingMoreMovs ? 'Cargando más...' : 'Cargar más movimientos (+50)'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Ajustes */}
      {tab === 'adjustments' && (
        <div className="neu-card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>Historial de Ajustes Manuales</span>
            <button className="btn-neu btn-primary" onClick={() => setShowAdjModal(true)} style={{ padding: '5px 10px', fontSize: '0.75rem' }}>+ Nuevo Ajuste</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--bg-deep)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '8px 6px' }}>Fecha</th>
                <th style={{ padding: '8px 6px' }}>Almacén</th>
                <th style={{ padding: '8px 6px' }}>Tipo</th>
                <th style={{ padding: '8px 6px' }}>Motivo</th>
                <th style={{ padding: '8px 6px' }}>Notas</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--bg-deep)' }}>
                  <td style={{ padding: '8px 6px', color: 'var(--text-muted)' }}>{new Date(a.created_at).toLocaleDateString('es-CO')}</td>
                  <td style={{ padding: '8px 6px', fontWeight: 700 }}>{a.warehouses?.name || 'Principal'}</td>
                  <td style={{ padding: '8px 6px' }}>
                    <span className={`badge ${a.adjustment_type === 'increase' ? 'badge-green' : 'badge-coral'}`} style={{ fontSize: '0.68rem' }}>
                      {a.adjustment_type === 'increase' ? 'Entrada (+)' : 'Salida/Merma (-)'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 6px', fontWeight: 700 }}>{a.reason}</td>
                  <td style={{ padding: '8px 6px', color: 'var(--text-secondary)' }}>{a.notes || '-'}</td>
                </tr>
              ))}
              {adjustments.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No hay ajustes registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: Transferencias */}
      {tab === 'transfers' && (
        <div className="neu-card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>Transferencias entre Bodegas</span>
            <button className="btn-neu btn-primary" onClick={() => setShowTrfModal(true)} style={{ padding: '5px 10px', fontSize: '0.75rem' }}>+ Nueva Transferencia</button>
          </div>
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
              {transfers.map(tr => {
                const isDone = tr.status === 'completed' || tr.status === 'received' || !tr.status
                const isCancel = tr.status === 'cancelled'
                return (
                  <tr key={tr.id} style={{ borderBottom: '1px solid var(--bg-deep)' }}>
                    <td style={{ padding: '8px 6px', color: 'var(--text-muted)' }}>{new Date(tr.created_at).toLocaleDateString('es-CO')}</td>
                    <td style={{ padding: '8px 6px', fontWeight: 700, color: 'var(--accent-coral)' }}>{tr.from_warehouse?.name || 'Origen'}</td>
                    <td style={{ padding: '8px 6px', fontWeight: 700, color: 'var(--accent-green)' }}>{tr.to_warehouse?.name || 'Destino'}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <span className={`badge ${isDone ? 'badge-green' : isCancel ? 'badge-coral' : 'badge-amber'}`} style={{ fontSize: '0.68rem' }}>
                        {isDone ? 'Completada' : isCancel ? 'Cancelada' : tr.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px 6px', color: 'var(--text-secondary)' }}>{tr.notes || '-'}</td>
                  </tr>
                )
              })}
              {transfers.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No hay transferencias registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Ajuste / Merma */}
      {showAdjModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 440, padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Registrar Ajuste / Merma</h3>
            <form onSubmit={handleCreateAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Almacén</label>
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
                <button type="button" className="btn-neu" onClick={() => setShowAdjModal(false)} style={{ flex: 1, padding: 10 }}>Cancelar</button>
                <button type="submit" className="btn-neu btn-primary" disabled={submittingAction} style={{ flex: 1, padding: 10 }}>
                  {submittingAction ? 'Guardando...' : 'Aplicar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Transferencia */}
      {showTrfModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 440, padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Transferencia entre Almacenes</h3>
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
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Cantidad</label>
                <input type="number" step="1" min="0.1" className="input-neu" value={trfForm.quantity} onChange={e => setTrfForm({ ...trfForm, quantity: e.target.value })} style={{ width: '100%', padding: 8, fontWeight: 800 }} required />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Notas</label>
                <input className="input-neu" placeholder="Ej: Traslado para sucursal..." value={trfForm.notes} onChange={e => setTrfForm({ ...trfForm, notes: e.target.value })} style={{ width: '100%', padding: 8 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" className="btn-neu" onClick={() => setShowTrfModal(false)} style={{ flex: 1, padding: 10 }}>Cancelar</button>
                <button type="submit" className="btn-neu btn-primary" disabled={submittingAction} style={{ flex: 1, padding: 10 }}>
                  {submittingAction ? 'Moviendo...' : 'Confirmar Traslado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
