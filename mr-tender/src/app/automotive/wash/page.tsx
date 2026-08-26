'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import {
  Sparkles,
  Car,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  ChevronRight,
  Phone,
  Droplets,
  X
} from 'lucide-react'

interface WashVehicle {
  id: string
  tenant_id: string
  vehicle_plate: string
  vehicle_type: string
  wash_type: string
  price: number
  customer_phone?: string | null
  status: 'waiting' | 'washing' | 'drying' | 'ready' | 'delivered'
  bay_number?: string | null
  created_at: string
}

export default function AutomotiveWashPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [vehicles, setVehicles] = useState<WashVehicle[]>([])
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [washForm, setWashForm] = useState({
    vehicle_plate: '',
    vehicle_type: 'Automóvil / Sedán',
    wash_type: 'Lavado General + Polichado + Aspirado',
    price: 35000,
    customer_phone: '',
    bay_number: 'Bahía 1'
  })

  useEffect(() => {
    loadWashVehicles()
  }, [])

  async function loadWashVehicles() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('automotive_wash_queue')
        .select('*')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false })

      if (error) throw error
      setVehicles(data || [])
    } catch (err) {
      console.error('Error loading wash queue:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateWash(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('automotive_wash_queue').insert({
        tenant_id: tenantId,
        vehicle_plate: washForm.vehicle_plate.toUpperCase().trim(),
        vehicle_type: washForm.vehicle_type,
        wash_type: washForm.wash_type,
        price: Number(washForm.price) || 0,
        customer_phone: washForm.customer_phone || null,
        bay_number: washForm.bay_number,
        status: 'waiting'
      })

      if (error) throw error
      setShowModal(false)
      await loadWashVehicles()
    } catch (err: any) {
      alert(err.message || 'Error al ingresar vehículo a lavado')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdateStatus(id: string, status: 'washing' | 'drying' | 'ready' | 'delivered') {
    try {
      await supabase.from('automotive_wash_queue').update({ status }).eq('id', id)
      await loadWashVehicles()
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function handleSeedDemoWash() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const demo = [
        {
          tenant_id: tenantId,
          vehicle_plate: 'KLU-456',
          vehicle_type: 'Camioneta SUV',
          wash_type: 'Lavado Premium + Encerado',
          price: 45000,
          customer_phone: '3109871234',
          bay_number: 'Bahía 1',
          status: 'washing'
        },
        {
          tenant_id: tenantId,
          vehicle_plate: 'TYU-789',
          vehicle_type: 'Automóvil',
          wash_type: 'Lavado Sencillo + Aspirado',
          price: 25000,
          customer_phone: '3156543210',
          bay_number: 'Bahía 2',
          status: 'drying'
        },
        {
          tenant_id: tenantId,
          vehicle_plate: 'MNB-123',
          vehicle_type: 'Motocicleta',
          wash_type: 'Lavado Motor + Desengrase',
          price: 18000,
          customer_phone: '3201112233',
          bay_number: 'Bahía Motos',
          status: 'ready'
        }
      ]
      await supabase.from('automotive_wash_queue').insert(demo)
      await loadWashVehicles()
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
            <span>Operaciones & Planta</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>Cola de Autolavado</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Droplets size={24} style={{ color: 'var(--accent-blue)' }} />
            Cola de Turnos de Autolavado & Despacho
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Monitoreo en vivo de bahías de lavado, enjabonado, secado y aviso de vehículo listo.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/automotive/orders"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Car size={15} />
            <span>Órdenes de Taller</span>
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Ingresar Vehículo</span>
          </button>
        </div>
      </div>

      {/* Wash Queue Grid */}
      {vehicles.length === 0 && !loading ? (
        <div className="neu-card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-blue-lt)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Droplets size={28} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>No hay vehículos en cola de lavado</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 440, margin: 0 }}>
            Ingresa vehículos para asignar bahías de lavado y controlar los tiempos de despacho.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={handleSeedDemoWash} className="btn-neu btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>
              Cargar Vehículos Demo
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {vehicles.map(v => {
            const isWait = v.status === 'waiting'
            const isWash = v.status === 'washing'
            const isDry = v.status === 'drying'
            const isReady = v.status === 'ready'
            const isDeliv = v.status === 'delivered'

            return (
              <div key={v.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, background: '#FEF08A', color: '#854D0E', padding: '2px 8px', borderRadius: 6, border: '1px solid #CA8A04' }}>
                      {v.vehicle_plate}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{v.bay_number || 'Bahía 1'}</span>
                  </div>

                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: isDeliv ? 'var(--bg-deep)' : isReady ? 'var(--accent-green-lt)' : isDry ? 'var(--accent-purple-lt)' : isWash ? 'var(--accent-blue-lt)' : 'var(--accent-amber-lt)',
                    color: isDeliv ? 'var(--text-muted)' : isReady ? 'var(--accent-green)' : isDry ? 'var(--accent-purple)' : isWash ? 'var(--accent-blue)' : 'var(--accent-amber)'
                  }}>
                    {isDeliv ? 'Entregado' : isReady ? '¡Listo para Entrega!' : isDry ? 'En Secado & Aspirado' : isWash ? 'En Lavado / Espuma' : 'En Espera'}
                  </span>
                </div>

                <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div><strong>Tipo:</strong> {v.vehicle_type}</div>
                  <div><strong>Servicio:</strong> {v.wash_type}</div>
                  <div style={{ color: 'var(--accent-blue)', fontWeight: 800 }}>Precio: {formatCurrency(v.price)}</div>
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 6 }}>
                  {isWait && (
                    <button
                      onClick={() => handleUpdateStatus(v.id, 'washing')}
                      className="btn-neu"
                      style={{ width: '100%', padding: '7px 0', fontSize: '0.76rem', color: 'var(--accent-blue)', fontWeight: 700 }}
                    >
                      Iniciar Lavado
                    </button>
                  )}
                  {isWash && (
                    <button
                      onClick={() => handleUpdateStatus(v.id, 'drying')}
                      className="btn-neu"
                      style={{ width: '100%', padding: '7px 0', fontSize: '0.76rem', color: 'var(--accent-purple)', fontWeight: 700 }}
                    >
                      Pasar a Secado
                    </button>
                  )}
                  {isDry && (
                    <button
                      onClick={() => handleUpdateStatus(v.id, 'ready')}
                      className="btn-neu btn-primary"
                      style={{ width: '100%', padding: '7px 0', fontSize: '0.76rem' }}
                    >
                      ¡Vehículo Impecable!
                    </button>
                  )}
                  {isReady && (
                    <button
                      onClick={() => handleUpdateStatus(v.id, 'delivered')}
                      className="btn-neu"
                      style={{ width: '100%', padding: '7px 0', fontSize: '0.76rem', color: 'var(--accent-green)', fontWeight: 700 }}
                    >
                      Cobrar y Entregar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Ingresar Vehículo */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 440, width: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Ingresar Vehículo a Lavado</h3>
              <button onClick={() => setShowModal(false)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateWash} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Placa Vehicular</label>
                <input
                  type="text"
                  required
                  placeholder="AAA-123"
                  value={washForm.vehicle_plate}
                  onChange={e => setWashForm({ ...washForm, vehicle_plate: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Tipo de Vehículo</label>
                  <select
                    value={washForm.vehicle_type}
                    onChange={e => setWashForm({ ...washForm, vehicle_type: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  >
                    <option value="Automóvil / Sedán">Automóvil / Sedán</option>
                    <option value="Camioneta SUV / 4x4">Camioneta SUV / 4x4</option>
                    <option value="Motocicleta">Motocicleta</option>
                    <option value="Furgón / Camión">Furgón / Camión</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Bahía Asignada</label>
                  <input
                    type="text"
                    value={washForm.bay_number}
                    onChange={e => setWashForm({ ...washForm, bay_number: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Tipo de Lavado / Paquete</label>
                <input
                  type="text"
                  required
                  value={washForm.wash_type}
                  onChange={e => setWashForm({ ...washForm, wash_type: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Teléfono Cliente (Aviso WhatsApp)</label>
                  <input
                    type="tel"
                    placeholder="310..."
                    value={washForm.customer_phone}
                    onChange={e => setWashForm({ ...washForm, customer_phone: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Precio (COP)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={washForm.price}
                    onChange={e => setWashForm({ ...washForm, price: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-neu" style={{ flex: 1, padding: 9 }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 2, padding: 9 }}>
                  {submitting ? 'Ingresando...' : 'Ingresar a Bahía'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
