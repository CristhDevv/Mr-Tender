'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { getColombiaDateString } from '@/lib/date-utils'
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
  Filter,
  RefreshCw,
  Download,
  History,
  Edit2,
  FileSpreadsheet,
  Plus,
  Sparkles,
  Check,
  X,
  MapPin,
  Shield,
  Layers
} from 'lucide-react'

interface DBInventory {
  id: string
  quantity: number
  avg_cost: number
  products?: {
    id?: string
    name: string
    sku: string
    product_type: string
    min_stock: number
    max_stock: number
    categories?: { name: string } | null
  } | null
  warehouses?: {
    id?: string
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

  // Warehouse filter & management states
  const [selectedStockWh, setSelectedStockWh] = useState<string>('all')
  const [showWhModal, setShowWhModal] = useState(false)
  const [editingWh, setEditingWh] = useState<any | null>(null)
  const [whForm, setWhForm] = useState({
    name: '',
    code: '',
    address: '',
    is_main: false,
    is_active: true
  })
  const [savingWh, setSavingWh] = useState(false)

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

  // Supply / Raw Material Modal State
  const [showSupplyModal, setShowSupplyModal] = useState(false)
  const [savingSupply, setSavingSupply] = useState(false)
  const [supplyForm, setSupplyForm] = useState({
    name: '',
    sku: '',
    unit: 'Kilogramos (kg)',
    cost_price: '',
    initial_quantity: '10',
    min_stock: '5',
    warehouse_id: '',
    notes: ''
  })

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
        .select(`id, created_at, movement_type, quantity, unit_cost, total_cost, balance_after, notes, reference_type, reference_id, products (id, name, sku), warehouses (id, name), users:created_by (id, full_name, email)`)
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

  async function handleCreateSupply(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || !supplyForm.name.trim() || savingSupply) return
    setSavingSupply(true)
    try {
      const whId = supplyForm.warehouse_id || warehouses[0]?.id
      if (!whId) throw new Error('Debes seleccionar una bodega de almacenamiento')

      // 1. Insert into products
      const skuVal = supplyForm.sku.trim() || `INS-${Math.floor(1000 + Math.random() * 9000)}`
      const costVal = parseFloat(supplyForm.cost_price) || 0
      const initQty = parseFloat(supplyForm.initial_quantity) || 0
      const minStockVal = parseFloat(supplyForm.min_stock) || 0

      const { data: newProd, error: prodErr } = await supabase
        .from('products')
        .insert({
          tenant_id: tenantId,
          name: supplyForm.name.trim(),
          sku: skuVal,
          product_type: 'raw_material',
          cost_price: costVal,
          purchase_price: costVal,
          sale_price: 0,
          min_stock: minStockVal,
          track_inventory: true,
          is_active: true,
          metadata: { unit: supplyForm.unit, notes: supplyForm.notes }
        })
        .select()
        .single()

      if (prodErr) throw prodErr

      // 2. Insert into inventory
      const { error: invErr } = await supabase.from('inventory').insert({
        tenant_id: tenantId,
        warehouse_id: whId,
        product_id: newProd.id,
        quantity: initQty,
        avg_cost: costVal
      })
      if (invErr) throw invErr

      // 3. Log initial stock movement if quantity > 0
      if (initQty > 0) {
        await supabase.from('stock_movements').insert({
          tenant_id: tenantId,
          warehouse_id: whId,
          product_id: newProd.id,
          movement_type: 'initial_stock',
          quantity: initQty,
          unit_cost: costVal,
          total_cost: initQty * costVal,
          balance_after: initQty,
          notes: supplyForm.notes ? `Ingreso inicial: ${supplyForm.notes}` : 'Ingreso inicial al crear insumo'
        })
      }

      setShowSupplyModal(false)
      await loadInventory()
    } catch (err: any) {
      alert(err.message || 'Error al crear el insumo')
    } finally {
      setSavingSupply(false)
    }
  }

  async function handleSeedBakerySupplies() {
    if (!tenantId || savingSupply) return
    setSavingSupply(true)
    try {
      const whId = warehouses[0]?.id
      if (!whId) throw new Error('No hay bodegas disponibles')

      const demoSupplies = [
        { name: 'Harina de Trigo Especial (Bulto 50kg)', sku: 'INS-HAR-01', unit: 'Bulto (50kg)', cost: 140000, qty: 15, min: 3 },
        { name: 'Levadura Fresca Instantánea (500g)', sku: 'INS-LEV-01', unit: 'Gramos (g)', cost: 12000, qty: 25, min: 5 },
        { name: 'Mantequilla Industrial Sin Sal (1kg)', sku: 'INS-MAN-01', unit: 'Kilogramos (kg)', cost: 24000, qty: 20, min: 4 },
        { name: 'Azúcar Refinada (Bulto 25kg)', sku: 'INS-AZU-01', unit: 'Bulto (25kg)', cost: 95000, qty: 10, min: 2 },
        { name: 'Sal Marina Fina (1kg)', sku: 'INS-SAL-01', unit: 'Kilogramos (kg)', cost: 2500, qty: 30, min: 5 },
        { name: 'Queso Costeño Rallado (5kg)', sku: 'INS-QUE-01', unit: 'Kilogramos (kg)', cost: 85000, qty: 8, min: 2 },
        { name: 'Huevos Frescos AA (Panal 30 unds)', sku: 'INS-HUE-01', unit: 'Panal (30 unds)', cost: 18000, qty: 12, min: 3 },
        { name: 'Bolsas Kraft para Pan (Paquete 100u)', sku: 'INS-EMP-01', unit: 'Paquete', cost: 15000, qty: 30, min: 5 }
      ]

      for (const item of demoSupplies) {
        const { data: p } = await supabase
          .from('products')
          .insert({
            tenant_id: tenantId,
            name: item.name,
            sku: item.sku,
            product_type: 'raw_material',
            cost_price: item.cost,
            purchase_price: item.cost,
            sale_price: 0,
            min_stock: item.min,
            track_inventory: true,
            is_active: true,
            metadata: { unit: item.unit }
          })
          .select()
          .single()

        if (p) {
          await supabase.from('inventory').insert({
            tenant_id: tenantId,
            warehouse_id: whId,
            product_id: p.id,
            quantity: item.qty,
            avg_cost: item.cost
          })

          await supabase.from('stock_movements').insert({
            tenant_id: tenantId,
            warehouse_id: whId,
            product_id: p.id,
            movement_type: 'initial_stock',
            quantity: item.qty,
            unit_cost: item.cost,
            total_cost: item.qty * item.cost,
            balance_after: item.qty,
            notes: 'Carga inicial de insumos de panadería demo'
          })
        }
      }

      await loadInventory()
    } catch (err: any) {
      alert(err.message || 'Error al cargar insumos')
    } finally {
      setSavingSupply(false)
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
          .select('id, name, code, address, is_main, is_active, created_at')
          .eq('tenant_id', tenant_id)
          .order('is_main', { ascending: false })
          .order('name', { ascending: true }),
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

  function openCreateWarehouse() {
    setEditingWh(null)
    setWhForm({
      name: '',
      code: 'BOD-00' + (warehouses.length + 1),
      address: '',
      is_main: warehouses.length === 0,
      is_active: true
    })
    setShowWhModal(true)
  }

  function openEditWarehouse(w: any) {
    setEditingWh(w)
    setWhForm({
      name: w.name || '',
      code: w.code || '',
      address: w.address || '',
      is_main: Boolean(w.is_main),
      is_active: w.is_active !== false
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
      await loadInventory()
    } catch (err: any) {
      alert(err.message || 'Error al guardar la bodega')
    } finally {
      setSavingWh(false)
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
    csvContent += 'Fecha_Hora,Producto,SKU,Almacen,TipoMovimiento,Cantidad,CostoUnitario,CostoTotal,SaldoFinal,Responsable,Detalle\n'

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
      const resp = (m.users?.full_name || m.users?.email || 'Sistema').replace(/,/g, ' ')
      const notes = (m.notes || '-').replace(/,/g, ' ')

      csvContent += `"${date}","${prod}","${sku}","${wh}","${type}",${qty},${unitCost},${totalCost},${balance},"${resp}","${notes}"\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `kardex_${getColombiaDateString()}.csv`)
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
    const matchSearch = name.toLowerCase().includes(search.toLowerCase()) || sku.toLowerCase().includes(search.toLowerCase())
    const whId = i.warehouses?.id || (i as any).warehouse_id
    const matchWh = selectedStockWh === 'all' || whId === selectedStockWh
    return matchSearch && matchWh
  })

  const lowStock = inventory.filter(i => {
    const min = i.products?.min_stock || 0
    return i.quantity <= min && i.quantity > 0
  }).length

  const outOfStock = inventory.filter(i => i.quantity === 0).length
  const totalValue = inventory.reduce((s, i) => s + Number(i.quantity) * Number(i.avg_cost), 0)

  const TABS: { key: TabKey; label: string; Icon: any }[] = [
    { key: 'stock', label: 'Stock Actual', Icon: Package },
    { key: 'movements', label: 'Movimientos de Stock', Icon: History },
    { key: 'adjustments', label: 'Ajustes & Pérdidas', Icon: Wrench },
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
    } catch (err: any) {
      alert(err.message || 'Error al procesar la transferencia')
    } finally {
      setSubmittingAction(false)
    }
  }

  function openAdjustmentForProduct(item: any) {
    const pId = item.products?.id || (productsList.find(p => p.name === item.products?.name)?.id) || ''
    const whId = item.warehouses?.id || warehouses[0]?.id || ''
    setAdjForm({
      warehouse_id: whId,
      product_id: pId,
      adjustment_type: 'decrease',
      reason: 'Merma / Deterioro',
      notes: '',
      quantity: '1'
    })
    setShowAdjModal(true)
  }

  function openTransferForProduct(item: any) {
    const pId = item.products?.id || (productsList.find(p => p.name === item.products?.name)?.id) || ''
    const whId = item.warehouses?.id || warehouses[0]?.id || ''
    const destWh = warehouses.find(w => w.id !== whId)?.id || ''
    setTrfForm({
      from_warehouse_id: whId,
      to_warehouse_id: destWh,
      product_id: pId,
      quantity: '1',
      notes: ''
    })
    setShowTrfModal(true)
  }

  function viewKardexForProduct(item: any) {
    const pName = item.products?.name || ''
    setKardexSearch(pName)
    setTab('movements')
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
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>Inventario & Movimientos de Stock</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0 }}>Control de existencias físicas, bodegas, transferencias y trazabilidad</p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/inventory/import" className="btn-neu" style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileSpreadsheet size={15} strokeWidth={2} />
            <span>Importar Excel / CSV</span>
          </Link>
          <button className="btn-neu" onClick={() => setShowAdjModal(true)} style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
            <Wrench size={15} strokeWidth={2} />
            <span>Ajuste de Stock</span>
          </button>
          <button className="btn-neu" onClick={() => setShowTrfModal(true)} style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeftRight size={15} strokeWidth={2} />
            <span>Transferir</span>
          </button>
          <button
            onClick={() => {
              setSupplyForm({
                name: '',
                sku: `INS-${Math.floor(100 + Math.random() * 900)}`,
                unit: 'Kilogramos (kg)',
                cost_price: '',
                initial_quantity: '10',
                min_stock: '5',
                warehouse_id: warehouses[0]?.id || '',
                notes: ''
              })
              setShowSupplyModal(true)
            }}
            className="btn-neu btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>+ Nuevo Insumo</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'Valor Total Stock', value: formatCurrency(totalValue), Icon: DollarSign, color: '#008F7E', bg: '#E6F7F5' },
          { label: 'Productos en Stock', value: `${inventory.length} prods`, Icon: Package, color: '#059669', bg: '#ECFDF5' },
          { label: 'Stock Bajo', value: `${lowStock} prods`, Icon: AlertTriangle, color: '#714AD9', bg: '#F0EDFC' },
          { label: 'Agotados / Sin Stock', value: `${outOfStock} prods`, Icon: XCircle, color: '#DC2626', bg: '#FEE2E2' },
        ].map(s => {
          const StatIcon = s.Icon
          return (
            <div key={s.label} className="neu-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A' }}>{s.value}</div>
              </div>
              <div style={{ background: s.bg, width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>
                <StatIcon size={18} strokeWidth={2} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const TabIcon = t.Icon
          const isActive = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              className="btn-neu"
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                fontSize: '0.8rem',
                fontWeight: isActive ? 800 : 600,
                background: isActive ? '#00B19D' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#64748B',
                border: isActive ? '1px solid #009E8C' : '1px solid #E2E8F0',
                cursor: 'pointer'
              }}
            >
              <TabIcon size={14} style={{ color: isActive ? '#FFFFFF' : '#64748B' }} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* TAB 1: Stock Actual */}
      {tab === 'stock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div className="input-group" style={{ flex: 1, minWidth: 200 }}>
              <span className="input-icon"><Search size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} /></span>
              <input className="input-neu" placeholder="Buscar por producto o SKU..." value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: '0.85rem' }} />
            </div>

            <select
              className="input-neu"
              value={selectedStockWh}
              onChange={e => setSelectedStockWh(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '6px 12px', minWidth: 180, fontWeight: 700 }}
            >
              <option value="all">Todas las Bodegas ({warehouses.length})</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>
                  {w.is_main ? '★ ' : ''}{w.name} {w.code ? `(${w.code})` : ''}
                </option>
              ))}
            </select>
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

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 8, marginTop: 4, flexWrap: 'wrap', gap: 8, fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        Stock: <strong style={{ color: isOut ? 'var(--accent-coral)' : isLow ? 'var(--accent-amber)' : 'var(--text-primary)' }}>{item.quantity} uds</strong>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 4 }}>(Mín: {min})</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>Total:</span>
                        <strong style={{ color: 'var(--accent-blue)', fontSize: '0.82rem' }}>{formatCurrency(Number(item.quantity) * Number(item.avg_cost))}</strong>
                      </div>
                    </div>

                    {/* Quick Action Buttons for this item */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={() => openAdjustmentForProduct(item)}
                        className="btn-neu btn-ghost"
                        style={{ padding: '5px 9px', fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}
                        title="Registrar merma o ajuste para este producto"
                      >
                        <Wrench size={13} />
                        <span>Merma / Ajuste</span>
                      </button>

                      <button
                        onClick={() => openTransferForProduct(item)}
                        className="btn-neu btn-ghost"
                        style={{ padding: '5px 9px', fontSize: '0.72rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 4 }}
                        title="Transferir a otro almacén"
                      >
                        <ArrowLeftRight size={13} />
                        <span>Transferir</span>
                      </button>

                      <button
                        onClick={() => viewKardexForProduct(item)}
                        className="btn-neu btn-ghost"
                        style={{ padding: '5px 9px', fontSize: '0.72rem', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: 4 }}
                        title="Ver historial de movimientos en Kardex"
                      >
                        <History size={13} />
                        <span>Kardex</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div className="neu-card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#E6F7F5', color: '#008F7E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={28} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                    No hay insumos o materias primas registradas
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: '#64748B', maxWidth: 460, margin: '4px auto 0' }}>
                    Crea los ingredientes (harinas, levaduras, quesos) para controlar costos de recetas y descontar stock automáticamente en cada horneada.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
                  <button
                    onClick={() => {
                      setSupplyForm({
                        name: '',
                        sku: `INS-${Math.floor(100 + Math.random() * 900)}`,
                        unit: 'Kilogramos (kg)',
                        cost_price: '',
                        initial_quantity: '10',
                        min_stock: '5',
                        warehouse_id: warehouses[0]?.id || '',
                        notes: ''
                      })
                      setShowSupplyModal(true)
                    }}
                    className="btn-neu btn-primary"
                    style={{ padding: '9px 18px', fontSize: '0.82rem', fontWeight: 800 }}
                  >
                    <Plus size={15} strokeWidth={2.5} />
                    <span>+ Crear Primer Insumo</span>
                  </button>
                  <button
                    onClick={handleSeedBakerySupplies}
                    disabled={savingSupply}
                    className="btn-neu"
                    style={{ padding: '9px 18px', fontSize: '0.82rem', fontWeight: 700, color: '#008F7E', background: '#E6F7F5', border: '1px solid #99F6E4' }}
                  >
                    <Sparkles size={15} />
                    <span>{savingSupply ? 'Cargando...' : 'Cargar Insumos de Panadería (Demo)'}</span>
                  </button>
                </div>
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
                <option value="sale_cancellation">Anulaciones de Venta</option>
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
                    <th style={{ padding: '8px 6px' }}>Fecha & Hora</th>
                    <th style={{ padding: '8px 6px' }}>Producto</th>
                    <th style={{ padding: '8px 6px' }}>Bodega</th>
                    <th style={{ padding: '8px 6px' }}>Tipo</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Cantidad</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Saldo Final</th>
                    <th style={{ padding: '8px 6px' }}>Responsable</th>
                    <th style={{ padding: '8px 6px' }}>Detalle / Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKardex.map(m => {
                    const isPos = Number(m.quantity) > 0
                    const isCancel = m.movement_type === 'sale_cancellation'
                    const isSale = m.movement_type === 'sale'
                    const isPurchase = m.movement_type === 'purchase'
                    const isAdj = m.movement_type.includes('adjustment')

                    const typeBadgeClass = isCancel
                      ? 'badge-purple'
                      : isSale
                      ? 'badge-blue'
                      : isPurchase
                      ? 'badge-green'
                      : isAdj
                      ? 'badge-amber'
                      : 'badge-neutral'

                    const typeLabel = isCancel
                      ? 'Anulación Venta'
                      : isSale
                      ? 'Venta POS'
                      : isPurchase
                      ? 'Entrada Compra'
                      : isAdj
                      ? 'Ajuste Stock'
                      : m.movement_type.includes('transfer')
                      ? 'Transferencia'
                      : m.movement_type

                    const formattedDateTime = new Date(m.created_at).toLocaleString('es-CO', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    })

                    const responsibleName = m.users?.full_name || m.users?.email || 'Administrador'

                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--bg-deep)' }}>
                        <td style={{ padding: '8px 6px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.74rem' }}>
                          {formattedDateTime}
                        </td>
                        <td style={{ padding: '8px 6px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          <div>{m.products?.name || 'Producto'}</div>
                          {m.products?.sku && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>SKU: {m.products.sku}</div>}
                        </td>
                        <td style={{ padding: '8px 6px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                          {m.warehouses?.name || 'Principal'}
                        </td>
                        <td style={{ padding: '8px 6px' }}>
                          <span className={`badge ${typeBadgeClass}`} style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                            {typeLabel}
                          </span>
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 800, color: isPos ? 'var(--accent-green)' : 'var(--accent-coral)' }}>
                          {isPos ? `+${m.quantity}` : m.quantity}
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-blue)' }}>{m.balance_after}</td>
                        <td style={{ padding: '8px 6px', color: 'var(--text-primary)', fontSize: '0.75rem' }}>
                          <div style={{ fontWeight: 600 }}>{responsibleName}</div>
                        </td>
                        <td style={{ padding: '8px 6px', color: 'var(--text-secondary)', fontSize: '0.74rem', maxWidth: 220, wordBreak: 'break-word' }}>
                          {m.notes || '-'}
                        </td>
                      </tr>
                    )
                  })}
                  {filteredKardex.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No hay movimientos que coincidan con el filtro</td></tr>
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
      {/* Modal: Crear / Editar Bodega */}
      {showWhModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
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
                  placeholder="Ej: Bodega Norte, Mostrador 1, Almacén Central"
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

      {/* Modal: Transferencia */}
      {showTrfModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
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


      {/* Modal: Crear Nuevo Insumo / Materia Prima */}
      {showSupplyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 480, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                  Nuevo Insumo / Ingrediente
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#64748B' }}>
                  Registra materias primas e ingredientes para el control de recetas y stock
                </p>
              </div>
              <button
                type="button"
                className="btn-neu"
                onClick={() => setShowSupplyModal(false)}
                style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateSupply} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Nombre del Insumo */}
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 3 }}>
                  Nombre del Insumo / Ingrediente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Harina de Trigo Especial, Levadura Fresca, Queso Costeño..."
                  value={supplyForm.name}
                  onChange={e => setSupplyForm({ ...supplyForm, name: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', fontSize: '0.88rem' }}
                />
              </div>

              {/* SKU & Unidad de Medida */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 3 }}>
                    Código / SKU
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: INS-001"
                    value={supplyForm.sku}
                    onChange={e => setSupplyForm({ ...supplyForm, sku: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 3 }}>
                    Unidad de Medida
                  </label>
                  <select
                    className="input-neu"
                    value={supplyForm.unit}
                    onChange={e => setSupplyForm({ ...supplyForm, unit: e.target.value })}
                    style={{ width: '100%', fontSize: '0.84rem', background: '#FFFFFF' }}
                  >
                    <option value="Kilogramos (kg)">Kilogramos (kg)</option>
                    <option value="Gramos (g)">Gramos (g)</option>
                    <option value="Litros (L)">Litros (L)</option>
                    <option value="Mililitros (ml)">Mililitros (ml)</option>
                    <option value="Unidades (und)">Unidades (und)</option>
                    <option value="Bulto (50kg)">Bulto (50kg)</option>
                    <option value="Bulto (25kg)">Bulto (25kg)</option>
                    <option value="Panal (30 unds)">Panal (30 unds)</option>
                  </select>
                </div>
              </div>

              {/* Costo Unitario & Stock Inicial */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 3 }}>
                    Costo de Compra ($) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="0"
                    value={supplyForm.cost_price}
                    onChange={e => setSupplyForm({ ...supplyForm, cost_price: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', fontSize: '0.88rem', fontWeight: 800, color: '#008F7E' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 3 }}>
                    Cantidad Inicial a Ingresar *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    required
                    value={supplyForm.initial_quantity}
                    onChange={e => setSupplyForm({ ...supplyForm, initial_quantity: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', fontSize: '0.88rem', fontWeight: 800, color: '#059669' }}
                  />
                </div>
              </div>

              {/* Bodega & Alerta de Stock Mínimo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 3 }}>
                    Bodega de Destino
                  </label>
                  <select
                    className="input-neu"
                    value={supplyForm.warehouse_id}
                    onChange={e => setSupplyForm({ ...supplyForm, warehouse_id: e.target.value })}
                    style={{ width: '100%', fontSize: '0.84rem', background: '#FFFFFF' }}
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.is_main ? '★ ' : ''}{w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 3 }}>
                    Alerta de Stock Mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="5"
                    value={supplyForm.min_stock}
                    onChange={e => setSupplyForm({ ...supplyForm, min_stock: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 3 }}>
                  Notas / Proveedor
                </label>
                <input
                  type="text"
                  placeholder="Ej: Proveedor Molinos del Valle, lote fresco..."
                  value={supplyForm.notes}
                  onChange={e => setSupplyForm({ ...supplyForm, notes: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn-neu"
                  onClick={() => setShowSupplyModal(false)}
                  style={{ flex: 1, padding: 10, fontSize: '0.84rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSupply}
                  className="btn-neu btn-primary"
                  style={{ flex: 1.5, padding: 10, fontSize: '0.84rem', fontWeight: 800 }}
                >
                  {savingSupply ? 'Guardando...' : 'Guardar e Ingresar Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
