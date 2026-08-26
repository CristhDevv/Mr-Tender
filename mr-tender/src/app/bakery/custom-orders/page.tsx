'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Sparkles,
  Cake,
  Plus,
  RefreshCw,
  Clock,
  Phone,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  X
} from 'lucide-react'

interface CustomOrder {
  id: string
  tenant_id: string
  customer_name: string
  customer_phone?: string | null
  delivery_date: string
  delivery_time: string
  cake_type: string
  portions: number
  decor_details: string
  total_price: number
  advance_payment: number
  status: 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled'
  created_at: string
}

export default function BakeryCustomOrdersPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<CustomOrder[]>([])
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [orderForm, setOrderForm] = useState({
    customer_name: '',
    customer_phone: '',
    delivery_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    delivery_time: '15:00',
    cake_type: 'Torta de Chocolate con Frutos Rojos',
    portions: 25,
    decor_details: 'Motivo Cumpleaños / Dedicatoria: Feliz Cumpleaños Sofía',
    total_price: 120000,
    advance_payment: 50000
  })

  useEffect(() => {
    loadCustomOrders()
  }, [])

  async function loadCustomOrders() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('bakery_custom_orders')
        .select('*')
        .eq('tenant_id', tid)
        .order('delivery_date', { ascending: true })

      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      console.error('Error loading custom orders:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('bakery_custom_orders').insert({
        tenant_id: tenantId,
        customer_name: orderForm.customer_name,
        customer_phone: orderForm.customer_phone || null,
        delivery_date: orderForm.delivery_date,
        delivery_time: orderForm.delivery_time,
        cake_type: orderForm.cake_type,
        portions: Number(orderForm.portions) || 10,
        decor_details: orderForm.decor_details,
        total_price: Number(orderForm.total_price) || 0,
        advance_payment: Number(orderForm.advance_payment) || 0,
        status: 'pending'
      })

      if (error) throw error
      setShowOrderModal(false)
      await loadCustomOrders()
    } catch (err: any) {
      alert(err.message || 'Error al registrar encargo')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdateStatus(orderId: string, status: 'in_progress' | 'ready' | 'delivered') {
    try {
      await supabase.from('bakery_custom_orders').update({ status }).eq('id', orderId)
      await loadCustomOrders()
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function handleSeedDemoCustomOrders() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
      const nextWeek = new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0]
      const demo = [
        {
          tenant_id: tenantId,
          customer_name: 'Marcela Gómez',
          customer_phone: '3124567890',
          delivery_date: tomorrow,
          delivery_time: '16:00',
          cake_type: 'Torta Tres Leches con Arequipe',
          portions: 30,
          decor_details: 'Foto comestible / 15 Años Laura',
          total_price: 150000,
          advance_payment: 80000,
          status: 'in_progress'
        },
        {
          tenant_id: tenantId,
          customer_name: 'Carlos Mendoza',
          customer_phone: '3209876543',
          delivery_date: nextWeek,
          delivery_time: '11:00',
          cake_type: 'Torta Red Velvet Premium',
          portions: 20,
          decor_details: 'Flores naturales y glaseado blanco',
          total_price: 130000,
          advance_payment: 50000,
          status: 'pending'
        }
      ]
      await supabase.from('bakery_custom_orders').insert(demo)
      await loadCustomOrders()
    } catch (err: any) {
      alert('Error demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Ventas & Mostrador</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>Encargos & Tortas</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={24} style={{ color: 'var(--accent-purple)' }} />
            Agenda de Encargos & Tortas Personalizadas
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Control de pedidos especiales para eventos, fechas de entrega, abonos y especificaciones de decoración.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowOrderModal(true)}
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Nuevo Encargo</span>
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      {orders.length === 0 && !loading ? (
        <div className="neu-card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-purple-lt)', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={28} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>No hay encargos agendados</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 440, margin: 0 }}>
            Registra los pedidos de tortas personalizadas para coordinar la producción con el pastelero.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={handleSeedDemoCustomOrders} className="btn-neu btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>
              Cargar Encargos Demo
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {orders.map(ord => {
            const pendingBalance = Number(ord.total_price || 0) - Number(ord.advance_payment || 0)
            const isPending = ord.status === 'pending'
            const isInProgress = ord.status === 'in_progress'
            const isReady = ord.status === 'ready'
            const isDelivered = ord.status === 'delivered'

            return (
              <div key={ord.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{ord.customer_name}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{ord.customer_phone || 'Sin teléfono'}</div>
                  </div>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: isDelivered ? 'var(--bg-deep)' : isReady ? 'var(--accent-green-lt)' : isInProgress ? 'var(--accent-purple-lt)' : 'var(--accent-amber-lt)',
                    color: isDelivered ? 'var(--text-muted)' : isReady ? 'var(--accent-green)' : isInProgress ? 'var(--accent-purple)' : 'var(--accent-amber)'
                  }}>
                    {isDelivered ? 'Entregado' : isReady ? 'Listo' : isInProgress ? 'En Decoración' : 'Pendiente'}
                  </span>
                </div>

                <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div><strong>Producto:</strong> {ord.cake_type} ({ord.portions} porciones)</div>
                  <div><strong>Entrega:</strong> 📅 {formatDate(ord.delivery_date)} a las {ord.delivery_time}</div>
                  {ord.decor_details && <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}><strong>Decoración:</strong> {ord.decor_details}</div>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Total Pedido</div>
                    <div style={{ fontWeight: 800, color: 'var(--accent-blue)' }}>{formatCurrency(ord.total_price)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Saldo Pendiente</div>
                    <div style={{ fontWeight: 800, color: pendingBalance > 0 ? 'var(--accent-coral)' : 'var(--accent-green)' }}>
                      {pendingBalance > 0 ? formatCurrency(pendingBalance) : 'PAGADO'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 6 }}>
                  {isPending && (
                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'in_progress')}
                      className="btn-neu"
                      style={{ width: '100%', padding: '7px 0', fontSize: '0.76rem', color: 'var(--accent-purple)', fontWeight: 700 }}
                    >
                      Comenzar Decoración
                    </button>
                  )}
                  {isInProgress && (
                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'ready')}
                      className="btn-neu btn-primary"
                      style={{ width: '100%', padding: '7px 0', fontSize: '0.76rem' }}
                    >
                      ¡Marcar Listo para Entrega!
                    </button>
                  )}
                  {isReady && (
                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'delivered')}
                      className="btn-neu"
                      style={{ width: '100%', padding: '7px 0', fontSize: '0.76rem', color: 'var(--accent-green)', fontWeight: 700 }}
                    >
                      Confirmar Entrega a Cliente
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Nuevo Encargo */}
      {showOrderModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 480, width: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Nuevo Encargo / Torta</h3>
              <button onClick={() => setShowOrderModal(false)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Cliente</label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre completo"
                    value={orderForm.customer_name}
                    onChange={e => setOrderForm({ ...orderForm, customer_name: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Teléfono</label>
                  <input
                    type="tel"
                    placeholder="WhatsApp"
                    value={orderForm.customer_phone}
                    onChange={e => setOrderForm({ ...orderForm, customer_phone: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Fecha de Entrega</label>
                  <input
                    type="date"
                    required
                    value={orderForm.delivery_date}
                    onChange={e => setOrderForm({ ...orderForm, delivery_date: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Hora</label>
                  <input
                    type="time"
                    required
                    value={orderForm.delivery_time}
                    onChange={e => setOrderForm({ ...orderForm, delivery_time: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Tipo de Torta / Sabor</label>
                  <input
                    type="text"
                    required
                    value={orderForm.cake_type}
                    onChange={e => setOrderForm({ ...orderForm, cake_type: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Porciones</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={orderForm.portions}
                    onChange={e => setOrderForm({ ...orderForm, portions: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Detalles de Decoración & Mensaje</label>
                <textarea
                  rows={2}
                  placeholder="Colores, temática, dedicatoria..."
                  value={orderForm.decor_details}
                  onChange={e => setOrderForm({ ...orderForm, decor_details: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Precio Total (COP)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={orderForm.total_price}
                    onChange={e => setOrderForm({ ...orderForm, total_price: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Abono Inicial (COP)</label>
                  <input
                    type="number"
                    min="0"
                    value={orderForm.advance_payment}
                    onChange={e => setOrderForm({ ...orderForm, advance_payment: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowOrderModal(false)} className="btn-neu" style={{ flex: 1, padding: 9 }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 2, padding: 9 }}>
                  {submitting ? 'Guardando...' : 'Agendar Encargo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
