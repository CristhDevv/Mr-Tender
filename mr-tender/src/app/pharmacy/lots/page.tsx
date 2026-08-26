'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import {
  Clock,
  Pill,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  ShieldAlert,
  X,
  Thermometer
} from 'lucide-react'

interface Lot {
  id: string
  tenant_id: string
  medicine_id: string
  lot_number: string
  expiration_date: string
  initial_quantity: number
  current_quantity: number
  status: string
  pharmacy_medicines?: {
    trade_name: string
    generic_name: string
    concentration: string
  }
}

interface Medicine {
  id: string
  trade_name: string
  generic_name: string
}

export default function PharmacyLotsPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lots, setLots] = useState<Lot[]>([])
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [showLotModal, setShowLotModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [lotForm, setLotForm] = useState({
    medicine_id: '',
    lot_number: '',
    expiration_date: '',
    initial_quantity: '50'
  })

  useEffect(() => {
    loadLots()
  }, [])

  async function loadLots() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const [lRes, mRes] = await Promise.all([
        supabase.from('pharmacy_lots').select('*, pharmacy_medicines(trade_name, generic_name, concentration)').eq('tenant_id', tid).order('expiration_date', { ascending: true }),
        supabase.from('pharmacy_medicines').select('id, trade_name, generic_name').eq('tenant_id', tid).order('trade_name', { ascending: true })
      ])

      setLots((lRes.data as any) || [])
      setMedicines(mRes.data || [])
    } catch (err) {
      console.error('Error loading lots:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateLot(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    if (!lotForm.medicine_id) return alert('Selecciona un medicamento')
    if (!lotForm.expiration_date) return alert('Selecciona fecha de vencimiento')

    setSubmitting(true)
    try {
      const qty = Number(lotForm.initial_quantity) || 1
      const { error } = await supabase.from('pharmacy_lots').insert({
        tenant_id: tenantId,
        medicine_id: lotForm.medicine_id,
        lot_number: lotForm.lot_number,
        expiration_date: lotForm.expiration_date,
        initial_quantity: qty,
        current_quantity: qty,
        status: 'active'
      })

      if (error) throw error
      setShowLotModal(false)
      setLotForm({
        medicine_id: '',
        lot_number: '',
        expiration_date: '',
        initial_quantity: '50'
      })
      await loadLots()
    } catch (err: any) {
      alert(err.message || 'Error al registrar lote')
    } finally {
      setSubmitting(false)
    }
  }

  function getExpirationStatus(expDate: string) {
    const today = new Date()
    const exp = new Date(expDate)
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
      return { label: 'VENCIDO', color: 'var(--accent-coral)', bg: 'var(--accent-coral-lt)', days: diffDays }
    } else if (diffDays <= 90) {
      return { label: `VENCE EN ${diffDays} DÍAS`, color: 'var(--accent-coral)', bg: 'var(--accent-coral-lt)', days: diffDays }
    } else if (diffDays <= 180) {
      return { label: `PRÓXIMO (${Math.floor(diffDays / 30)} meses)`, color: 'var(--accent-amber)', bg: 'var(--accent-amber-lt)', days: diffDays }
    } else {
      return { label: 'VIGENTE (ÓPTIMO)', color: 'var(--accent-green)', bg: 'var(--accent-green-lt)', days: diffDays }
    }
  }

  const expiredCount = lots.filter(l => getExpirationStatus(l.expiration_date).days <= 0).length
  const soonExpiringCount = lots.filter(l => {
    const st = getExpirationStatus(l.expiration_date)
    return st.days > 0 && st.days <= 180
  }).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Catálogo & Inventario</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>Control de Lotes & FEFO</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={24} style={{ color: 'var(--accent-amber)' }} />
            Control de Lotes & Despacho FEFO
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Método First Expired, First Out (Primero en Vencer, Primero en Salir) con semáforo preventivo de auditoría.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/pharmacy/medicines"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Pill size={15} />
            <span>Catálogo Medicamentos</span>
          </Link>
          <Link
            href="/pharmacy/temperature"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-green)' }}
          >
            <Thermometer size={15} />
            <span>Termohigrometría</span>
          </Link>
          <button
            onClick={() => setShowLotModal(true)}
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Registrar Lote</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="neu-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-green-lt)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Lotes Activos</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{lots.length}</div>
          </div>
        </div>

        <div className="neu-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-amber-lt)', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Vencen en &lt; 6 Meses</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-amber)' }}>{soonExpiringCount}</div>
          </div>
        </div>

        <div className="neu-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-coral-lt)', color: 'var(--accent-coral)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Lotes Vencidos (Bloqueados)</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-coral)' }}>{expiredCount}</div>
          </div>
        </div>
      </div>

      {/* Lots Table */}
      {lots.length === 0 && !loading ? (
        <div className="neu-card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-amber-lt)', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={28} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>No hay lotes registrados</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 440, margin: 0 }}>
            Registra los lotes de tus compras para aplicar el método FEFO y evitar mermas por vencimiento.
          </p>
          <button onClick={() => setShowLotModal(true)} className="btn-neu btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem', marginTop: 6 }}>
            <Plus size={15} /> Registrar Primer Lote
          </button>
        </div>
      ) : (
        <div className="neu-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Medicamento</th>
                  <th style={{ padding: '12px 14px' }}>Número de Lote</th>
                  <th style={{ padding: '12px 14px' }}>Fecha Vencimiento</th>
                  <th style={{ padding: '12px 14px' }}>Semáforo FEFO</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Stock Disponible</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Prioridad FEFO</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((l, idx) => {
                  const status = getExpirationStatus(l.expiration_date)
                  return (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                          {l.pharmacy_medicines?.trade_name || 'Medicamento'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {l.pharmacy_medicines?.generic_name} ({l.pharmacy_medicines?.concentration})
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                        {l.lot_number}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                        {formatDate(l.expiration_date)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 10,
                          background: status.bg,
                          color: status.color
                        }}>
                          {status.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-blue)' }}>
                        {l.current_quantity} unidades
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 6,
                          background: idx === 0 ? 'var(--accent-coral-lt)' : 'var(--bg-deep)',
                          color: idx === 0 ? 'var(--accent-coral)' : 'var(--text-muted)'
                        }}>
                          {idx === 0 ? '⚡ 1º en salir' : `#${idx + 1}`}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Registrar Lote */}
      {showLotModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 440, width: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Registrar Nuevo Lote</h3>
              <button onClick={() => setShowLotModal(false)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateLot} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Medicamento</label>
                <select
                  required
                  value={lotForm.medicine_id}
                  onChange={e => setLotForm({ ...lotForm, medicine_id: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                >
                  <option value="">-- Selecciona medicamento --</option>
                  {medicines.map(m => (
                    <option key={m.id} value={m.id}>{m.trade_name} ({m.generic_name})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Número de Lote (Grabado en caja/blíster)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: LOTE-2026-X89"
                  value={lotForm.lot_number}
                  onChange={e => setLotForm({ ...lotForm, lot_number: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Fecha de Vencimiento</label>
                <input
                  type="date"
                  required
                  value={lotForm.expiration_date}
                  onChange={e => setLotForm({ ...lotForm, expiration_date: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Cantidad Inicial de Unidades</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={lotForm.initial_quantity}
                  onChange={e => setLotForm({ ...lotForm, initial_quantity: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowLotModal(false)} className="btn-neu" style={{ flex: 1, padding: 9 }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 2, padding: 9 }}>
                  {submitting ? 'Registrando...' : 'Registrar Lote FEFO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
