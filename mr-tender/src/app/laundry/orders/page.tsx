'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Shirt,
  Boxes,
  Plus,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  ChevronRight,
  Phone,
  Droplets,
  X
} from 'lucide-react'

interface LaundryOrder {
  id: string
  tenant_id: string
  ticket_number: string
  customer_name: string
  customer_phone?: string | null
  service_type: string
  weight_kg?: number | null
  garment_count: number
  rack_number?: string | null
  price: number
  status: 'received' | 'washing' | 'drying' | 'ironing' | 'ready' | 'delivered'
  promised_date: string
  created_at: string
}

export default function LaundryOrdersPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<LaundryOrder[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    service_type: 'Lavado y Secado por Kilo',
    weight_kg: 6.5,
    garment_count: 12,
    rack_number: 'P-12',
    price: 32500,
    promised_date: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  })

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('laundry_orders')
        .select('*')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      console.error('Error loading laundry orders:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const ticketNumber = 'LAV-' + Math.floor(1000 + Math.random() * 9000)
      const { error } = await supabase.from('laundry_orders').insert({
        tenant_id: tenantId,
        ticket_number: ticketNumber,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone || null,
        service_type: form.service_type,
        weight_kg: Number(form.weight_kg) || null,
        garment_count: Number(form.garment_count) || 1,
        rack_number: form.rack_number || null,
        price: Number(form.price) || 0,
        promised_date: form.promised_date,
        status: 'received'
      })

      if (error) throw error
      setShowModal(false)
      await loadOrders()
    } catch (err: any) {
      alert(err.message || 'Error al recibir prendas')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSeedDemoLaundry() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
      const demo = [
        {
          tenant_id: tenantId,
          ticket_number: 'LAV-4012',
          customer_name: 'Santiago Morales',
          customer_phone: '3128901234',
          service_type: 'Lavado en Seco (Traje Ejecutivo 2 Piezas)',
          weight_kg: 1.5,
          garment_count: 2,
          rack_number: 'P-04',
          price: 45000,
          status: 'ironing',
          promised_date: tomorrow
        },
        {
          tenant_id: tenantId,
          ticket_number: 'LAV-4013',
          customer_name: 'María Elena Cano',
          customer_phone: '3157890123',
          service_type: 'Lavado por Kilo + Suavizante',
          weight_kg: 8.0,
          garment_count: 18,
          rack_number: 'P-15',
          price: 40000,
          status: 'ready',
          promised_date: tomorrow
        }
      ]
      await supabase.from('laundry_orders').insert(demo)
      await loadOrders()
    } catch (err: any) {
      alert('Error demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredOrders = orders.filter(o =>
    !search ||
    o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    o.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
    (o.rack_number && o.rack_number.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Ventas & Mostrador</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>Recepción & Tickets</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shirt size={24} style={{ color: 'var(--accent-blue)' }} />
            Recepción de Prendas & Tickets de Lavandería
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Ingreso por kilos o prendas delicadas, tickets con código de barras y fechas de entrega prometida.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/laundry/rack"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-purple)' }}
          >
            <Boxes size={15} />
            <span>Planta & Percheros</span>
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Recibir Prendas</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', maxWidth: 420 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Buscar por cliente, ticket o perchero..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-neu"
          style={{ width: '100%', padding: '8px 12px 8px 36px', fontSize: '0.82rem' }}
        />
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 && !loading ? (
        <div className="neu-card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-blue-lt)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shirt size={28} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>No hay tickets de lavandería</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 440, margin: 0 }}>
            Genera tickets de recepción para controlar las prendas y evitar confusiones en percheros.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={handleSeedDemoLaundry} className="btn-neu btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>
              Cargar Tickets Demo
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filteredOrders.map(o => (
            <div key={o.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{o.customer_name}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Ticket: <strong>{o.ticket_number}</strong> • Perchero: {o.rack_number || 'S/A'}</div>
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 10,
                  background: o.status === 'ready' ? 'var(--accent-green-lt)' : 'var(--accent-blue-lt)',
                  color: o.status === 'ready' ? 'var(--accent-green)' : 'var(--accent-blue)'
                }}>
                  {o.status === 'ready' ? '¡Listo para Entrega!' : o.status === 'ironing' ? 'En Planchado' : 'En Proceso'}
                </span>
              </div>

              <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><strong>Servicio:</strong> {o.service_type}</div>
                <div><strong>Detalle:</strong> {o.garment_count} prendas {o.weight_kg ? `(${o.weight_kg} kg)` : ''}</div>
                <div><strong>Entrega Prometida:</strong> 📅 {formatDate(o.promised_date)}</div>
                <div style={{ color: 'var(--accent-blue)', fontWeight: 800 }}>Valor: {formatCurrency(o.price)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Recibir Prendas */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 460, width: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Recibir Prendas en Mostrador</h3>
              <button onClick={() => setShowModal(false)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Cliente</label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre completo"
                    value={form.customer_name}
                    onChange={e => setForm({ ...form, customer_name: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Teléfono</label>
                  <input
                    type="tel"
                    placeholder="WhatsApp"
                    value={form.customer_phone}
                    onChange={e => setForm({ ...form, customer_phone: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Tipo de Servicio</label>
                <select
                  value={form.service_type}
                  onChange={e => setForm({ ...form, service_type: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                >
                  <option value="Lavado y Secado por Kilo">Lavado y Secado por Kilo</option>
                  <option value="Lavado en Seco Traje / Vestido">Lavado en Seco Traje / Vestido</option>
                  <option value="Planchado Profesional a Vapor">Planchado Profesional a Vapor</option>
                  <option value="Lavado Edredón / Cobijas">Lavado Edredón / Cobijas</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.weight_kg}
                    onChange={e => setForm({ ...form, weight_kg: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 10px', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>N° Prendas</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.garment_count}
                    onChange={e => setForm({ ...form, garment_count: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 10px', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Perchero</label>
                  <input
                    type="text"
                    value={form.rack_number}
                    onChange={e => setForm({ ...form, rack_number: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 10px', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Precio Total (COP)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.price}
                    onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Fecha Prometida</label>
                  <input
                    type="date"
                    required
                    value={form.promised_date}
                    onChange={e => setForm({ ...form, promised_date: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-neu" style={{ flex: 1, padding: 9 }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 2, padding: 9 }}>
                  {submitting ? 'Generando...' : 'Generar Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
