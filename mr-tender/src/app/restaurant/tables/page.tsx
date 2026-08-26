'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  UtensilsCrossed,
  Receipt,
  Users,
  Plus,
  RefreshCw,
  Sparkles,
  Flame,
  ArrowRight,
  Printer,
  RotateCcw,
  Check,
  X,
  AlertTriangle,
  MoveRight,
  TrendingUp,
  Percent,
  Beer,
  Coffee,
  CheckCircle2,
  DollarSign,
  ChevronRight
} from 'lucide-react'

interface RestaurantTable {
  id: string
  tenant_id: string
  table_number: string
  zone_name: string
  capacity: number
  status: 'free' | 'occupied' | 'billing' | 'reserved'
  current_waiter?: string | null
  guest_count: number
  opened_at?: string | null
  active_order?: RestaurantOrder | null
}

interface RestaurantOrder {
  id: string
  tenant_id: string
  table_id?: string | null
  table_number: string
  order_number: string
  waiter_name: string
  guest_count: number
  status: 'active' | 'billing' | 'closed' | 'cancelled'
  subtotal: number
  tip_amount: number
  tax_amount: number
  total: number
  notes?: string | null
  created_at: string
  items?: RestaurantOrderItem[]
}

interface RestaurantOrderItem {
  id: string
  order_id: string
  product_id?: string | null
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  destination: 'kitchen' | 'bar' | 'grill' | 'dessert'
  notes?: string | null
  status: 'pending' | 'cooking' | 'ready' | 'served'
  sent_to_kitchen_at: string
  created_at: string
}

export default function RestaurantTablesPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [orders, setOrders] = useState<RestaurantOrder[]>([])
  const [selectedZone, setSelectedZone] = useState<string>('all')

  // Modals
  const [showOpenTableModal, setShowOpenTableModal] = useState<RestaurantTable | null>(null)
  const [showOrderModal, setShowOrderModal] = useState<RestaurantTable | null>(null)
  const [showMoveTableModal, setShowMoveTableModal] = useState<RestaurantTable | null>(null)
  const [showBillingModal, setShowBillingModal] = useState<RestaurantTable | null>(null)
  const [showNewTableModal, setShowNewTableModal] = useState(false)

  // Forms
  const [openTableForm, setOpenTableForm] = useState({
    waiter_name: 'Mesero General',
    guest_count: 2
  })

  const [newTableForm, setNewTableForm] = useState({
    table_number: 'Mesa 1',
    zone_name: 'Salón Principal',
    capacity: 4
  })

  const [newOrderItemForm, setNewOrderItemForm] = useState({
    product_name: '',
    quantity: 1,
    unit_price: 25000,
    destination: 'kitchen' as 'kitchen' | 'bar' | 'grill' | 'dessert',
    notes: ''
  })

  const [splitCount, setSplitCount] = useState<number>(2)
  const [includeTip, setIncludeTip] = useState<boolean>(true)

  useEffect(() => {
    loadTablesData()
  }, [])

  async function loadTablesData() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const [tRes, oRes] = await Promise.all([
        supabase.from('restaurant_tables').select('*').eq('tenant_id', tid).order('table_number', { ascending: true }),
        supabase.from('restaurant_orders').select('*, restaurant_order_items(*)').eq('tenant_id', tid).in('status', ['active', 'billing']).order('created_at', { ascending: false })
      ])

      const tablesList: RestaurantTable[] = (tRes.data || []).map((tbl: any) => {
        const activeOrd = (oRes.data || []).find((o: any) => o.table_id === tbl.id && (o.status === 'active' || o.status === 'billing'))
        return {
          ...tbl,
          active_order: activeOrd || null
        }
      })

      setTables(tablesList)
      setOrders(oRes.data || [])
    } catch (err) {
      console.error('Error loading tables data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleOpenTable(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || !showOpenTableModal || submitting) return
    setSubmitting(true)
    try {
      const orderNumber = `COM-${Date.now().toString().slice(-5)}`
      
      const { data: newOrder, error: oErr } = await supabase
        .from('restaurant_orders')
        .insert({
          tenant_id: tenantId,
          table_id: showOpenTableModal.id,
          table_number: showOpenTableModal.table_number,
          order_number: orderNumber,
          waiter_name: openTableForm.waiter_name,
          guest_count: openTableForm.guest_count,
          status: 'active',
          subtotal: 0,
          total: 0
        })
        .select()
        .single()

      if (oErr) throw oErr

      const { error: tErr } = await supabase
        .from('restaurant_tables')
        .update({
          status: 'occupied',
          current_waiter: openTableForm.waiter_name,
          guest_count: openTableForm.guest_count,
          opened_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', showOpenTableModal.id)

      if (tErr) throw tErr

      setShowOpenTableModal(null)
      await loadTablesData()
    } catch (err: any) {
      alert(err.message || 'Error al abrir mesa')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddItemToOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || !showOrderModal?.active_order || submitting) return
    if (!newOrderItemForm.product_name.trim()) return alert('Ingresa la descripción del plato o bebida')

    setSubmitting(true)
    try {
      const order = showOrderModal.active_order
      const qty = Number(newOrderItemForm.quantity) || 1
      const price = Number(newOrderItemForm.unit_price) || 0
      const itemTotal = qty * price

      const { error: itErr } = await supabase.from('restaurant_order_items').insert({
        order_id: order.id,
        product_name: newOrderItemForm.product_name.trim(),
        quantity: qty,
        unit_price: price,
        total_price: itemTotal,
        destination: newOrderItemForm.destination,
        notes: newOrderItemForm.notes || null,
        status: 'pending'
      })
      if (itErr) throw itErr

      const newSubtotal = Number(order.subtotal) + itemTotal
      const newTip = includeTip ? newSubtotal * 0.1 : 0
      const newTotal = newSubtotal + newTip

      const { error: oErr } = await supabase
        .from('restaurant_orders')
        .update({
          subtotal: newSubtotal,
          tip_amount: newTip,
          total: newTotal
        })
        .eq('id', order.id)

      if (oErr) throw oErr

      setNewOrderItemForm({
        product_name: '',
        quantity: 1,
        unit_price: 25000,
        destination: 'kitchen',
        notes: ''
      })

      await loadTablesData()
    } catch (err: any) {
      alert(err.message || 'Error al enviar pedido a cocina')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRequestBilling(table: RestaurantTable) {
    if (!table.active_order) return
    try {
      await supabase.from('restaurant_tables').update({ status: 'billing' }).eq('id', table.id)
      await supabase.from('restaurant_orders').update({ status: 'billing' }).eq('id', table.active_order.id)
      await loadTablesData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function handleCloseAndFreeTable(table: RestaurantTable) {
    if (!confirm(`¿Confirmar cobro y liberar ${table.table_number}?`)) return
    try {
      if (table.active_order) {
        await supabase
          .from('restaurant_orders')
          .update({
            status: 'closed',
            closed_at: new Date().toISOString()
          })
          .eq('id', table.active_order.id)
      }

      await supabase
        .from('restaurant_tables')
        .update({
          status: 'free',
          current_waiter: null,
          guest_count: 0,
          opened_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', table.id)

      setShowBillingModal(null)
      await loadTablesData()
    } catch (err: any) {
      alert('Error al cerrar mesa: ' + err.message)
    }
  }

  async function handleCreateNewTable(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('restaurant_tables').insert({
        tenant_id: tenantId,
        table_number: newTableForm.table_number,
        zone_name: newTableForm.zone_name,
        capacity: Number(newTableForm.capacity),
        status: 'free'
      })
      if (error) throw error
      setShowNewTableModal(false)
      await loadTablesData()
    } catch (err: any) {
      alert(err.message || 'Error al crear mesa')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSeedDemoTables() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const demoTables = [
        { tenant_id: tenantId, table_number: 'Mesa 1', zone_name: 'Salón Principal', capacity: 4, status: 'free' },
        { tenant_id: tenantId, table_number: 'Mesa 2', zone_name: 'Salón Principal', capacity: 2, status: 'free' },
        { tenant_id: tenantId, table_number: 'Mesa 3', zone_name: 'Salón Principal', capacity: 6, status: 'free' },
        { tenant_id: tenantId, table_number: 'Terraza 1', zone_name: 'Terraza / Aire Libre', capacity: 4, status: 'free' },
        { tenant_id: tenantId, table_number: 'Terraza 2', zone_name: 'Terraza / Aire Libre', capacity: 4, status: 'free' },
        { tenant_id: tenantId, table_number: 'Barra 1', zone_name: 'Barra & Coctelería', capacity: 1, status: 'free' },
        { tenant_id: tenantId, table_number: 'Barra 2', zone_name: 'Barra & Coctelería', capacity: 1, status: 'free' }
      ]
      await supabase.from('restaurant_tables').insert(demoTables)
      await loadTablesData()
    } catch (err: any) {
      alert('Error demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const zones = ['all', ...Array.from(new Set(tables.map(t => t.zone_name).filter(Boolean)))]
  const filteredTables = selectedZone === 'all' ? tables : tables.filter(t => t.zone_name === selectedZone)

  const availableCount = tables.filter(t => t.status === 'free').length
  const occupiedCount = tables.filter(t => t.status === 'occupied').length
  const billingCount = tables.filter(t => t.status === 'billing').length
  const totalSalesActive = orders.reduce((acc, o) => acc + Number(o.total || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Ventas & Mostrador</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>Mesas & Salón</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <UtensilsCrossed size={24} style={{ color: 'var(--accent-blue)' }} />
            Control de Mesas & Comandas de Salón
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Distribución en vivo del salón, apertura de mesas, comandas a cocina y precuentas.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/restaurant/kds"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-amber)' }}
          >
            <Flame size={15} />
            <span>Ir a Cocina KDS</span>
          </Link>
          <Link
            href="/restaurant/recipes"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-green)' }}
          >
            <UtensilsCrossed size={15} />
            <span>Recetas & Escandallo</span>
          </Link>
          <button
            onClick={() => setShowNewTableModal(true)}
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Nueva Mesa</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="neu-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-green-lt)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <UtensilsCrossed size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Mesas Libres</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>{availableCount} <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>/ {tables.length}</span></div>
          </div>
        </div>

        <div className="neu-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-coral-lt)', color: 'var(--accent-coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Mesas Ocupadas</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-coral)' }}>{occupiedCount}</div>
          </div>
        </div>

        <div className="neu-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-amber-lt)', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Receipt size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Pidiendo Cuenta</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-amber)' }}>{billingCount}</div>
          </div>
        </div>

        <div className="neu-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-blue-lt)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Venta Activa en Salón</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-blue)' }}>{formatCurrency(totalSalesActive)}</div>
          </div>
        </div>
      </div>

      {/* Zone Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {zones.map(z => (
            <button
              key={z}
              onClick={() => setSelectedZone(z)}
              className={`btn-neu ${selectedZone === z ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: 20 }}
            >
              {z === 'all' ? 'Todas las Zonas' : z}
            </button>
          ))}
        </div>

        <button
          onClick={loadTablesData}
          className="btn-neu btn-ghost"
          style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Empty State or Table Grid */}
      {tables.length === 0 && !loading ? (
        <div className="neu-card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--accent-blue-lt)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UtensilsCrossed size={32} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>No hay mesas configuradas aún</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 460, margin: 0 }}>
            Puedes cargar una distribución de mesas demo con un solo clic o crear tus mesas personalizadas.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={handleSeedDemoTables} className="btn-neu btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>
              <Sparkles size={15} />
              Cargar Mesas Demo
            </button>
            <button onClick={() => setShowNewTableModal(true)} className="btn-neu" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>
              <Plus size={15} />
              Crear Primera Mesa
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filteredTables.map(tbl => {
            const isFree = tbl.status === 'free'
            const isOccupied = tbl.status === 'occupied'
            const isBilling = tbl.status === 'billing'
            const order = tbl.active_order

            return (
              <div
                key={tbl.id}
                className="neu-card"
                style={{
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  borderTop: `4px solid ${isFree ? 'var(--accent-green)' : isOccupied ? 'var(--accent-coral)' : 'var(--accent-amber)'}`,
                  position: 'relative'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{tbl.table_number}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{tbl.zone_name} • Cap: {tbl.capacity} personas</div>
                  </div>

                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: isFree ? 'var(--accent-green-lt)' : isOccupied ? 'var(--accent-coral-lt)' : 'var(--accent-amber-lt)',
                    color: isFree ? 'var(--accent-green)' : isOccupied ? 'var(--accent-coral)' : 'var(--accent-amber)',
                    textTransform: 'uppercase'
                  }}>
                    {isFree ? 'Libre' : isOccupied ? 'Ocupada' : 'Pidiendo Cuenta'}
                  </span>
                </div>

                {/* Body Details */}
                {isFree ? (
                  <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Mesa lista para recibir comensales
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.76rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Comanda:</span>
                      <span style={{ fontWeight: 700 }}>{order?.order_number || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Mesero:</span>
                      <span style={{ fontWeight: 700 }}>{tbl.current_waiter || 'General'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Comensales:</span>
                      <span style={{ fontWeight: 700 }}>{tbl.guest_count} personas</span>
                    </div>
                    <div className="divider" style={{ margin: '4px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Consumo Total:</span>
                      <span style={{ fontWeight: 800, color: 'var(--accent-blue)' }}>{formatCurrency(Number(order?.total || 0))}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 6 }}>
                  {isFree ? (
                    <button
                      onClick={() => setShowOpenTableModal(tbl)}
                      className="btn-neu btn-primary"
                      style={{ width: '100%', padding: '8px 0', fontSize: '0.78rem' }}
                    >
                      <Plus size={14} /> Abrir Mesa
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowOrderModal(tbl)}
                        className="btn-neu btn-primary"
                        style={{ flex: 1, padding: '7px 0', fontSize: '0.75rem' }}
                      >
                        + Comanda
                      </button>
                      <button
                        onClick={() => setShowBillingModal(tbl)}
                        className="btn-neu"
                        style={{ flex: 1, padding: '7px 0', fontSize: '0.75rem', color: 'var(--accent-amber)' }}
                      >
                        <Receipt size={14} /> Precuenta / Cobro
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Abrir Mesa */}
      {showOpenTableModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 400, width: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Abrir {showOpenTableModal.table_number}</h3>
              <button onClick={() => setShowOpenTableModal(null)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <form onSubmit={handleOpenTable} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Mesero Asignado</label>
                <input
                  type="text"
                  required
                  value={openTableForm.waiter_name}
                  onChange={e => setOpenTableForm({ ...openTableForm, waiter_name: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Número de Comensales</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={openTableForm.guest_count}
                  onChange={e => setOpenTableForm({ ...openTableForm, guest_count: Number(e.target.value) })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" onClick={() => setShowOpenTableModal(null)} className="btn-neu" style={{ flex: 1, padding: 9 }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 1, padding: 9 }}>
                  {submitting ? 'Abriendo...' : 'Confirmar Apertura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Comanda (Agregar Ítems a la Orden) */}
      {showOrderModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 520, width: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Comanda para {showOrderModal.table_number}</h3>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Folio: {showOrderModal.active_order?.order_number}</div>
              </div>
              <button onClick={() => setShowOrderModal(null)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <form onSubmit={handleAddItemToOrder} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Plato / Bebida / Producto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Hamburguesa Artesanal, Cerveza Corona..."
                  value={newOrderItemForm.product_name}
                  onChange={e => setNewOrderItemForm({ ...newOrderItemForm, product_name: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newOrderItemForm.quantity}
                    onChange={e => setNewOrderItemForm({ ...newOrderItemForm, quantity: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Precio Unitario (COP)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newOrderItemForm.unit_price}
                    onChange={e => setNewOrderItemForm({ ...newOrderItemForm, unit_price: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Destino en Cocina</label>
                  <select
                    value={newOrderItemForm.destination}
                    onChange={e => setNewOrderItemForm({ ...newOrderItemForm, destination: e.target.value as any })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  >
                    <option value="kitchen">🍳 Cocina Caliente</option>
                    <option value="grill">🥩 Parrilla & Asados</option>
                    <option value="bar">🍹 Barra & Bebidas</option>
                    <option value="dessert">🍰 Postres & Café</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Notas de Cocina</label>
                  <input
                    type="text"
                    placeholder="Ej: Término medio, sin cebolla..."
                    value={newOrderItemForm.notes}
                    onChange={e => setNewOrderItemForm({ ...newOrderItemForm, notes: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowOrderModal(null)} className="btn-neu" style={{ flex: 1, padding: 9 }}>Cerrar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 2, padding: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Flame size={15} />
                  <span>{submitting ? 'Enviando...' : 'Enviar a Cocina KDS'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Precuenta & Cierre de Mesa */}
      {showBillingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 480, width: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Cuenta de {showBillingModal.table_number}</h3>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Folio: {showBillingModal.active_order?.order_number}</div>
              </div>
              <button onClick={() => setShowBillingModal(null)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-deep)', padding: 14, borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Subtotal Consumo:</span>
                <span style={{ fontWeight: 700 }}>{formatCurrency(Number(showBillingModal.active_order?.subtotal || 0))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Propina Voluntaria (10%):</span>
                <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{formatCurrency(Number(showBillingModal.active_order?.tip_amount || 0))}</span>
              </div>
              <div className="divider" style={{ margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800 }}>
                <span>Total a Pagar:</span>
                <span style={{ color: 'var(--accent-blue)' }}>{formatCurrency(Number(showBillingModal.active_order?.total || 0))}</span>
              </div>
            </div>

            {/* Split Bill */}
            <div style={{ background: 'var(--bg-surface)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>Dividir Cuenta (Split Bill)</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Entre comensales de la mesa</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={splitCount}
                  onChange={e => setSplitCount(Number(e.target.value))}
                  className="input-neu"
                  style={{ width: 60, padding: '4px 8px', fontSize: '0.82rem', textAlign: 'center' }}
                />
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-blue)' }}>
                  = {formatCurrency(Number(showBillingModal.active_order?.total || 0) / (splitCount || 1))} / pers.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleRequestBilling(showBillingModal)}
                className="btn-neu"
                style={{ flex: 1, padding: 9, fontSize: '0.78rem' }}
              >
                Marcar Pidiendo Cuenta
              </button>
              <button
                onClick={() => handleCloseAndFreeTable(showBillingModal)}
                className="btn-neu btn-primary"
                style={{ flex: 1, padding: 9, fontSize: '0.78rem' }}
              >
                Confirmar Cobro y Liberar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear Nueva Mesa */}
      {showNewTableModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 400, width: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Agregar Nueva Mesa</h3>
              <button onClick={() => setShowNewTableModal(false)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateNewTable} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Identificador de Mesa</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Mesa 4, Terraza 3, Barra VIP..."
                  value={newTableForm.table_number}
                  onChange={e => setNewTableForm({ ...newTableForm, table_number: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Zona del Restaurante</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Salón Principal, Terraza, Barra, VIP..."
                  value={newTableForm.zone_name}
                  onChange={e => setNewTableForm({ ...newTableForm, zone_name: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Capacidad de Comensales</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={newTableForm.capacity}
                  onChange={e => setNewTableForm({ ...newTableForm, capacity: Number(e.target.value) })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowNewTableModal(false)} className="btn-neu" style={{ flex: 1, padding: 9 }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 1, padding: 9 }}>Guardar Mesa</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
