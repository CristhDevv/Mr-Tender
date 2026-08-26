'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import {
  UtensilsCrossed,
  ChefHat,
  Receipt,
  BookOpen,
  Calendar,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Flame,
  Bell,
  Clock,
  DollarSign,
  Users,
  Layers,
  ArrowRight,
  Printer,
  Sparkles,
  RotateCcw,
  Check,
  X,
  AlertTriangle,
  MoveRight,
  TrendingUp,
  Percent,
  Beer,
  Coffee
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
  kitchen_ready_at?: string | null
  created_at: string
}

interface RestaurantRecipe {
  id: string
  tenant_id: string
  dish_name: string
  dish_price: number
  portion_cost: number
  ingredients_json: Array<{ ingredient: string; quantity: string; cost: number }>
  preparation_notes?: string | null
  created_at: string
}

interface RestaurantReservation {
  id: string
  tenant_id: string
  table_id?: string | null
  customer_name: string
  customer_phone?: string | null
  reservation_date: string
  reservation_time: string
  guest_count: number
  status: 'confirmed' | 'seated' | 'cancelled'
  notes?: string | null
}

export default function RestaurantPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'tables' | 'kds' | 'billing' | 'recipes' | 'reservations'>('tables')
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Data lists
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [orders, setOrders] = useState<RestaurantOrder[]>([])
  const [kdsItems, setKdsItems] = useState<RestaurantOrderItem[]>([])
  const [recipes, setRecipes] = useState<RestaurantRecipe[]>([])
  const [reservations, setReservations] = useState<RestaurantReservation[]>([])

  // Active zone filter
  const [selectedZone, setSelectedZone] = useState<string>('all')
  const [kdsDestination, setKdsDestination] = useState<string>('all')

  // Modals
  const [showOpenTableModal, setShowOpenTableModal] = useState<RestaurantTable | null>(null)
  const [showOrderModal, setShowOrderModal] = useState<RestaurantTable | null>(null)
  const [showMoveTableModal, setShowMoveTableModal] = useState<RestaurantTable | null>(null)
  const [showBillingModal, setShowBillingModal] = useState<RestaurantTable | null>(null)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [showReservationModal, setShowReservationModal] = useState(false)
  const [showNewTableModal, setShowNewTableModal] = useState(false)

  // Forms
  const [openTableForm, setOpenTableForm] = useState({
    waiter_name: 'Carlos Ruiz',
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
    notes: 'Término medio / Sin cebolla'
  })

  const [splitCount, setSplitCount] = useState<number>(2)
  const [includeTip, setIncludeTip] = useState<boolean>(true)

  const [recipeForm, setRecipeForm] = useState({
    dish_name: 'Hamburguesa Artesanal Angus',
    dish_price: 32000,
    preparation_notes: 'Parrilla a fuego alto 4 min por lado. Armar con pan brioche sellado en mantequilla.',
    ingredients: [
      { ingredient: 'Pan Brioche Artesanal', quantity: '1 und', cost: 1800 },
      { ingredient: 'Carne Molida Angus 150g', quantity: '150 g', cost: 5200 },
      { ingredient: 'Queso Cheddar Americano', quantity: '1 tajada', cost: 1100 },
      { ingredient: 'Tocineta Ahumada', quantity: '30 g', cost: 1500 },
      { ingredient: 'Salsas y Vegetales', quantity: 'Porción', cost: 800 }
    ]
  })

  const [reservationForm, setReservationForm] = useState({
    customer_name: '',
    customer_phone: '',
    reservation_date: new Date().toISOString().split('T')[0],
    reservation_time: '20:00',
    guest_count: 4,
    table_id: '',
    notes: 'Cumpleaños / Ubicar en terraza'
  })

  useEffect(() => {
    loadRestaurantData()
  }, [])

  async function loadRestaurantData() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      // Fetch tables, active orders, KDS items, recipes, reservations
      const [tRes, oRes, kRes, rRes, resvRes] = await Promise.all([
        supabase.from('restaurant_tables').select('*').eq('tenant_id', tid).order('table_number', { ascending: true }),
        supabase.from('restaurant_orders').select('*, restaurant_order_items(*)').eq('tenant_id', tid).in('status', ['active', 'billing']).order('created_at', { ascending: false }),
        supabase.from('restaurant_order_items').select('*, restaurant_orders(table_number, waiter_name)').in('status', ['pending', 'cooking', 'ready']).order('created_at', { ascending: true }),
        supabase.from('restaurant_recipes').select('*').eq('tenant_id', tid).order('dish_name', { ascending: true }),
        supabase.from('restaurant_reservations').select('*').eq('tenant_id', tid).order('reservation_date', { ascending: true })
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
      setKdsItems((kRes.data as any) || [])
      setRecipes(rRes.data || [])
      setReservations(resvRes.data || [])
    } catch (err) {
      console.error('Error loading restaurant data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Open Table & Create Order
  async function handleOpenTable(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || !showOpenTableModal || submitting) return
    setSubmitting(true)
    try {
      const orderNumber = `COM-${Date.now().toString().slice(-5)}`
      
      // 1. Create order
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

      // 2. Update table status
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
      await loadRestaurantData()
    } catch (err: any) {
      alert(err.message || 'Error al abrir mesa')
    } finally {
      setSubmitting(false)
    }
  }

  // Add Item to Order & Send to Kitchen KDS
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

      // 1. Insert item
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

      // 2. Update order totals
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

      await loadRestaurantData()
    } catch (err: any) {
      alert(err.message || 'Error al enviar pedido a cocina')
    } finally {
      setSubmitting(false)
    }
  }

  // KDS: Update item preparation status
  async function handleUpdateKdsStatus(itemId: string, nextStatus: 'cooking' | 'ready' | 'served') {
    try {
      const payload: any = { status: nextStatus }
      if (nextStatus === 'ready') {
        payload.kitchen_ready_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('restaurant_order_items')
        .update(payload)
        .eq('id', itemId)

      if (error) throw error
      await loadRestaurantData()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  // Request Pre-bill (Pidiendo Cuenta)
  async function handleRequestBilling(table: RestaurantTable) {
    if (!table.active_order) return
    try {
      await supabase.from('restaurant_tables').update({ status: 'billing' }).eq('id', table.id)
      await supabase.from('restaurant_orders').update({ status: 'billing' }).eq('id', table.active_order.id)
      await loadRestaurantData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Close Table & Release (Cobro Finalizado)
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
      await loadRestaurantData()
    } catch (err: any) {
      alert('Error al cerrar mesa: ' + err.message)
    }
  }

  // Save New Table
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
      await loadRestaurantData()
    } catch (err: any) {
      alert(err.message || 'Error al crear mesa')
    } finally {
      setSubmitting(false)
    }
  }

  // Save Recipe & Escandallo
  async function handleCreateRecipe(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const portionCost = recipeForm.ingredients.reduce((acc, it) => acc + Number(it.cost || 0), 0)
      const payload = {
        tenant_id: tenantId,
        dish_name: recipeForm.dish_name,
        dish_price: Number(recipeForm.dish_price),
        portion_cost: portionCost,
        ingredients_json: recipeForm.ingredients,
        preparation_notes: recipeForm.preparation_notes || null
      }
      const { error } = await supabase.from('restaurant_recipes').insert(payload)
      if (error) throw error
      setShowRecipeModal(false)
      await loadRestaurantData()
    } catch (err: any) {
      alert(err.message || 'Error al guardar receta')
    } finally {
      setSubmitting(false)
    }
  }

  // Seed Demo Restaurant Data
  async function handleSeedRestaurantDemo() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      // 1. Tables
      const demoTables = [
        { tenant_id: tenantId, table_number: 'Mesa 1', zone_name: 'Salón Principal', capacity: 4, status: 'free' },
        { tenant_id: tenantId, table_number: 'Mesa 2', zone_name: 'Salón Principal', capacity: 2, status: 'free' },
        { tenant_id: tenantId, table_number: 'Mesa 3', zone_name: 'Salón Principal', capacity: 6, status: 'free' },
        { tenant_id: tenantId, table_number: 'Terraza 1', zone_name: 'Terraza al Aire Libre', capacity: 4, status: 'free' },
        { tenant_id: tenantId, table_number: 'Terraza 2', zone_name: 'Terraza al Aire Libre', capacity: 4, status: 'free' },
        { tenant_id: tenantId, table_number: 'Barra 1', zone_name: 'Barra Coctelera', capacity: 2, status: 'free' },
        { tenant_id: tenantId, table_number: 'VIP 1', zone_name: 'Zona VIP', capacity: 8, status: 'free' }
      ]
      const { data: createdTables } = await supabase.from('restaurant_tables').insert(demoTables).select()

      if (createdTables && createdTables.length > 0) {
        // Open Table 1 with active order
        const { data: ord1 } = await supabase.from('restaurant_orders').insert({
          tenant_id: tenantId,
          table_id: createdTables[0].id,
          table_number: 'Mesa 1',
          order_number: 'COM-10492',
          waiter_name: 'Carlos Ruiz',
          guest_count: 3,
          status: 'active',
          subtotal: 98000,
          tip_amount: 9800,
          total: 107800
        }).select().single()

        await supabase.from('restaurant_tables').update({
          status: 'occupied',
          current_waiter: 'Carlos Ruiz',
          guest_count: 3,
          opened_at: new Date().toISOString()
        }).eq('id', createdTables[0].id)

        // Add items to order 1
        if (ord1) {
          await supabase.from('restaurant_order_items').insert([
            { order_id: ord1.id, product_name: 'Punta de Anca 350g con Papas', quantity: 2, unit_price: 38000, total_price: 76000, destination: 'grill', notes: 'Término 3/4, ensalada sin aderezo', status: 'cooking' },
            { order_id: ord1.id, product_name: 'Cerveza Corona Extra 330ml', quantity: 2, unit_price: 11000, total_price: 22000, destination: 'bar', notes: 'Con limón y sal', status: 'ready' }
          ])
        }

        // Open Table 2 (Billing state)
        const { data: ord2 } = await supabase.from('restaurant_orders').insert({
          tenant_id: tenantId,
          table_id: createdTables[1].id,
          table_number: 'Mesa 2',
          order_number: 'COM-10493',
          waiter_name: 'Laura Méndez',
          guest_count: 2,
          status: 'billing',
          subtotal: 64000,
          tip_amount: 6400,
          total: 70400
        }).select().single()

        await supabase.from('restaurant_tables').update({
          status: 'billing',
          current_waiter: 'Laura Méndez',
          guest_count: 2,
          opened_at: new Date().toISOString()
        }).eq('id', createdTables[1].id)

        if (ord2) {
          await supabase.from('restaurant_order_items').insert([
            { order_id: ord2.id, product_name: 'Hamburguesa Doble Queso Tocino', quantity: 2, unit_price: 32000, total_price: 64000, destination: 'kitchen', notes: 'Papas rústicas', status: 'served' }
          ])
        }
      }

      // 2. Demo Recipes
      const demoRecipes = [
        {
          tenant_id: tenantId,
          dish_name: 'Hamburguesa Doble Queso Tocino',
          dish_price: 32000,
          portion_cost: 10400,
          ingredients_json: [
            { ingredient: 'Pan Brioche Artesanal', quantity: '1 und', cost: 1800 },
            { ingredient: 'Carne Molida Angus', quantity: '200 g', cost: 6000 },
            { ingredient: 'Queso Cheddar', quantity: '2 tajadas', cost: 1400 },
            { ingredient: 'Tocineta Ahumada', quantity: '30 g', cost: 1200 }
          ],
          preparation_notes: 'Sellar carne 3 min por lado en plancha caliente'
        },
        {
          tenant_id: tenantId,
          dish_name: 'Punta de Anca 350g',
          dish_price: 38000,
          portion_cost: 14200,
          ingredients_json: [
            { ingredient: 'Corte Punta de Anca Madurada', quantity: '350 g', cost: 12500 },
            { ingredient: 'Papas a la Francesa', quantity: '150 g', cost: 1200 },
            { ingredient: 'Chimichurri de la Casa', quantity: '50 g', cost: 500 }
          ],
          preparation_notes: 'Asar a carbón según término solicitado por el cliente'
        }
      ]
      await supabase.from('restaurant_recipes').insert(demoRecipes)

      await loadRestaurantData()
    } catch (err: any) {
      console.error(err)
      alert('Error cargando demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered Tables by Zone
  const filteredTables = tables.filter(t => selectedZone === 'all' || t.zone_name === selectedZone)
  const uniqueZones = Array.from(new Set(tables.map(t => t.zone_name)))

  // Filtered KDS Items
  const filteredKdsItems = kdsItems.filter(it => kdsDestination === 'all' || it.destination === kdsDestination)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UtensilsCrossed size={20} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Restaurante, Mesas & Comandera
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0' }}>
            Mapa de mesas en vivo, comandas digitales KDS a cocina/barra, división de cuentas (*split bill*) y escandallo de recetas
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadRestaurantData} className="btn-neu btn-ghost" title="Actualizar datos" style={{ padding: '8px 12px' }}>
            <RefreshCw size={15} strokeWidth={2} />
          </button>
          {tables.length === 0 && (
            <button onClick={handleSeedRestaurantDemo} disabled={submitting} className="btn-neu btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: 600 }}>
              Cargar Mesas & Comandas Demo
            </button>
          )}
          {activeTab === 'tables' && (
            <button onClick={() => setShowNewTableModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Nueva Mesa</span>
            </button>
          )}
          {activeTab === 'recipes' && (
            <button onClick={() => setShowRecipeModal(true)} className="btn-neu btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2.5} />
              <span>Nueva Receta / Escandallo</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-green)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Mesas Disponibles
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-green)' }}>
            {tables.filter(t => t.status === 'free').length} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ {tables.length}</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Listas para asignar a clientes
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-coral)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Mesas Ocupadas
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-coral)' }}>
            {tables.filter(t => t.status === 'occupied' || t.status === 'billing').length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {tables.reduce((acc, t) => acc + (t.guest_count || 0), 0)} comensales atendidos
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-amber)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Platos en Cocina (KDS)
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-amber)' }}>
            {kdsItems.filter(k => k.status === 'cooking' || k.status === 'pending').length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {kdsItems.filter(k => k.status === 'ready').length} listos para servir
          </div>
        </div>

        <div className="neu-card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-blue)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Venta Activa en Salón
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-blue)' }}>
            {formatCurrency(orders.reduce((acc, o) => acc + Number(o.total || 0), 0))}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Incluye {formatCurrency(orders.reduce((acc, o) => acc + Number(o.tip_amount || 0), 0))} propina
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab('tables')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'tables' ? 800 : 500,
            background: activeTab === 'tables' ? 'var(--accent-amber)' : 'var(--bg)',
            color: activeTab === 'tables' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <UtensilsCrossed size={15} />
          <span>Mapa de Mesas ({tables.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('kds')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'kds' ? 800 : 500,
            background: activeTab === 'kds' ? 'var(--accent-amber)' : 'var(--bg)',
            color: activeTab === 'kds' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <ChefHat size={15} />
          <span>Comandera Cocina KDS ({kdsItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('recipes')}
          className="btn-neu"
          style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'recipes' ? 800 : 500,
            background: activeTab === 'recipes' ? 'var(--accent-amber)' : 'var(--bg)',
            color: activeTab === 'recipes' ? '#fff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <BookOpen size={15} />
          <span>Recetas & Escandallo ({recipes.length})</span>
        </button>
      </div>

      {/* ── TAB 1: MAPA INTERACTIVO DE MESAS ── */}
      {activeTab === 'tables' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Zone Selector */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedZone('all')}
              className="btn-neu"
              style={{
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: selectedZone === 'all' ? 800 : 500,
                background: selectedZone === 'all' ? 'var(--bg-deep)' : 'var(--bg)',
                border: selectedZone === 'all' ? '1px solid var(--accent-amber)' : '1px solid var(--border-color)'
              }}
            >
              Todos los Salones ({tables.length})
            </button>
            {uniqueZones.map(zone => (
              <button
                key={zone}
                onClick={() => setSelectedZone(zone)}
                className="btn-neu"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  fontWeight: selectedZone === zone ? 800 : 500,
                  background: selectedZone === zone ? 'var(--bg-deep)' : 'var(--bg)',
                  border: selectedZone === zone ? '1px solid var(--accent-amber)' : '1px solid var(--border-color)'
                }}
              >
                {zone} ({tables.filter(t => t.zone_name === zone).length})
              </button>
            ))}
          </div>

          {/* Tables Grid */}
          {filteredTables.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🍽️</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay mesas configuradas</h3>
              <button onClick={() => setShowNewTableModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem', marginTop: 10 }}>
                + Crear primera mesa
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              {filteredTables.map(tbl => {
                const isFree = tbl.status === 'free'
                const isOccupied = tbl.status === 'occupied'
                const isBilling = tbl.status === 'billing'
                const isReserved = tbl.status === 'reserved'

                const statusColor = isFree ? 'var(--accent-green)'
                  : isOccupied ? 'var(--accent-coral)'
                  : isBilling ? 'var(--accent-amber)'
                  : 'var(--accent-purple)'

                const statusLabel = isFree ? '🟢 Libre'
                  : isOccupied ? '🔴 Ocupada'
                  : isBilling ? '🟡 Pidiendo Cuenta'
                  : '🟣 Reservada'

                return (
                  <div
                    key={tbl.id}
                    className="neu-card"
                    style={{
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      borderTop: `4px solid ${statusColor}`,
                      background: isBilling ? 'rgba(217, 119, 6, 0.03)' : 'var(--bg)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                          {tbl.table_number}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {tbl.zone_name} • Cap: {tbl.capacity} personas
                        </div>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: statusColor }}>
                        {statusLabel}
                      </span>
                    </div>

                    {/* Table Details */}
                    {!isFree && tbl.active_order ? (
                      <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Mesero: <strong>{tbl.current_waiter}</strong></span>
                          <span style={{ color: 'var(--text-secondary)' }}>👥 {tbl.guest_count} personas</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tbl.active_order.items?.length || 0} ítems pedidos</span>
                          <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--accent-blue)' }}>
                            {formatCurrency(Number(tbl.active_order.total))}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        Mesa limpia y lista para recibir comensales
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      {isFree ? (
                        <button
                          onClick={() => { setShowOpenTableModal(tbl); setOpenTableForm({ waiter_name: 'Carlos Ruiz', guest_count: tbl.capacity }) }}
                          className="btn-neu btn-primary"
                          style={{ width: '100%', padding: '8px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                          <Users size={14} />
                          <span>Abrir Mesa & Pedir</span>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setShowOrderModal(tbl)}
                            className="btn-neu"
                            style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem', background: 'var(--bg)', color: 'var(--accent-blue)', fontWeight: 700 }}
                          >
                            + Comanda
                          </button>

                          {isOccupied && (
                            <button
                              onClick={() => handleRequestBilling(tbl)}
                              className="btn-neu"
                              style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem', background: 'var(--bg)', color: 'var(--accent-amber)', fontWeight: 700 }}
                            >
                              Precuenta
                            </button>
                          )}

                          <button
                            onClick={() => setShowBillingModal(tbl)}
                            className="btn-neu btn-primary"
                            style={{ flex: 1, padding: '7px 8px', fontSize: '0.75rem' }}
                          >
                            Cobrar
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

      {/* ── TAB 2: COMANDERA COCINA KDS ── */}
      {activeTab === 'kds' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Destination Area Filters */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: '🔥 Toda la Cocina' },
              { id: 'kitchen', label: '🍳 Cocina Caliente' },
              { id: 'grill', label: '🥩 Parrilla & Asados' },
              { id: 'bar', label: '🍹 Barra & Bebidas' },
              { id: 'dessert', label: '🍰 Postres' }
            ].map(d => (
              <button
                key={d.id}
                onClick={() => setKdsDestination(d.id)}
                className="btn-neu"
                style={{
                  padding: '7px 14px',
                  fontSize: '0.78rem',
                  fontWeight: kdsDestination === d.id ? 800 : 500,
                  background: kdsDestination === d.id ? 'var(--accent-amber)' : 'var(--bg)',
                  color: kdsDestination === d.id ? '#fff' : 'var(--text-secondary)'
                }}
              >
                {d.label}
              </button>
            ))}
          </div>

          {filteredKdsItems.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>👨‍🍳</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>Cocina al día — Sin comandas pendientes</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Las nuevas órdenes enviadas desde las mesas aparecerán aquí en tiempo real para preparación.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {filteredKdsItems.map(item => {
                const isPending = item.status === 'pending'
                const isCooking = item.status === 'cooking'
                const isReady = item.status === 'ready'

                return (
                  <div
                    key={item.id}
                    className="neu-card"
                    style={{
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      borderLeft: `5px solid ${isPending ? 'var(--accent-coral)' : isCooking ? 'var(--accent-amber)' : 'var(--accent-green)'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{
                          padding: '2px 7px',
                          borderRadius: 5,
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          background: 'var(--bg-deep)',
                          color: 'var(--accent-blue)'
                        }}>
                          {(item as any).restaurant_orders?.table_number || 'Mesa'}
                        </span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
                          Mesero: {(item as any).restaurant_orders?.waiter_name || 'Salón'}
                        </div>
                      </div>

                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        background: isPending ? 'rgba(220, 38, 38, 0.12)' : isCooking ? 'rgba(217, 119, 6, 0.12)' : 'rgba(22, 163, 74, 0.12)',
                        color: isPending ? 'var(--accent-coral)' : isCooking ? 'var(--accent-amber)' : 'var(--accent-green)'
                      }}>
                        {isPending ? '⏱️ En Cola' : isCooking ? '🔥 En Fuego' : '🔔 Listo'}
                      </span>
                    </div>

                    {/* Dish Name & Notes */}
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                      {item.quantity}x {item.product_name}
                    </div>

                    {item.notes && (
                      <div style={{ background: 'rgba(220, 38, 38, 0.06)', border: '1px dashed var(--accent-coral)', padding: '6px 10px', borderRadius: 6, fontSize: '0.75rem', color: 'var(--accent-coral)', fontWeight: 700 }}>
                        ⚠️ Nota: {item.notes}
                      </div>
                    )}

                    {/* KDS State Transitions */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      {isPending && (
                        <button
                          onClick={() => handleUpdateKdsStatus(item.id, 'cooking')}
                          className="btn-neu btn-primary"
                          style={{ width: '100%', padding: '8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                          <Flame size={14} />
                          <span>Iniciar Preparación</span>
                        </button>
                      )}

                      {isCooking && (
                        <button
                          onClick={() => handleUpdateKdsStatus(item.id, 'ready')}
                          className="btn-neu"
                          style={{ width: '100%', padding: '8px', fontSize: '0.78rem', background: 'var(--accent-green)', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                          <Bell size={14} />
                          <span>Marcar Plato Listo 🔔</span>
                        </button>
                      )}

                      {isReady && (
                        <button
                          onClick={() => handleUpdateKdsStatus(item.id, 'served')}
                          className="btn-neu btn-ghost"
                          style={{ width: '100%', padding: '8px', fontSize: '0.78rem', color: 'var(--accent-green)', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                          <CheckCircle2 size={14} />
                          <span>Servido a Mesa ✓</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: RECETAS & ESCANDALLO ── */}
      {activeTab === 'recipes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {recipes.length === 0 ? (
            <div className="neu-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📖</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No hay recetas registradas</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Registra recetas para calcular el costo por porción, margen de ganancia y deducción de insumos de bodega.
              </p>
              <button onClick={() => setShowRecipeModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 20px', fontSize: '0.82rem' }}>
                + Crear primera receta
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
              {recipes.map(r => {
                const profit = Number(r.dish_price) - Number(r.portion_cost)
                const marginPercent = r.dish_price > 0 ? Math.round((profit / r.dish_price) * 100) : 0

                return (
                  <div key={r.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{r.dish_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Costo porción: {formatCurrency(Number(r.portion_cost))}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--accent-blue)' }}>
                          {formatCurrency(Number(r.dish_price))}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--accent-green)', fontWeight: 700 }}>
                          Margen: {marginPercent}% (+{formatCurrency(profit)})
                        </div>
                      </div>
                    </div>

                    {/* Ingredients breakdown */}
                    <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8 }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Ingredientes / Escandallo:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {(r.ingredients_json || []).map((it, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem' }}>
                            <span>• {it.ingredient} ({it.quantity})</span>
                            <span style={{ color: 'var(--text-muted)' }}>{formatCurrency(Number(it.cost))}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {r.preparation_notes && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        "{r.preparation_notes}"
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: ABRIR MESA ── */}
      {showOpenTableModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 440, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                🍽️ Abrir {showOpenTableModal.table_number}
              </h2>
              <button onClick={() => setShowOpenTableModal(null)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleOpenTable} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Mesero Asignado</label>
                <input
                  type="text"
                  className="input-neu"
                  value={openTableForm.waiter_name}
                  onChange={e => setOpenTableForm(f => ({ ...f, waiter_name: e.target.value }))}
                  required
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Número de Comensales</label>
                <input
                  type="number"
                  className="input-neu"
                  value={openTableForm.guest_count}
                  onChange={e => setOpenTableForm(f => ({ ...f, guest_count: Number(e.target.value) }))}
                  min={1}
                  required
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" onClick={() => setShowOpenTableModal(null)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Abriendo...' : 'Confirmar Apertura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: AGREGAR PLATO A COMANDA ── */}
      {showOrderModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  📝 Comanda — {showOrderModal.table_number}
                </h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Orden #{showOrderModal.active_order?.order_number} • Total: {formatCurrency(Number(showOrderModal.active_order?.total || 0))}
                </div>
              </div>
              <button onClick={() => setShowOrderModal(null)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            {/* List of current items in this table */}
            <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, maxHeight: '180px', overflowY: 'auto' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 4 }}>Platos actualmente pedidos en mesa:</div>
              {(showOrderModal.active_order?.items || []).length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sin platos aún. Agrega el primero abajo.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(showOrderModal.active_order?.items || []).map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span><strong>{it.quantity}x</strong> {it.product_name} {it.notes ? `(${it.notes})` : ''}</span>
                      <span style={{ fontWeight: 700 }}>{formatCurrency(Number(it.total_price))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form to add item */}
            <form onSubmit={handleAddItemToOrder} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Plato / Bebida *</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Ej: Hamburguesa Angus"
                    value={newOrderItemForm.product_name}
                    onChange={e => setNewOrderItemForm(f => ({ ...f, product_name: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Cant</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={newOrderItemForm.quantity}
                    onChange={e => setNewOrderItemForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                    min={1}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Precio ($)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={newOrderItemForm.unit_price}
                    onChange={e => setNewOrderItemForm(f => ({ ...f, unit_price: Number(e.target.value) }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Destino Despacho</label>
                  <select
                    className="input-neu"
                    value={newOrderItemForm.destination}
                    onChange={e => setNewOrderItemForm(f => ({ ...f, destination: e.target.value as any }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    <option value="kitchen">Cocina Caliente</option>
                    <option value="grill">Parrilla / Asados</option>
                    <option value="bar">Barra / Bebidas</option>
                    <option value="dessert">Postres</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Nota de Cocina (Modificadores)</label>
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Sin cebolla, término 3/4..."
                    value={newOrderItemForm.notes}
                    onChange={e => setNewOrderItemForm(f => ({ ...f, notes: e.target.value }))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
                <button type="button" onClick={() => setShowOrderModal(null)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cerrar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Flame size={14} />
                  <span>{submitting ? 'Enviando...' : 'Marchar a Cocina'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: COBRO, PRECUENTA & SPLIT BILL ── */}
      {showBillingModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                💳 Cobro & Cierre — {showBillingModal.table_number}
              </h2>
              <button onClick={() => setShowBillingModal(null)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <div style={{ background: 'var(--bg-deep)', padding: 12, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span>Subtotal Consumos:</span>
                <strong>{formatCurrency(Number(showBillingModal.active_order?.subtotal || 0))}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--accent-green)' }}>
                <span>Propina Voluntaria (10%):</span>
                <strong>+{formatCurrency(Number(showBillingModal.active_order?.tip_amount || 0))}</strong>
              </div>
              <div className="divider" style={{ margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 900, color: 'var(--accent-blue)' }}>
                <span>Total a Cobrar:</span>
                <span>{formatCurrency(Number(showBillingModal.active_order?.total || 0))}</span>
              </div>
            </div>

            {/* Split Bill Calculator */}
            <div className="neu-card" style={{ padding: 12, background: 'var(--bg)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                ➗ División de Cuenta Equitativa (*Split Bill*)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Dividir entre:</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={splitCount}
                    onChange={e => setSplitCount(Math.max(1, Number(e.target.value)))}
                    min={1}
                    max={20}
                    style={{ width: 60, padding: '4px 6px', fontSize: '0.8rem' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>personas</span>
                </div>
                <div style={{ textAlign: 'right', fontWeight: 900, color: 'var(--accent-coral)', fontSize: '0.95rem' }}>
                  {formatCurrency(Math.round(Number(showBillingModal.active_order?.total || 0) / splitCount))} / persona
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
              <button type="button" onClick={() => setShowBillingModal(null)} className="btn-neu btn-ghost" style={{ padding: '9px 16px' }}>Cancelar</button>
              <button
                type="button"
                onClick={() => handleCloseAndFreeTable(showBillingModal)}
                className="btn-neu btn-primary"
                style={{ padding: '9px 24px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <CheckCircle2 size={15} />
                <span>Cobro Exitoso & Liberar Mesa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: NUEVA MESA ── */}
      {showNewTableModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 420, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                🍽️ Crear Nueva Mesa
              </h2>
              <button onClick={() => setShowNewTableModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateNewTable} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Identificador / Número *</label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Ej: Mesa 8 o Terraza 3"
                  value={newTableForm.table_number}
                  onChange={e => setNewTableForm(f => ({ ...f, table_number: e.target.value }))}
                  required
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Salón / Zona</label>
                <select
                  className="input-neu"
                  value={newTableForm.zone_name}
                  onChange={e => setNewTableForm(f => ({ ...f, zone_name: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                >
                  <option value="Salón Principal">Salón Principal</option>
                  <option value="Terraza al Aire Libre">Terraza al Aire Libre</option>
                  <option value="Barra Coctelera">Barra Coctelera</option>
                  <option value="Zona VIP">Zona VIP</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Capacidad (Comensales)</label>
                <input
                  type="number"
                  className="input-neu"
                  value={newTableForm.capacity}
                  onChange={e => setNewTableForm(f => ({ ...f, capacity: Number(e.target.value) }))}
                  min={1}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" onClick={() => setShowNewTableModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Guardando...' : 'Crear Mesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NUEVA RECETA / ESCANDALLO ── */}
      {showRecipeModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                📖 Nueva Receta & Escandallo de Insumos
              </h2>
              <button onClick={() => setShowRecipeModal(false)} className="btn-neu btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateRecipe} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nombre del Plato *</label>
                  <input
                    type="text"
                    className="input-neu"
                    value={recipeForm.dish_name}
                    onChange={e => setRecipeForm(f => ({ ...f, dish_name: e.target.value }))}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Precio Venta ($)</label>
                  <input
                    type="number"
                    className="input-neu"
                    value={recipeForm.dish_price}
                    onChange={e => setRecipeForm(f => ({ ...f, dish_price: Number(e.target.value) }))}
                    required
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              {/* Ingredients List */}
              <div style={{ background: 'var(--bg-deep)', padding: 12, borderRadius: 10 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Ingredientes y Costos:</div>
                {recipeForm.ingredients.map((it, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 6, marginBottom: 6 }}>
                    <input
                      type="text"
                      className="input-neu"
                      placeholder="Ingrediente..."
                      value={it.ingredient}
                      onChange={e => {
                        const next = [...recipeForm.ingredients]
                        next[idx].ingredient = e.target.value
                        setRecipeForm(f => ({ ...f, ingredients: next }))
                      }}
                      style={{ fontSize: '0.75rem', padding: '4px 6px' }}
                    />
                    <input
                      type="text"
                      className="input-neu"
                      placeholder="Cant..."
                      value={it.quantity}
                      onChange={e => {
                        const next = [...recipeForm.ingredients]
                        next[idx].quantity = e.target.value
                        setRecipeForm(f => ({ ...f, ingredients: next }))
                      }}
                      style={{ fontSize: '0.75rem', padding: '4px 6px' }}
                    />
                    <input
                      type="number"
                      className="input-neu"
                      placeholder="Costo"
                      value={it.cost}
                      onChange={e => {
                        const next = [...recipeForm.ingredients]
                        next[idx].cost = Number(e.target.value)
                        setRecipeForm(f => ({ ...f, ingredients: next }))
                      }}
                      style={{ fontSize: '0.75rem', padding: '4px 6px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setRecipeForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }))}
                      className="btn-neu btn-ghost"
                      style={{ padding: 4, color: 'var(--accent-coral)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setRecipeForm(f => ({ ...f, ingredients: [...f.ingredients, { ingredient: '', quantity: '1', cost: 1000 }] }))}
                  className="btn-neu btn-ghost"
                  style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', fontWeight: 700, padding: '4px 8px' }}
                >
                  + Agregar Ingrediente
                </button>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Notas de Preparación</label>
                <textarea
                  className="input-neu"
                  rows={2}
                  value={recipeForm.preparation_notes}
                  onChange={e => setRecipeForm(f => ({ ...f, preparation_notes: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.78rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" onClick={() => setShowRecipeModal(false)} className="btn-neu btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ padding: '8px 20px' }}>
                  {submitting ? 'Guardando...' : 'Guardar Receta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
