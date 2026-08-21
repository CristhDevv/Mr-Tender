'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  ShoppingBag,
  Plus,
  Trash2,
  Building2,
  Truck,
  CheckCircle2,
  Clock,
  PackageCheck,
  Eye,
  X,
  ArrowDownLeft
} from 'lucide-react'

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

interface PurchaseOrderItem {
  id: string;
  product_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  total: number;
  products?: { name: string; sku: string } | null;
}

interface PurchaseOrder {
  id: string;
  number: string;
  order_date: string;
  status: string;
  total: number;
  suppliers: { company_name: string } | null;
  warehouses: { name: string } | null;
  purchase_order_items?: PurchaseOrderItem[];
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
  const [receiveImmediately, setReceiveImmediately] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Reception modal states
  const [selectedPoForReceive, setSelectedPoForReceive] = useState<PurchaseOrder | null>(null)
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({})
  const [receiving, setReceiving] = useState(false)

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

      // Fetch Purchases with Items
      const { data: poData } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers(company_name),
          warehouses(name),
          purchase_order_items (
            id, product_id, quantity_ordered, quantity_received, unit_price, total,
            products (name, sku)
          )
        `)
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

      // 3. If receiveImmediately is true, receive stock immediately using RPC
      if (receiveImmediately) {
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
      }

      // Clear Form and reload
      setItems([{ product_id: '', quantity: 1, unit_price: 0 }])
      fetchData(tenantId)
      alert(receiveImmediately ? 'Compra registrada e inventario recibido con éxito.' : 'Orden de compra creada en estado pendiente.')
    } catch (err) {
      console.error('Error recording purchase:', err)
      alert('Hubo un error al procesar la compra.')
    } finally {
      setSubmitting(false)
    }
  }

  function openReceiveModal(po: PurchaseOrder) {
    setSelectedPoForReceive(po)
    const initialQty: Record<string, number> = {}
    po.purchase_order_items?.forEach(item => {
      const remaining = Math.max(0, Number(item.quantity_ordered) - Number(item.quantity_received))
      initialQty[item.product_id] = remaining
    })
    setReceiveQuantities(initialQty)
  }

  async function handleConfirmReception(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPoForReceive || !userId || !tenantId) return

    setReceiving(true)
    try {
      const rpcItems = (selectedPoForReceive.purchase_order_items || [])
        .map(item => ({
          product_id: item.product_id,
          variant_id: null,
          quantity: Number(receiveQuantities[item.product_id] || 0),
          unit_price: Number(item.unit_price)
        }))
        .filter(it => it.quantity > 0)

      if (rpcItems.length === 0) {
        alert('Ingresa al menos una cantidad mayor a 0 para recibir.')
        return
      }

      const { data, error } = await supabase.rpc('receive_purchase_order', {
        p_po_id: selectedPoForReceive.id,
        p_items: rpcItems,
        p_user_id: userId
      })

      if (error) throw error
      if (data && data.success === false) throw new Error(data.error)

      setSelectedPoForReceive(null)
      fetchData(tenantId)
      alert(data.is_fully_received ? '¡Orden de compra recibida completamente!' : 'Recepción parcial registrada en inventario.')
    } catch (err: any) {
      console.error('Error receiving goods:', err)
      alert(err.message || 'Error al procesar la recepción de mercancía')
    } finally {
      setReceiving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', overflowX: 'hidden' }}>
      <div>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Órdenes de Compra y Entrada</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2 }}>Registra compras de inventario para aumentar el stock y valorizar tu almacén</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {/* Formulario */}
        <form onSubmit={handleCreatePurchase} className="neu-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Registrar Nueva Compra</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Proveedor</label>
              <select className="input-neu" value={supplierId} onChange={e => setSupplierId(e.target.value)} required style={{ width: '100%', fontSize: '0.82rem' }}>
                {suppliers.length === 0 ? (
                  <option value="">(Crea un proveedor primero)</option>
                ) : (
                  suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)
                )}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Almacén de Entrada</label>
              <select className="input-neu" value={warehouseId} onChange={e => setWarehouseId(e.target.value)} required style={{ width: '100%', fontSize: '0.82rem' }}>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          <div className="divider" style={{ margin: '4px 0' }} />

          {/* Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Productos a ingresar</span>
              <button type="button" onClick={handleAddItem} className="btn-neu" style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Plus size={12} strokeWidth={2.5} />
                <span>Agregar</span>
              </button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="neu-flat" style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                  <select
                    className="input-neu"
                    value={item.product_id}
                    onChange={e => handleItemChange(idx, 'product_id', e.target.value)}
                    required
                    style={{ flex: 1, fontSize: '0.8rem' }}
                  >
                    <option value="">Seleccionar Producto...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>

                  {items.length > 1 && (
                    <button type="button" onClick={() => handleRemoveItem(idx)} style={{ background: 'none', border: 'none', color: 'var(--accent-coral)', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Cantidad</label>
                    <input
                      type="number"
                      className="input-neu"
                      placeholder="Cantidad"
                      value={item.quantity}
                      onChange={e => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      required
                      min="0.1"
                      style={{ width: '100%', textAlign: 'right', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Costo Unitario $</label>
                    <input
                      type="number"
                      className="input-neu"
                      placeholder="Costo"
                      value={item.unit_price}
                      onChange={e => handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                      required
                      min="0"
                      style={{ width: '100%', textAlign: 'right', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {/* Immediate reception toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={receiveImmediately}
                onChange={e => setReceiveImmediately(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--accent-blue)' }}
              />
              <span>Ingresar e incrementar stock inmediatamente en inventario</span>
            </label>
          </div>

          <button type="submit" className="btn-neu btn-primary" disabled={submitting || suppliers.length === 0} style={{ alignSelf: 'flex-start', padding: '10px 20px', fontSize: '0.85rem', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShoppingBag size={15} strokeWidth={2.5} />
            <span>{submitting ? 'Guardando...' : receiveImmediately ? 'Registrar y Recibir' : 'Crear Orden Pendiente'}</span>
          </button>
        </form>

        {/* Listado */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Historial de Órdenes y Entradas</h3>
          {loading ? (
            <div style={{ color: 'var(--text-muted)' }}>Cargando compras...</div>
          ) : purchases.length === 0 ? (
            <div className="neu-card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              Aún no has registrado compras de mercaderías.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {purchases.map(p => {
                const isFullyReceived = p.status === 'received'
                const isPartial = p.status === 'partial'
                const isPending = p.status === 'pending'

                return (
                  <div key={p.id} className="neu-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{p.number}</strong>
                      <span className={`badge ${isFullyReceived ? 'badge-green' : isPartial ? 'badge-blue' : 'badge-amber'}`} style={{ fontSize: '0.65rem' }}>
                        {isFullyReceived ? 'Recibida Total' : isPartial ? 'Recepción Parcial' : 'Pendiente Recepción'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Proveedor: {p.suppliers?.company_name || 'Desconocido'} • Bodega: {p.warehouses?.name || 'Principal'}
                    </div>

                    {p.purchase_order_items && p.purchase_order_items.length > 0 && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--bg-deep)', paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {p.purchase_order_items.map((it, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>• {it.products?.name || 'Producto'}</span>
                            <span>{it.quantity_received || 0} / {it.quantity_ordered} uds</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, borderTop: '1px solid var(--bg-deep)', paddingTop: 6 }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDate(p.order_date)}</span>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ color: 'var(--accent-blue)', fontSize: '0.85rem' }}>{formatCurrency(p.total)}</strong>
                        {(isPending || isPartial) && (
                          <button
                            type="button"
                            onClick={() => openReceiveModal(p)}
                            className="btn-neu"
                            style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-green)', fontWeight: 700 }}
                          >
                            <PackageCheck size={13} />
                            <span>Recibir</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Recepción de Mercancía */}
      {selectedPoForReceive && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card animate-scale-in" style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Recepción de Mercancía: {selectedPoForReceive.number}
                </h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Proveedor: {selectedPoForReceive.suppliers?.company_name || 'General'}
                </p>
              </div>
              <button className="btn-neu btn-ghost" onClick={() => setSelectedPoForReceive(null)} style={{ padding: '2px 6px' }}>✕</button>
            </div>

            <form onSubmit={handleConfirmReception} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Ingresa la cantidad física que vas a ingresar hoy al almacén:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '50vh', overflowY: 'auto' }}>
                {selectedPoForReceive.purchase_order_items?.map(item => {
                  const remaining = Math.max(0, Number(item.quantity_ordered) - Number(item.quantity_received))
                  const currentVal = receiveQuantities[item.product_id] ?? remaining

                  return (
                    <div key={item.id} className="neu-flat" style={{ padding: '8px 10px', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{item.products?.name || 'Producto'}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          Pedido: {item.quantity_ordered} | Ya recibido: {item.quantity_received || 0} | Pendiente: <strong style={{ color: 'var(--accent-coral)' }}>{remaining}</strong>
                        </div>
                      </div>

                      <div style={{ width: 90 }}>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max={remaining}
                          className="input-neu"
                          value={currentVal}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0
                            setReceiveQuantities(prev => ({ ...prev, [item.product_id]: val }))
                          }}
                          style={{ width: '100%', padding: '6px', fontSize: '0.82rem', textAlign: 'right', fontWeight: 800 }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" className="btn-neu" onClick={() => setSelectedPoForReceive(null)} style={{ flex: 1, padding: 10 }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-neu btn-primary" disabled={receiving} style={{ flex: 1, padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <PackageCheck size={15} />
                  <span>{receiving ? 'Procesando...' : 'Confirmar Ingreso'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
