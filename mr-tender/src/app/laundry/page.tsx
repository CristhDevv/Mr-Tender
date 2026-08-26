'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import {
  Shirt,
  Sparkles,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Phone,
  MessageSquare,
  Clock,
  DollarSign,
  Package,
  Layers,
  TrendingUp,
  Percent,
  Check,
  X,
  FileText,
  ShieldCheck,
  Scale,
  Truck,
  MapPin,
  Tag,
  Wind
} from 'lucide-react'

interface LaundryOrder {
  id: string
  tenant_id: string
  ticket_number: string
  customer_name: string
  customer_phone?: string | null
  customer_address?: string | null
  delivery_type: 'in_store' | 'home_delivery'
  total_pieces: number
  total_weight_kg: number
  service_type: string
  total_price: number
  paid_amount: number
  status: 'received' | 'washing' | 'ironing_folding' | 'ready_for_pickup' | 'delivered' | 'cancelled'
  hanger_location: string
  notes?: string | null
  received_at: string
  estimated_ready_at?: string | null
  delivered_at?: string | null
  created_at: string
  items?: LaundryOrderItem[]
}

interface LaundryOrderItem {
  id: string
  order_id: string
  item_name: string
  quantity: number
  unit_price: number
  total_price: number
  color_or_pattern?: string | null
  special_treatment?: string | null
  created_at: string
}

interface LaundryServiceCatalog {
  id: string
  tenant_id: string
  service_name: string
  category: string
  price: number
  price_unit: string
  estimated_hours: number
  is_active: boolean
  created_at: string
}

export default function LaundryPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'orders' | 'storage' | 'deliveries' | 'catalog'>('orders')
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Data lists
  const [orders, setOrders] = useState<LaundryOrder[]>([])
  const [servicesCatalog, setServicesCatalog] = useState<LaundryServiceCatalog[]>([])

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  // Modals
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<LaundryOrder | null>(null)

  // Forms
  const [orderForm, setOrderForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    delivery_type: 'in_store' as 'in_store' | 'home_delivery',
    service_type: 'Lavado por Kilo',
    total_pieces: 6,
    total_weight_kg: 4.5,
    hanger_location: 'Perchero A-04',
    total_price: 32000,
    paid_amount: 0,
    estimated_ready_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: 'Mancha de grasa previa en camisa blanca / No usar cloro'
  })

  const [serviceForm, setServiceForm] = useState({
    service_name: 'Lavado y Secado por Kilo (Mín. 4kg)',
    category: 'Lavado por Kilo',
    price: 7000,
    price_unit: 'kilo',
    estimated_hours: 24
  })

  useEffect(() => {
    loadLaundryData()
  }, [])

  async function loadLaundryData() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const [ordersRes, itemsRes, catalogRes] = await Promise.all([
        supabase.from('laundry_orders').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(50),
        supabase.from('laundry_order_items').select('*').order('created_at', { ascending: true }),
        supabase.from('laundry_services_catalog').select('*').eq('tenant_id', tid).order('category', { ascending: true })
      ])

      const allItems = itemsRes.data || []
      const ordersWithItems: LaundryOrder[] = (ordersRes.data || []).map((o: any) => ({
        ...o,
        items: allItems.filter((i: any) => i.order_id === o.id)
      }))

      setOrders(ordersWithItems)
      setServicesCatalog(catalogRes.data || [])
    } catch (err) {
      console.error('Error loading laundry data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Create Laundry Order
  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!orderForm.customer_name.trim()) return alert('Ingresa el nombre del cliente')

    setSubmitting(true)
    try {
      const ticketNumber = `LAV-${Date.now().toString().slice(-5)}`
      const payload = {
        tenant_id: tenantId,
        ticket_number: ticketNumber,
        customer_name: orderForm.customer_name.trim(),
        customer_phone: orderForm.customer_phone.trim() || null,
        customer_address: orderForm.customer_address.trim() || null,
        delivery_type: orderForm.delivery_type,
        total_pieces: Number(orderForm.total_pieces) || 1,
        total_weight_kg: Number(orderForm.total_weight_kg) || 0,
        service_type: orderForm.service_type,
        total_price: Number(orderForm.total_price) || 0,
        paid_amount: Number(orderForm.paid_amount) || 0,
        status: 'received',
        hanger_location: orderForm.hanger_location.trim() || 'Perchero A-01',
        notes: orderForm.notes.trim() || null,
        estimated_ready_at: orderForm.estimated_ready_at ? new Date(orderForm.estimated_ready_at).toISOString() : null
      }

      const { error } = await supabase.from('laundry_orders').insert(payload)
      if (error) throw error

      setShowOrderModal(false)
      setOrderForm({
        customer_name: '',
        customer_phone: '',
        customer_address: '',
        delivery_type: 'in_store',
        service_type: 'Lavado por Kilo',
        total_pieces: 6,
        total_weight_kg: 4.5,
        hanger_location: 'Perchero A-04',
        total_price: 32000,
        paid_amount: 0,
        estimated_ready_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: ''
      })
      await loadLaundryData()
    } catch (err: any) {
      alert(err.message || 'Error al crear orden de lavandería')
    } finally {
      setSubmitting(false)
    }
  }

  // Update Laundry Order Status
  async function handleUpdateOrderStatus(orderId: string, status: LaundryOrder['status']) {
    try {
      const payload: any = { status, updated_at: new Date().toISOString() }
      if (status === 'delivered') payload.delivered_at = new Date().toISOString()

      const { error } = await supabase.from('laundry_orders').update(payload).eq('id', orderId)
      if (error) throw error
      await loadLaundryData()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  // Create Service Catalog Item
  async function handleCreateService(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!serviceForm.service_name.trim()) return alert('Ingresa el nombre del servicio')

    setSubmitting(true)
    try {
      const payload = {
        tenant_id: tenantId,
        service_name: serviceForm.service_name.trim(),
        category: serviceForm.category,
        price: Number(serviceForm.price),
        price_unit: serviceForm.price_unit,
        estimated_hours: Number(serviceForm.estimated_hours),
        is_active: true
      }

      const { error } = await supabase.from('laundry_services_catalog').insert(payload)
      if (error) throw error

      setShowServiceModal(false)
      await loadLaundryData()
    } catch (err: any) {
      alert(err.message || 'Error al registrar servicio')
    } finally {
      setSubmitting(false)
    }
  }

  // WhatsApp Ready Notification
  function getWhatsAppReadyUrl(order: LaundryOrder) {
    if (!order.customer_phone) return '#'
    const cleanPhone = order.customer_phone.replace(/\D/g, '')
    const balance = Number(order.total_price) - Number(order.paid_amount)
    const balanceText = balance > 0 ? ` Saldo pendiente: *${formatCurrency(balance)}*.` : ' (Pagado totalmente ✅).'

    const msg = encodeURIComponent(
      `¡Hola ${order.customer_name}! 🧺✨ Te informamos de la Lavandería que tu ticket *${order.ticket_number}* (${order.total_pieces} prendas / ${order.service_type}) ya está limpio, perfumado, doblado/planchado y listo para entrega en *${order.hanger_location}*.${balanceText} ¡Te esperamos!`
    )
    return `https://wa.me/${cleanPhone.startsWith('57') ? cleanPhone : '57' + cleanPhone}?text=${msg}`
  }

  // Seed Demo Data for Laundry
  async function handleSeedLaundryDemo() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      // 1. Catalog
      const demoCatalog = [
        { tenant_id: tenantId, service_name: 'Lavado, Secado & Doblado por Kilo', category: 'Lavado por Kilo', price: 7000, price_unit: 'kilo', estimated_hours: 24 },
        { tenant_id: tenantId, service_name: 'Traje de Paño 2 Piezas (Lavado en Seco)', category: 'Tintorería & Seco', price: 28000, price_unit: 'prenda', estimated_hours: 48 },
        { tenant_id: tenantId, service_name: 'Vestido de Fiesta / Gala en Seco', category: 'Tintorería & Seco', price: 35000, price_unit: 'prenda', estimated_hours: 48 },
        { tenant_id: tenantId, service_name: 'Edredón / Plumón Plumas King Size', category: 'Ropa de Cama', price: 42000, price_unit: 'prenda', estimated_hours: 36 },
        { tenant_id: tenantId, service_name: 'Docena de Camisas Planchadas con Almidón', category: 'Planchado', price: 36000, price_unit: 'docena', estimated_hours: 24 },
        { tenant_id: tenantId, service_name: 'Lavado & Desinfección de Tenis / Sneakers', category: 'Calzado', price: 25000, price_unit: 'par', estimated_hours: 48 }
      ]
      await supabase.from('laundry_services_catalog').insert(demoCatalog)

      // 2. Orders
      const demoOrders = [
        {
          tenant_id: tenantId,
          ticket_number: 'LAV-10492',
          customer_name: 'Camila Montoya',
          customer_phone: '3128901234',
          customer_address: 'Calle 10 # 43E-20 Apto 402',
          delivery_type: 'in_store',
          total_pieces: 8,
          total_weight_kg: 5.2,
          service_type: 'Lavado por Kilo',
          total_price: 36400,
          paid_amount: 36400,
          status: 'ready_for_pickup',
          hanger_location: 'Perchero A-12',
          notes: 'Prendas de color delicadas, usar suavizante extra floral',
          estimated_ready_at: new Date().toISOString()
        },
        {
          tenant_id: tenantId,
          ticket_number: 'LAV-10493',
          customer_name: 'Santiago Morales',
          customer_phone: '3157894561',
          customer_address: 'Carrera 25 # 12-40 Casa 5',
          delivery_type: 'home_delivery',
          total_pieces: 2,
          total_weight_kg: 1.5,
          service_type: 'Tintorería & Seco',
          total_price: 56000,
          paid_amount: 0,
          status: 'ironing_folding',
          hanger_location: 'Perchero B-03',
          notes: 'Traje azul marino de paño + Blazer beige (Tratamiento en seco antiestático)',
          estimated_ready_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
        },
        {
          tenant_id: tenantId,
          ticket_number: 'LAV-10494',
          customer_name: 'Gloria Elena Arango',
          customer_phone: '3104561234',
          delivery_type: 'in_store',
          total_pieces: 3,
          total_weight_kg: 6.8,
          service_type: 'Ropa de Cama & Edredones',
          total_price: 65000,
          paid_amount: 30000,
          status: 'washing',
          hanger_location: 'Casillero C-01',
          notes: 'Edredón King de plumas blanco con manchas de café previas',
          estimated_ready_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      ]
      await supabase.from('laundry_orders').insert(demoOrders)

      await loadLaundryData()
    } catch (err: any) {
      console.error(err)
      alert('Error cargando demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered Orders
  const filteredOrders = orders.filter(o => {
    const q = searchQuery.toLowerCase()
    const matchQ = o.ticket_number.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      (o.customer_phone || '').includes(q) ||
      o.hanger_location.toLowerCase().includes(q) ||
      o.service_type.toLowerCase().includes(q)
    const matchS = filterStatus === 'all' || o.status === filterStatus
    return matchQ && matchS
  })

  // KPIs
  const activeOrdersCount = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length
  const readyOrdersCount = orders.filter(o => o.status === 'ready_for_pickup').length
  const homeDeliveriesCount = orders.filter(o => o.delivery_type === 'home_delivery' && o.status !== 'delivered').length
  const totalLaundryRevenue = orders.filter(o => o.status === 'delivered').reduce((acc, o) => acc + Number(o.total_price), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shirt size={20} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Lavandería, Tintorería & Planchado
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0' }}>
            Control de tickets por prenda/kilo, ubicación en percheros, lavado en seco y rutas de entrega a domicilio
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadLaundryData} className="btn-neu btn-ghost" title="Actualizar datos" style={{ padding: '8px 12px' }}>
            <RefreshCw size={15} strokeWidth={2} />
          </button>
          {orders.length === 0 && (
            <button onClick={handleSeedLaundryDemo} disabled={submitting} className="btn-neu btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: 600 }}>
              Cargar Datos Demo de Lavandería
            </button>
          )}
          {activeTab === 'orders' && (
            <button onClick={() => setShowOrderModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Nuevo Ticket de Ropa</span>
            </button>
          )}
          {activeTab === 'catalog' && (
            <button onClick={() => setShowServiceModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Nuevo Servicio / Tarifa</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-green)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Tickets en Proceso
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-green)' }}>
            {activeOrdersCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Prendas en lavado, secado o plancha
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-blue)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Listos para Entrega
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-blue)' }}>
            {readyOrdersCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Prendas colgadas en percheros
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-amber)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Domicilios Pendientes
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-amber)' }}>
            {homeDeliveriesCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Entregas en ruta / motorizado
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-coral)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Kilos en Custodia
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-coral)' }}>
            {orders.filter(o => o.status !== 'delivered').reduce((acc, o) => acc + Number(o.total_weight_kg), 0).toFixed(1)} kg
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Carga total en lavandería
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab('orders')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'orders' ? 800 : 500,
            background: activeTab === 'orders' ? 'var(--accent-green)' : 'var(--bg)',
            color: activeTab === 'orders' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Shirt size={15} />
          <span>Tickets & Producción ({activeOrdersCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('storage')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'storage' ? 800 : 500,
            background: activeTab === 'storage' ? 'var(--accent-green)' : 'var(--bg)',
            color: activeTab === 'storage' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Tag size={15} />
          <span>Control de Percheros & Ubicación</span>
        </button>

        <button
          onClick={() => setActiveTab('deliveries')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'deliveries' ? 800 : 500,
            background: activeTab === 'deliveries' ? 'var(--accent-green)' : 'var(--bg)',
            color: activeTab === 'deliveries' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Truck size={15} />
          <span>Domicilios & Entregas ({homeDeliveriesCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'catalog' ? 800 : 500,
            background: activeTab === 'catalog' ? 'var(--accent-green)' : 'var(--bg)',
            color: activeTab === 'catalog' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <DollarSign size={15} />
          <span>Tarifario & Servicios ({servicesCatalog.length})</span>
        </button>
      </div>

      {/* ── TAB 1: TICKETS & PRODUCCIÓN ── */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div className="input-neu" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 260, padding: '6px 12px' }}>
              <Search size={15} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Buscar por ticket (ej: LAV-10492), cliente, perchero..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: 'var(--text-primary)' }}
              />
            </div>

            <select
              className="input-neu"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            >
              <option value="all">Todos los estados</option>
              <option value="received">📥 Recibido</option>
              <option value="washing">🧼 En Lavado</option>
              <option value="ironing_folding">💨 Planchado & Doblado</option>
              <option value="ready_for_pickup">✨ Listo para Entrega</option>
              <option value="delivered">✅ Entregado</option>
            </select>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🧺</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay órdenes de lavandería</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Genera un ticket de recepción con los kilos, prendas y perchero asignado.
              </p>
              <button onClick={() => setShowOrderModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem' }}>
                + Crear primer ticket de ropa
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
              {filteredOrders.map(order => {
                const isReceived = order.status === 'received'
                const isWashing = order.status === 'washing'
                const isIroning = order.status === 'ironing_folding'
                const isReady = order.status === 'ready_for_pickup'
                const isDelivered = order.status === 'delivered'

                const statusColor = isReceived ? 'var(--text-muted)'
                  : isWashing ? 'var(--accent-blue)'
                  : isIroning ? 'var(--accent-amber)'
                  : isReady ? 'var(--accent-green)'
                  : 'var(--text-muted)'

                const statusText = isReceived ? '📥 Recibido'
                  : isWashing ? '🧼 En Lavado'
                  : isIroning ? '💨 Planchado/Doblado'
                  : isReady ? '✨ Listo para Entrega'
                  : '✅ Entregado'

                const balance = Number(order.total_price) - Number(order.paid_amount)
                const isFullyPaid = balance <= 0

                return (
                  <div key={order.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, borderTop: `4px solid ${statusColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                            {order.ticket_number}
                          </span>
                          <span style={{
                            padding: '2px 7px',
                            borderRadius: 4,
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: 'var(--accent-green)'
                          }}>
                            📍 {order.hanger_location}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {order.service_type} • <strong>{order.total_pieces} prendas</strong> ({order.total_weight_kg} kg)
                        </div>
                      </div>

                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: statusColor }}>
                        {statusText}
                      </span>
                    </div>

                    {/* Customer & Address Details */}
                    <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Cliente:</span>
                        <strong>{order.customer_name} {order.customer_phone ? `(${order.customer_phone})` : ''}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Entrega:</span>
                        <span>{order.delivery_type === 'home_delivery' ? `🛵 Domicilio (${order.customer_address || 'Sin dir'})` : '🏬 Mostrador / Tienda'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: 4, marginTop: 2 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Total a Pagar:</span>
                        <strong style={{ color: 'var(--accent-green)', fontSize: '0.95rem' }}>{formatCurrency(Number(order.total_price))}</strong>
                      </div>
                      {!isFullyPaid && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--accent-coral)' }}>
                          <span>Saldo Pendiente:</span>
                          <strong>{formatCurrency(balance)}</strong>
                        </div>
                      )}
                    </div>

                    {order.notes && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--accent-amber)', fontStyle: 'italic' }}>
                        ⚠️ Observaciones: {order.notes}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      {isReceived && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'washing')}
                          className="btn-neu btn-primary"
                          style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem' }}
                        >
                          Iniciar Lavado 🧼
                        </button>
                      )}

                      {isWashing && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'ironing_folding')}
                          className="btn-neu"
                          style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem', background: 'var(--accent-amber)', color: '#fff', fontWeight: 800 }}
                        >
                          Planchado / Doblado 💨
                        </button>
                      )}

                      {isIroning && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'ready_for_pickup')}
                          className="btn-neu"
                          style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem', background: 'var(--accent-green)', color: '#fff', fontWeight: 800 }}
                        >
                          Marcar Listo ✨
                        </button>
                      )}

                      {isReady && (
                        <>
                          {order.customer_phone && (
                            <a
                              href={getWhatsAppReadyUrl(order)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-neu"
                              style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem', background: '#16A34A', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                            >
                              <MessageSquare size={13} />
                              <span>Avisar WhatsApp</span>
                            </a>
                          )}
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                            className="btn-neu btn-primary"
                            style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem' }}
                          >
                            Entregar al Cliente
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: CONTROL DE PERCHEROS ── */}
      {activeTab === 'storage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="neu-card" style={{ padding: 18 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 12px' }}>
              📍 Mapa de Percheros & Casilleros de Entrega
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {['Perchero A-01', 'Perchero A-04', 'Perchero A-12', 'Perchero B-03', 'Perchero B-08', 'Casillero C-01', 'Casillero C-02'].map(loc => {
                const ordersInLoc = orders.filter(o => o.hanger_location === loc && o.status !== 'delivered')

                return (
                  <div key={loc} style={{ background: 'var(--bg-deep)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--accent-green)' }}>{loc}</strong>
                      <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4, background: ordersInLoc.length > 0 ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg)', color: ordersInLoc.length > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                        {ordersInLoc.length} órdenes
                      </span>
                    </div>

                    {ordersInLoc.length === 0 ? (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Espacio libre</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {ordersInLoc.map(o => (
                          <div key={o.id} style={{ fontSize: '0.72rem', background: 'var(--bg)', padding: '4px 6px', borderRadius: 4 }}>
                            <strong>{o.ticket_number}</strong>: {o.customer_name} ({o.total_pieces} prendas)
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: DOMICILIOS & RUTAS ── */}
      {activeTab === 'deliveries' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {orders.filter(o => o.delivery_type === 'home_delivery').length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🛵</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>No hay domicilios programados</h3>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {orders.filter(o => o.delivery_type === 'home_delivery').map(order => {
                const balance = Number(order.total_price) - Number(order.paid_amount)
                return (
                  <div key={order.id} className="neu-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, borderLeft: '4px solid var(--accent-amber)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ fontFamily: 'monospace' }}>{order.ticket_number}</strong>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-amber)' }}>🛵 Domicilio</span>
                    </div>
                    <div style={{ fontSize: '0.8rem' }}>
                      <strong>{order.customer_name}</strong> • {order.customer_phone}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      📍 Dirección: {order.customer_address || 'Por confirmar'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-deep)', padding: 6, borderRadius: 6, fontSize: '0.75rem' }}>
                      <span>Cobrar al entregar:</span>
                      <strong style={{ color: 'var(--accent-green)' }}>{formatCurrency(balance)}</strong>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: TARIFARIO & SERVICIOS ── */}
      {activeTab === 'catalog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {servicesCatalog.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🏷️</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay tarifas configuradas</h3>
              <button onClick={() => setShowServiceModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem', marginTop: 10 }}>
                + Registrar primer servicio
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {servicesCatalog.map(serv => (
                <div key={serv.id} className="neu-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: 4, background: 'var(--bg-deep)', color: 'var(--accent-green)', fontWeight: 800 }}>
                        {serv.category}
                      </span>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', marginTop: 4 }}>
                        {serv.service_name}
                      </div>
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--accent-green)' }}>
                      {formatCurrency(Number(serv.price))}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Tiempo estimado: {serv.estimated_hours} horas • Tarifa por {serv.price_unit}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: NUEVO TICKET DE ROPA ── */}
      {showOrderModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                🧺 Recepción de Ropa / Nuevo Ticket
              </h2>
              <button onClick={() => setShowOrderModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Cliente *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Camila Montoya"
                    value={orderForm.customer_name}
                    onChange={e => setOrderForm(f => ({ ...f, customer_name: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>WhatsApp / Teléfono</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="3128901234"
                    value={orderForm.customer_phone}
                    onChange={e => setOrderForm(f => ({ ...f, customer_phone: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Tipo de Entrega</label>
                  <select
                    className="input-neu"
                    value={orderForm.delivery_type}
                    onChange={e => setOrderForm(f => ({ ...f, delivery_type: e.target.value as any }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    <option value="in_store">🏬 Recoge en Tienda / Mostrador</option>
                    <option value="home_delivery">🛵 Entrega a Domicilio</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Ubicación en Perchero</label>
                  <input
                    type="text"
                    className="input-neu"
                    value={orderForm.hanger_location}
                    onChange={e => setOrderForm(f => ({ ...f, hanger_location: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              {orderForm.delivery_type === 'home_delivery' && (
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Dirección de Entrega</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Calle 10 # 43E-20 Apto 402"
                    value={orderForm.customer_address}
                    onChange={e => setOrderForm(f => ({ ...f, customer_address: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Servicio</label>
                  <select
                    className="input-neu"
                    value={orderForm.service_type}
                    onChange={e => setOrderForm(f => ({ ...f, service_type: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    <option value="Lavado por Kilo">Lavado por Kilo</option>
                    <option value="Tintorería & Seco">Tintorería & Seco</option>
                    <option value="Planchado Único">Planchado Único</option>
                    <option value="Ropa de Cama & Edredones">Edredones & Cobijas</option>
                    <option value="Calzado">Tenis / Calzado</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Prendas</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={orderForm.total_pieces}
                    onChange={e => setOrderForm(f => ({ ...f, total_pieces: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Kilos</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={orderForm.total_weight_kg}
                    onChange={e => setOrderForm(f => ({ ...f, total_weight_kg: Number(e.target.value) }))}
                    step={0.1}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Total a Cobrar ($) *</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={orderForm.total_price}
                    onChange={e => setOrderForm(f => ({ ...f, total_price: Number(e.target.value) }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Anticipo Pagado ($)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={orderForm.paid_amount}
                    onChange={e => setOrderForm(f => ({ ...f, paid_amount: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Observaciones (Manchas / Cuidado)</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Mancha previa en cuello, botones sueltos..."
                  value={orderForm.notes}
                  onChange={e => setOrderForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
                <button type="button" onClick={() => setShowOrderModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Creando...' : 'Crear Ticket de Ropa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NUEVO SERVICIO / TARIFA ── */}
      {showServiceModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 440, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                🏷️ Registrar Servicio / Tarifa
              </h2>
              <button onClick={() => setShowServiceModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateService} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Nombre del Servicio *</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Ej: Vestido de Gala en Seco"
                  value={serviceForm.service_name}
                  onChange={e => setServiceForm(f => ({ ...f, service_name: e.target.value }))}
                  required
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Categoría</label>
                  <select
                    className="input-neu"
                    value={serviceForm.category}
                    onChange={e => setServiceForm(f => ({ ...f, category: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    <option value="Lavado por Kilo">Lavado por Kilo</option>
                    <option value="Tintorería & Seco">Tintorería & Seco</option>
                    <option value="Planchado">Planchado</option>
                    <option value="Ropa de Cama">Ropa de Cama</option>
                    <option value="Calzado">Calzado</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Unidad de Cobro</label>
                  <select
                    className="input-neu"
                    value={serviceForm.price_unit}
                    onChange={e => setServiceForm(f => ({ ...f, price_unit: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    <option value="kilo">Por Kilo</option>
                    <option value="prenda">Por Prenda</option>
                    <option value="docena">Por Docena</option>
                    <option value="par">Por Par</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Precio ($) *</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={serviceForm.price}
                    onChange={e => setServiceForm(f => ({ ...f, price: Number(e.target.value) }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Horas Estimadas</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={serviceForm.estimated_hours}
                    onChange={e => setServiceForm(f => ({ ...f, estimated_hours: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
                <button type="button" onClick={() => setShowServiceModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Guardando...' : 'Guardar Servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
