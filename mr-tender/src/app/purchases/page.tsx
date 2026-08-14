'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Supplier {
  id: string;
  company_name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface Warehouse {
  id: string;
  name: string;
}

interface PurchaseOrder {
  id: string;
  number: string;
  order_date: string;
  status: string;
  total: number;
  suppliers: { company_name: string } | null;
  warehouses: { name: string } | null;
}

export default function PurchasesPage() {
  const supabase = createClient()
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])

  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)

  // Form states
  const [supplierId, setSupplierId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [items, setItems] = useState<{ product_id: string; quantity: number; unit_price: number }[]>([
    { product_id: '', quantity: 1, unit_price: 0 }
  ])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        const tid = data.user.user_metadata?.tenant_id
        if (tid) {
          setTenantId(tid)
          fetchData(tid)
        }
      }
    })
  }, [])

  async function fetchData(tid: string) {
    try {
      setLoading(true)

      // Fetch Purchases
      const { data: poData } = await supabase
        .from('purchase_orders')
        .select('*, suppliers(company_name), warehouses(name)')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false })

      // Fetch Suppliers
      const { data: supData } = await supabase
        .from('suppliers')
        .select('id, company_name')
        .eq('tenant_id', tid)
        .eq('is_active', true)

      // Fetch Products
      const { data: prodData } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('tenant_id', tid)

      // Fetch Warehouses
      const { data: whData } = await supabase
        .from('warehouses')
        .select('id, name')
        .eq('tenant_id', tid)

      setPurchases(poData as any || [])
      setSuppliers(supData || [])
      setProducts(prodData || [])
      setWarehouses(whData || [])

      if (whData && whData.length > 0) setWarehouseId(whData[0].id)
      if (supData && supData.length > 0) setSupplierId(supData[0].id)
    } catch (err) {
      console.error('Error fetching purchase data:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleAddItem() {
    setItems([...items, { product_id: '', quantity: 1, unit_price: 0 }])
  }

  function handleRemoveItem(index: number) {
    setItems(items.filter((_, i) => i !== index))
  }

  function handleItemChange(index: number, field: string, val: string | number) {
    setItems(items.map((item, i) => i === index ? { ...item, [field]: val } : item))
  }

  async function handleCreatePurchase(e: React.FormEvent) {
    e.preventDefault()
    if (!supplierId || !warehouseId || !userId || !tenantId || items.some(item => !item.product_id || item.quantity <= 0)) {
      alert('Completa los campos e ingresa cantidades válidas.')
      return
    }

    try {
      setSubmitting(true)
      const randomOrderNumber = 'OC-' + Math.floor(100000 + Math.random() * 900000)

      // Calculate total
      const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

      // 1. Insert Purchase Order
      const { data: poData, error: poErr } = await supabase
        .from('purchase_orders')
        .insert([{
          tenant_id: tenantId,
          supplier_id: supplierId,
          warehouse_id: warehouseId,
          number: randomOrderNumber,
          status: 'pending',
          order_date: new Date().toISOString().split('T')[0],
          subtotal: totalAmount,
          tax_amount: 0,
          discount_amount: 0,
          total: totalAmount,
          amount_paid: 0,
          created_by: userId
        }])
        .select()

      if (poErr) throw poErr
      if (!poData || poData.length === 0) throw new Error('No se creó la orden de compra')

      const poId = poData[0].id

      // 2. Insert items
      const poItems = items.map(item => ({
        purchase_order_id: poId,
        product_id: item.product_id,
        quantity_ordered: item.quantity,
        quantity_received: 0,
        unit_price: item.unit_price,
        discount_percentage: 0,
        tax_rate: 0,
        subtotal: item.quantity * item.unit_price,
        total: item.quantity * item.unit_price
      }))

      const { error: itemsErr } = await supabase
        .from('purchase_order_items')
        .insert(poItems)

      if (itemsErr) throw itemsErr

      // 3. Receive stock using RPC
      const rpcItemsJson = items.map(item => ({
        product_id: item.product_id,
        variant_id: null,
        quantity: item.quantity,
        unit_price: item.unit_price
      }))

      const { error: rpcErr } = await supabase.rpc('receive_purchase_order', {
        p_po_id: poId,
        p_items: rpcItemsJson,
        p_user_id: userId
      })

      if (rpcErr) throw rpcErr

      // Clear Form and reload
      setItems([{ product_id: '', quantity: 1, unit_price: 0 }])
      fetchData(tenantId)
      alert('Compra registrada e inventario actualizado exitosamente.')
    } catch (err) {
      console.error('Error recording purchase:', err)
      alert('Hubo un error al procesar la compra.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Órdenes de Compra y Entrada</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Registra compras de inventario para aumentar el stock y valorizar tu almacén</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Formulario */}
        <form onSubmit={handleCreatePurchase} className="neu-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Registrar Nueva Compra</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Proveedor</label>
              <select className="input-neu" value={supplierId} onChange={e => setSupplierId(e.target.value)} required style={{ width: '100%' }}>
                {suppliers.length === 0 ? (
                  <option value="">(Crea un proveedor primero)</option>
                ) : (
                  suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)
                )}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Almacén de Entrada</label>
              <select className="input-neu" value={warehouseId} onChange={e => setWarehouseId(e.target.value)} required style={{ width: '100%' }}>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          <div className="divider" />

          {/* Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Productos a ingresar</span>
              <button type="button" onClick={handleAddItem} className="btn-neu" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>+ Agregar</button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  className="input-neu"
                  value={item.product_id}
                  onChange={e => handleItemChange(idx, 'product_id', e.target.value)}
                  required
                  style={{ flex: 3 }}
                >
                  <option value="">Seleccionar Producto...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
                <input
                  type="number"
                  className="input-neu"
                  placeholder="Cantidad"
                  value={item.quantity}
                  onChange={e => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                  required
                  min="0.1"
                  style={{ flex: 1, textAlign: 'right' }}
                />
                <input
                  type="number"
                  className="input-neu"
                  placeholder="Costo Unitario"
                  value={item.unit_price}
                  onChange={e => handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                  required
                  min="0"
                  style={{ flex: 1, textAlign: 'right' }}
                />
                {items.length > 1 && (
                  <button type="button" onClick={() => handleRemoveItem(idx)} className="btn-neu" style={{ padding: '8px', color: 'var(--accent-coral)' }}>X</button>
                )}
              </div>
            ))}
          </div>

          <button type="submit" className="btn-neu btn-primary" disabled={submitting || suppliers.length === 0} style={{ alignSelf: 'flex-end', padding: '10px 24px', fontSize: '0.85rem', marginTop: 12 }}>
            {submitting ? 'Registrando compra...' : 'Registrar y Recibir Compra'}
          </button>
        </form>

        {/* Listado */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Historial de Entradas</h3>
          {loading ? (
            <div style={{ color: 'var(--text-muted)' }}>Cargando compras...</div>
          ) : purchases.length === 0 ? (
            <div className="neu-card" style={{ padding: 30, textAlign: 'center', color: 'var(--text-secondary)' }}>
              Aún no has registrado compras de mercaderías.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {purchases.map(p => (
                <div key={p.id} className="neu-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{p.number}</strong>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: p.status === 'received' ? 'rgba(74,186,134,0.12)' : 'rgba(242,193,78,0.12)',
                      color: p.status === 'received' ? 'var(--accent-emerald)' : 'var(--accent-gold)'
                    }}>{p.status === 'received' ? 'Recibida' : 'Pendiente'}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Proveedor: {p.suppliers?.company_name || 'Desconocido'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Almacén: {p.warehouses?.name || 'Desconocido'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDate(p.order_date)}</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(p.total)}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
