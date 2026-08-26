'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils'
import {
  Flame,
  Clock,
  CheckCircle2,
  RefreshCw,
  Maximize2,
  Minimize2,
  UtensilsCrossed,
  ChefHat,
  Beer,
  Coffee,
  ChevronRight,
  ArrowLeft,
  Volume2
} from 'lucide-react'

interface KdsOrderItem {
  id: string
  order_id: string
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
  restaurant_orders?: {
    table_number: string
    waiter_name: string
    order_number: string
  }
}

export default function RestaurantKdsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [kdsItems, setKdsItems] = useState<KdsOrderItem[]>([])
  const [destinationFilter, setDestinationFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'active' | 'ready' | 'all'>('active')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  useEffect(() => {
    loadKdsItems()
    const interval = setInterval(() => {
      loadKdsItems(false)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  async function loadKdsItems(showLoader = true) {
    try {
      if (showLoader) setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('restaurant_order_items')
        .select('*, restaurant_orders(table_number, waiter_name, order_number)')
        .in('status', ['pending', 'cooking', 'ready'])
        .order('created_at', { ascending: true })

      if (error) throw error
      setKdsItems((data as any) || [])
    } catch (err) {
      console.error('Error loading KDS items:', err)
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  async function handleUpdateStatus(itemId: string, nextStatus: 'cooking' | 'ready' | 'served') {
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
      await loadKdsItems(false)
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  // Filter items
  const filteredItems = kdsItems.filter(item => {
    if (destinationFilter !== 'all' && item.destination !== destinationFilter) return false
    if (statusFilter === 'active' && item.status === 'ready') return false
    if (statusFilter === 'ready' && item.status !== 'ready') return false
    return true
  })

  // Calculate elapsed minutes
  function getElapsedMinutes(timestamp: string) {
    const diff = Date.now() - new Date(timestamp).getTime()
    return Math.floor(diff / 60000)
  }

  const pendingCount = kdsItems.filter(i => i.status === 'pending').length
  const cookingCount = kdsItems.filter(i => i.status === 'cooking').length
  const readyCount = kdsItems.filter(i => i.status === 'ready').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Operaciones & Planta</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>Comandera Cocina KDS</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Flame size={24} style={{ color: 'var(--accent-amber)' }} />
            Kitchen Display System (KDS)
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Pantalla operativa en tiempo real para cocineros, parrilla y barra.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/restaurant/tables"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <UtensilsCrossed size={15} />
            <span>Ver Mesas & Salón</span>
          </Link>
          <button
            onClick={toggleFullscreen}
            className="btn-neu"
            style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
            title="Pantalla Completa Cocina"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span>{isFullscreen ? 'Salir' : 'Pantalla Completa'}</span>
          </button>
          <button
            onClick={() => loadKdsItems(true)}
            className="btn-neu btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="neu-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid var(--accent-coral)' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Por Preparar</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-coral)' }}>{pendingCount}</div>
          </div>
          <Clock size={22} style={{ color: 'var(--accent-coral)', opacity: 0.8 }} />
        </div>

        <div className="neu-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid var(--accent-amber)' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>En Preparación</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-amber)' }}>{cookingCount}</div>
          </div>
          <Flame size={22} style={{ color: 'var(--accent-amber)', opacity: 0.8 }} />
        </div>

        <div className="neu-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid var(--accent-green)' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Listos para Servir</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-green)' }}>{readyCount}</div>
          </div>
          <CheckCircle2 size={22} style={{ color: 'var(--accent-green)', opacity: 0.8 }} />
        </div>
      </div>

      {/* Station Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Toda la Cocina', icon: ChefHat },
            { id: 'kitchen', label: 'Cocina Caliente', icon: Flame },
            { id: 'grill', label: 'Parrilla & Asados', icon: Flame },
            { id: 'bar', label: 'Barra & Bebidas', icon: Beer },
            { id: 'dessert', label: 'Postres & Café', icon: Coffee }
          ].map(st => {
            const Icon = st.icon
            const isSel = destinationFilter === st.id
            return (
              <button
                key={st.id}
                onClick={() => setDestinationFilter(st.id)}
                className={`btn-neu ${isSel ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Icon size={14} />
                <span>{st.label}</span>
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setStatusFilter('active')}
            className={`btn-neu ${statusFilter === 'active' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '5px 12px', fontSize: '0.74rem' }}
          >
            Pendientes
          </button>
          <button
            onClick={() => setStatusFilter('ready')}
            className={`btn-neu ${statusFilter === 'ready' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '5px 12px', fontSize: '0.74rem' }}
          >
            Listos
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`btn-neu ${statusFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '5px 12px', fontSize: '0.74rem' }}
          >
            Todos
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      {filteredItems.length === 0 ? (
        <div className="neu-card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-green-lt)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={30} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Cocina al Día</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
            No hay comandas pendientes para la estación seleccionada.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filteredItems.map(item => {
            const elapsedMin = getElapsedMinutes(item.sent_to_kitchen_at || item.created_at)
            const isLate = elapsedMin >= 15
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
                  borderLeft: `5px solid ${isReady ? 'var(--accent-green)' : isCooking ? 'var(--accent-amber)' : isLate ? 'var(--accent-coral)' : 'var(--accent-blue)'}`
                }}
              >
                {/* Header Ticket */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                      {item.restaurant_orders?.table_number || 'Mostrador'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Mesero: {item.restaurant_orders?.waiter_name || 'General'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: isLate ? 'var(--accent-coral)' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <Clock size={12} />
                      <span>{elapsedMin} min</span>
                    </div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                      {item.restaurant_orders?.order_number || ''}
                    </div>
                  </div>
                </div>

                <div className="divider" style={{ margin: '2px 0' }} />

                {/* Product Name & Quantity */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: 'var(--accent-blue-lt)',
                    color: 'var(--accent-blue)',
                    fontWeight: 800,
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {item.quantity}x
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {item.product_name}
                    </div>
                    {item.notes && (
                      <div style={{ fontSize: '0.76rem', color: 'var(--accent-coral)', fontWeight: 700, marginTop: 2 }}>
                        ⚠️ Nota: {item.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* State Transition Actions */}
                <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 6 }}>
                  {isPending && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'cooking')}
                      className="btn-neu"
                      style={{ width: '100%', padding: '8px 0', fontSize: '0.78rem', color: 'var(--accent-amber)', fontWeight: 700 }}
                    >
                      <Flame size={14} /> Comenzar a Cocinar
                    </button>
                  )}

                  {isCooking && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'ready')}
                      className="btn-neu btn-primary"
                      style={{ width: '100%', padding: '8px 0', fontSize: '0.78rem' }}
                    >
                      <CheckCircle2 size={14} /> ¡Marcar Listo!
                    </button>
                  )}

                  {isReady && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'served')}
                      className="btn-neu"
                      style={{ width: '100%', padding: '8px 0', fontSize: '0.78rem', color: 'var(--accent-green)', fontWeight: 700 }}
                    >
                      <CheckCircle2 size={14} /> Entregado / Servido
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
