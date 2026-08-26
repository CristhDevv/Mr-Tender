'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Calendar,
  Scissors,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  Phone,
  ChevronRight,
  Sparkles,
  Percent,
  X
} from 'lucide-react'

interface SalonAppointment {
  id: string
  tenant_id: string
  customer_name: string
  customer_phone?: string | null
  service_name: string
  stylist_name: string
  appointment_date: string
  appointment_time: string
  price: number
  status: 'scheduled' | 'in_service' | 'completed' | 'cancelled'
  created_at: string
}

export default function SalonAgendaPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [appointments, setAppointments] = useState<SalonAppointment[]>([])
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    service_name: 'Corte de Cabello & Barba Spa',
    stylist_name: 'Mateo Barbero',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '14:00',
    price: 45000
  })

  useEffect(() => {
    loadAppointments()
  }, [])

  async function loadAppointments() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('salon_appointments')
        .select('*')
        .eq('tenant_id', tid)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })

      if (error) throw error
      setAppointments(data || [])
    } catch (err) {
      console.error('Error loading salon appointments:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateAppointment(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('salon_appointments').insert({
        tenant_id: tenantId,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone || null,
        service_name: form.service_name,
        stylist_name: form.stylist_name,
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        price: Number(form.price) || 0,
        status: 'scheduled'
      })

      if (error) throw error
      setShowModal(false)
      await loadAppointments()
    } catch (err: any) {
      alert(err.message || 'Error al agendar cita')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdateStatus(id: string, status: 'in_service' | 'completed') {
    try {
      await supabase.from('salon_appointments').update({ status }).eq('id', id)
      await loadAppointments()
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function handleSeedDemoAppointments() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

      const demo = [
        {
          tenant_id: tenantId,
          customer_name: 'Daniela Restrepo',
          customer_phone: '3145678901',
          service_name: 'Balayage Rubio Cenizo + Hidratación',
          stylist_name: 'Paola Estilista Senior',
          appointment_date: today,
          appointment_time: '10:00',
          price: 280000,
          status: 'in_service'
        },
        {
          tenant_id: tenantId,
          customer_name: 'Felipe Vargas',
          customer_phone: '3109876543',
          service_name: 'Corte Fade & Perfilado de Barba',
          stylist_name: 'Mateo Barbero',
          appointment_date: today,
          appointment_time: '15:30',
          price: 45000,
          status: 'scheduled'
        },
        {
          tenant_id: tenantId,
          customer_name: 'Catalina Suárez',
          customer_phone: '3187654321',
          service_name: 'Manicure Ruso Semi-permanente',
          stylist_name: 'Yulieth Manicurista',
          appointment_date: tomorrow,
          appointment_time: '11:00',
          price: 65000,
          status: 'scheduled'
        }
      ]
      await supabase.from('salon_appointments').insert(demo)
      await loadAppointments()
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
            <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>Agenda de Citas</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={24} style={{ color: 'var(--accent-purple)' }} />
            Agenda de Citas & Turnos de Estética
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Control de citas por estilista, barbero o manicurista con recordatorios y estados de atención.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/salon/commissions"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-green)' }}
          >
            <Percent size={15} />
            <span>Liquidación de Comisiones</span>
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Agendar Cita</span>
          </button>
        </div>
      </div>

      {/* Appointments Grid */}
      {appointments.length === 0 && !loading ? (
        <div className="neu-card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-purple-lt)', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={28} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>No hay citas agendadas</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 440, margin: 0 }}>
            Organiza la agenda de tus estilistas y barberos para optimizar las estaciones de trabajo.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={handleSeedDemoAppointments} className="btn-neu btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>
              Cargar Citas Demo
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {appointments.map(app => {
            const isSched = app.status === 'scheduled'
            const isInServ = app.status === 'in_service'
            const isComp = app.status === 'completed'

            return (
              <div key={app.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{app.customer_name}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{app.customer_phone || 'Sin WhatsApp'}</div>
                  </div>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: isComp ? 'var(--bg-deep)' : isInServ ? 'var(--accent-green-lt)' : 'var(--accent-purple-lt)',
                    color: isComp ? 'var(--text-muted)' : isInServ ? 'var(--accent-green)' : 'var(--accent-purple)'
                  }}>
                    {isComp ? 'Completada' : isInServ ? 'En Atención' : 'Agendada'}
                  </span>
                </div>

                <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div><strong>Servicio:</strong> {app.service_name}</div>
                  <div><strong>Profesional:</strong> {app.stylist_name}</div>
                  <div><strong>Fecha & Hora:</strong> 📅 {formatDate(app.appointment_date)} a las {app.appointment_time}</div>
                  <div style={{ color: 'var(--accent-blue)', fontWeight: 800 }}>Valor: {formatCurrency(app.price)}</div>
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 6 }}>
                  {isSched && (
                    <button
                      onClick={() => handleUpdateStatus(app.id, 'in_service')}
                      className="btn-neu"
                      style={{ width: '100%', padding: '7px 0', fontSize: '0.76rem', color: 'var(--accent-purple)', fontWeight: 700 }}
                    >
                      <Scissors size={14} /> Sentar en Estación
                    </button>
                  )}
                  {isInServ && (
                    <button
                      onClick={() => handleUpdateStatus(app.id, 'completed')}
                      className="btn-neu btn-primary"
                      style={{ width: '100%', padding: '7px 0', fontSize: '0.76rem' }}
                    >
                      <CheckCircle2 size={14} /> Finalizar & Cobrar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Agendar Cita */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 460, width: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Agendar Cita en Salón</h3>
              <button onClick={() => setShowModal(false)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateAppointment} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Servicio Solicitado</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Corte, Balayage, Manicure..."
                  value={form.service_name}
                  onChange={e => setForm({ ...form, service_name: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Estilista / Barbero</label>
                  <input
                    type="text"
                    required
                    value={form.stylist_name}
                    onChange={e => setForm({ ...form, stylist_name: e.target.value })}
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
                    value={form.price}
                    onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Fecha</label>
                  <input
                    type="date"
                    required
                    value={form.appointment_date}
                    onChange={e => setForm({ ...form, appointment_date: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Hora</label>
                  <input
                    type="time"
                    required
                    value={form.appointment_time}
                    onChange={e => setForm({ ...form, appointment_time: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-neu" style={{ flex: 1, padding: 9 }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 2, padding: 9 }}>
                  {submitting ? 'Agendando...' : 'Guardar Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
