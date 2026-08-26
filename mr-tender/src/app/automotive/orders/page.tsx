'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Car,
  Wrench,
  Search,
  Plus,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Phone,
  X
} from 'lucide-react'

interface WorkOrder {
  id: string
  tenant_id: string
  order_number: string
  vehicle_plate: string
  vehicle_brand: string
  vehicle_model: string
  mileage_km: number
  customer_name: string
  customer_phone?: string | null
  diagnostics: string
  labor_cost: number
  parts_cost: number
  total_cost: number
  status: 'received' | 'in_progress' | 'ready' | 'delivered'
  assigned_mechanic?: string | null
  created_at: string
}

export default function AutomotiveOrdersPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [search, setSearch] = useState('')
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [orderForm, setOrderForm] = useState({
    vehicle_plate: '',
    vehicle_brand: 'Chevrolet',
    vehicle_model: 'Onix 2022',
    mileage_km: 45000,
    customer_name: '',
    customer_phone: '',
    diagnostics: 'Mantenimiento preventivo 40.000 km, cambio de aceite y pastillas de freno.',
    labor_cost: 120000,
    parts_cost: 180000,
    assigned_mechanic: 'Javier Mecánico Líder'
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
        .from('automotive_orders')
        .select('*')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      console.error('Error loading automotive orders:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const orderNumber = 'OT-' + Math.floor(1000 + Math.random() * 9000)
      const labor = Number(orderForm.labor_cost) || 0
      const parts = Number(orderForm.parts_cost) || 0

      const { error } = await supabase.from('automotive_orders').insert({
        tenant_id: tenantId,
        order_number: orderNumber,
        vehicle_plate: orderForm.vehicle_plate.toUpperCase().trim(),
        vehicle_brand: orderForm.vehicle_brand,
        vehicle_model: orderForm.vehicle_model,
        mileage_km: Number(orderForm.mileage_km) || 0,
        customer_name: orderForm.customer_name,
        customer_phone: orderForm.customer_phone || null,
        diagnostics: orderForm.diagnostics,
        labor_cost: labor,
        parts_cost: parts,
        total_cost: labor + parts,
        status: 'received',
        assigned_mechanic: orderForm.assigned_mechanic || null
      })

      if (error) throw error
      setShowOrderModal(false)
      await loadOrders()
    } catch (err: any) {
      alert(err.message || 'Error al crear orden de trabajo')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdateStatus(orderId: string, status: 'in_progress' | 'ready' | 'delivered') {
    try {
      await supabase.from('automotive_orders').update({ status }).eq('id', orderId)
      await loadOrders()
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function handleSeedDemoOrders() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const demo = [
        {
          tenant_id: tenantId,
          order_number: 'OT-8821',
          vehicle_plate: 'QWE-123',
          vehicle_brand: 'Renault',
          vehicle_model: 'Duster 2021',
          mileage_km: 52000,
          customer_name: 'Guillermo Moreno',
          customer_phone: '3117894561',
          diagnostics: 'Cambio de kit de repartición, sincronización y alineación.',
          labor_cost: 250000,
          parts_cost: 450000,
          total_cost: 700000,
          status: 'in_progress',
          assigned_mechanic: 'Javier Mecánico Líder'
        },
        {
          tenant_id: tenantId,
          order_number: 'OT-8822',
          vehicle_plate: 'XYZ-789',
          vehicle_brand: 'Mazda',
          vehicle_model: 'Mazda 3 Skyactiv',
          mileage_km: 31000,
          customer_name: 'Andrea Beltrán',
          customer_phone: '3182345678',
          diagnostics: 'Revisión sistema de frenos ABS y cambio de líquido hidráulico.',
          labor_cost: 150000,
          parts_cost: 220000,
          total_cost: 370000,
          status: 'ready',
          assigned_mechanic: 'Andrés Frenos'
        }
      ]
      await supabase.from('automotive_orders').insert(demo)
      await loadOrders()
    } catch (err: any) {
      alert('Error demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredOrders = orders.filter(o =>
    !search ||
    o.vehicle_plate.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    o.order_number.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Ventas & Mostrador</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>Órdenes de Taller</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Car size={24} style={{ color: 'var(--accent-blue)' }} />
            Órdenes de Trabajo Mecánico por Placa
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Recepción vehicular, checklist de ingreso, diagnóstico, repuestos y liquidación de mano de obra.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/automotive/wash"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-blue)' }}
          >
            <Sparkles size={15} />
            <span>Cola de Autolavado</span>
          </Link>
          <button
            onClick={() => setShowOrderModal(true)}
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Nueva Orden (Placa)</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', maxWidth: 420 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Buscar por placa vehicular, cliente u orden..."
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
            <Wrench size={28} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>No hay órdenes de taller activas</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 440, margin: 0 }}>
            Registra el ingreso de un vehículo para comenzar el diagnóstico y control de repuestos.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={handleSeedDemoOrders} className="btn-neu btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>
              <Sparkles size={15} /> Cargar Órdenes Demo
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filteredOrders.map(o => {
            const isRec = o.status === 'received'
            const isProg = o.status === 'in_progress'
            const isReady = o.status === 'ready'
            const isDeliv = o.status === 'delivered'

            return (
              <div key={o.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 900, background: '#FEF08A', color: '#854D0E', padding: '2px 8px', borderRadius: 6, border: '1px solid #CA8A04' }}>
                        {o.vehicle_plate}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{o.vehicle_brand} {o.vehicle_model}</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Cliente: {o.customer_name} • {o.mileage_km.toLocaleString()} km
                    </div>
                  </div>

                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: isDeliv ? 'var(--bg-deep)' : isReady ? 'var(--accent-green-lt)' : isProg ? 'var(--accent-amber-lt)' : 'var(--accent-blue-lt)',
                    color: isDeliv ? 'var(--text-muted)' : isReady ? 'var(--accent-green)' : isProg ? 'var(--accent-amber)' : 'var(--accent-blue)'
                  }}>
                    {isDeliv ? 'Entregado' : isReady ? 'Listo para Entrega' : isProg ? 'En Taller / Reparación' : 'Recibido'}
                  </span>
                </div>

                <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.78rem' }}>
                  <strong>Diagnóstico & Trabajo:</strong>
                  <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{o.diagnostics}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Mecánico Asignado</div>
                    <div style={{ fontWeight: 600 }}>{o.assigned_mechanic || 'Sin asignar'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Total Presupuesto</div>
                    <div style={{ fontWeight: 800, color: 'var(--accent-blue)' }}>{formatCurrency(o.total_cost)}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 6 }}>
                  {isRec && (
                    <button
                      onClick={() => handleUpdateStatus(o.id, 'in_progress')}
                      className="btn-neu"
                      style={{ width: '100%', padding: '7px 0', fontSize: '0.76rem', color: 'var(--accent-amber)', fontWeight: 700 }}
                    >
                      <Wrench size={14} /> Comenzar Reparación
                    </button>
                  )}
                  {isProg && (
                    <button
                      onClick={() => handleUpdateStatus(o.id, 'ready')}
                      className="btn-neu btn-primary"
                      style={{ width: '100%', padding: '7px 0', fontSize: '0.76rem' }}
                    >
                      <CheckCircle2 size={14} /> ¡Vehículo Listo!
                    </button>
                  )}
                  {isReady && (
                    <button
                      onClick={() => handleUpdateStatus(o.id, 'delivered')}
                      className="btn-neu"
                      style={{ width: '100%', padding: '7px 0', fontSize: '0.76rem', color: 'var(--accent-green)', fontWeight: 700 }}
                    >
                      Facturar y Entregar Llaves
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Nueva Orden */}
      {showOrderModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 520, width: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Nueva Orden de Servicio por Placa</h3>
              <button onClick={() => setShowOrderModal(false)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Placa Vehicular</label>
                  <input
                    type="text"
                    required
                    placeholder="AAA-123"
                    value={orderForm.vehicle_plate}
                    onChange={e => setOrderForm({ ...orderForm, vehicle_plate: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Marca</label>
                  <input
                    type="text"
                    required
                    value={orderForm.vehicle_brand}
                    onChange={e => setOrderForm({ ...orderForm, vehicle_brand: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Modelo</label>
                  <input
                    type="text"
                    required
                    value={orderForm.vehicle_model}
                    onChange={e => setOrderForm({ ...orderForm, vehicle_model: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Propietario / Cliente</label>
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

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Kilometraje</label>
                  <input
                    type="number"
                    value={orderForm.mileage_km}
                    onChange={e => setOrderForm({ ...orderForm, mileage_km: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Diagnóstico Inicial & Motivo de Ingreso</label>
                <textarea
                  rows={2}
                  value={orderForm.diagnostics}
                  onChange={e => setOrderForm({ ...orderForm, diagnostics: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Mano de Obra (COP)</label>
                  <input
                    type="number"
                    value={orderForm.labor_cost}
                    onChange={e => setOrderForm({ ...orderForm, labor_cost: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Repuestos (COP)</label>
                  <input
                    type="number"
                    value={orderForm.parts_cost}
                    onChange={e => setOrderForm({ ...orderForm, parts_cost: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Mecánico Asignado</label>
                  <input
                    type="text"
                    value={orderForm.assigned_mechanic}
                    onChange={e => setOrderForm({ ...orderForm, assigned_mechanic: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowOrderModal(false)} className="btn-neu" style={{ flex: 1, padding: 9 }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 2, padding: 9 }}>
                  {submitting ? 'Creando...' : 'Crear Orden de Trabajo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
