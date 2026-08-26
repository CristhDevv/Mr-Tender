'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Wrench,
  FileText,
  Plus,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Phone,
  X
} from 'lucide-react'

interface ToolRental {
  id: string
  tenant_id: string
  tool_name: string
  serial_number?: string | null
  customer_name: string
  customer_phone?: string | null
  rental_start: string
  rental_end_expected: string
  daily_rate: number
  deposit_amount: number
  status: 'active' | 'returned' | 'overdue'
  created_at: string
}

export default function HardwareRentalsPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [rentals, setRentals] = useState<ToolRental[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    tool_name: 'Rotomartillo Demoledor DeWalt 1500W',
    serial_number: 'DW-88912',
    customer_name: '',
    customer_phone: '',
    rental_start: new Date().toISOString().split('T')[0],
    rental_end_expected: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    daily_rate: 65000,
    deposit_amount: 200000
  })

  useEffect(() => {
    loadRentals()
  }, [])

  async function loadRentals() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('hardware_rentals')
        .select('*')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRentals(data || [])
    } catch (err) {
      console.error('Error loading hardware rentals:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateRental(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('hardware_rentals').insert({
        tenant_id: tenantId,
        tool_name: form.tool_name,
        serial_number: form.serial_number || null,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone || null,
        rental_start: form.rental_start,
        rental_end_expected: form.rental_end_expected,
        daily_rate: Number(form.daily_rate) || 0,
        deposit_amount: Number(form.deposit_amount) || 0,
        status: 'active'
      })

      if (error) throw error
      setShowModal(false)
      await loadRentals()
    } catch (err: any) {
      alert(err.message || 'Error al registrar alquiler')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReturnRental(id: string) {
    try {
      await supabase.from('hardware_rentals').update({ status: 'returned' }).eq('id', id)
      await loadRentals()
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function handleSeedDemoRentals() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const nextWeek = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]
      const lastWeek = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]

      const demo = [
        {
          tenant_id: tenantId,
          tool_name: 'Allanadora de Concreto a Gasolina 36"',
          serial_number: 'ALL-2024-X1',
          customer_name: 'Ing. Mauricio Duarte',
          customer_phone: '3109871234',
          rental_start: today,
          rental_end_expected: nextWeek,
          daily_rate: 110000,
          deposit_amount: 500000,
          status: 'active'
        },
        {
          tenant_id: tenantId,
          tool_name: 'Andamio Tubular Certificado (Juego 4 Cuerpos)',
          serial_number: 'AND-08',
          customer_name: 'Pinturas & Acabados del Norte',
          customer_phone: '3156784321',
          rental_start: lastWeek,
          rental_end_expected: today,
          daily_rate: 35000,
          deposit_amount: 150000,
          status: 'active'
        }
      ]
      await supabase.from('hardware_rentals').insert(demo)
      await loadRentals()
    } catch (err: any) {
      alert('Error demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredRentals = rentals.filter(r =>
    !search ||
    r.tool_name.toLowerCase().includes(search.toLowerCase()) ||
    r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.serial_number && r.serial_number.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Operaciones & Planta</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>Alquiler de Herramientas</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Wrench size={24} style={{ color: 'var(--accent-amber)' }} />
            Alquiler de Herramientas, Andamios & Maquinaria
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Control de equipos en renta, depósito en garantía, cálculo de días y alertas de devolución vencida.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/hardware/quotes"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <FileText size={15} />
            <span>Cotizaciones A4</span>
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Alquilar Equipo</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', maxWidth: 420 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Buscar por equipo, cliente o serial..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-neu"
          style={{ width: '100%', padding: '8px 12px 8px 36px', fontSize: '0.82rem' }}
        />
      </div>

      {/* Rentals Grid */}
      {filteredRentals.length === 0 && !loading ? (
        <div className="neu-card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-amber-lt)', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wrench size={28} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>No hay herramientas en alquiler</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 440, margin: 0 }}>
            Registra préstamos y alquileres de andamios, rotomartillos o trompos para controlar garantías.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={handleSeedDemoRentals} className="btn-neu btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>
              Cargar Alquileres Demo
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filteredRentals.map(r => {
            const isRet = r.status === 'returned'
            const isOverdue = r.status === 'overdue' || (!isRet && new Date(r.rental_end_expected) < new Date())

            return (
              <div key={r.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{r.tool_name}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Serial: {r.serial_number || 'S/N'} • Cliente: {r.customer_name}</div>
                  </div>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: isRet ? 'var(--bg-deep)' : isOverdue ? 'var(--accent-coral-lt)' : 'var(--accent-green-lt)',
                    color: isRet ? 'var(--text-muted)' : isOverdue ? 'var(--accent-coral)' : 'var(--accent-green)'
                  }}>
                    {isRet ? 'Devuelto' : isOverdue ? 'Devolución Vencida' : 'En Renta Activa'}
                  </span>
                </div>

                <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div><strong>Tarifa Diaria:</strong> {formatCurrency(r.daily_rate)} / día</div>
                  <div><strong>Depósito en Garantía:</strong> 🛡️ {formatCurrency(r.deposit_amount)}</div>
                  <div><strong>Devolución Esperada:</strong> 📅 {formatDate(r.rental_end_expected)}</div>
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 6 }}>
                  {!isRet && (
                    <button
                      onClick={() => handleReturnRental(r.id)}
                      className="btn-neu btn-primary"
                      style={{ width: '100%', padding: '7px 0', fontSize: '0.78rem' }}
                    >
                      <ShieldCheck size={14} /> Recibir & Devolver Depósito
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Alquilar Equipo */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 480, width: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Registrar Alquiler de Herramienta</h3>
              <button onClick={() => setShowModal(false)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateRental} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Herramienta / Equipo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Rotomartillo, Andamio..."
                    value={form.tool_name}
                    onChange={e => setForm({ ...form, tool_name: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Serial / Placa</label>
                  <input
                    type="text"
                    placeholder="DW-1029"
                    value={form.serial_number}
                    onChange={e => setForm({ ...form, serial_number: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Cliente / Maestro</label>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Fecha Salida</label>
                  <input
                    type="date"
                    required
                    value={form.rental_start}
                    onChange={e => setForm({ ...form, rental_start: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Fecha Devolución</label>
                  <input
                    type="date"
                    required
                    value={form.rental_end_expected}
                    onChange={e => setForm({ ...form, rental_end_expected: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Tarifa Diaria (COP)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.daily_rate}
                    onChange={e => setForm({ ...form, daily_rate: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Depósito Garantía (COP)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.deposit_amount}
                    onChange={e => setForm({ ...form, deposit_amount: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-neu" style={{ flex: 1, padding: 9 }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 2, padding: 9 }}>
                  {submitting ? 'Registrando...' : 'Entregar Equipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
