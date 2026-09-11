'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import {
  Clock,
  Croissant,
  Flame,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Layers,
  ChefHat,
  X,
  Hash,
  Timer
} from 'lucide-react'

interface BakeryBatch {
  id: string
  tenant_id: string
  batch_number?: string | null
  recipe_name: string
  baker_name?: string | null
  units_produced: number
  units_wasted: number
  baking_time_minutes?: number | null
  baking_temp_celsius?: number | null
  status: 'baking' | 'ready' | 'yesterday_discount'
  notes?: string | null
  baked_at?: string | null
  created_at: string
}

export default function BakeryProductionPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [batches, setBatches] = useState<BakeryBatch[]>([])
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Current time in HH:mm format
  const getCurrentTime = () => {
    const now = new Date()
    return now.toTimeString().slice(0, 5)
  }

  const [batchForm, setBatchForm] = useState({
    batch_number: 'H-001',
    recipe_name: 'Pan Francés / Baguette Tradicional',
    baker_name: 'Maestro Panadero',
    exit_time: getCurrentTime(),
    units_produced: 40,
    units_wasted: 2,
    baking_temp_celsius: 210,
    baking_time_minutes: 25,
    status: 'ready' as 'baking' | 'ready' | 'yesterday_discount',
    notes: 'Tanda matutina horneada con vapor.'
  })

  useEffect(() => {
    loadBatches()
  }, [])

  async function loadBatches() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id || user.app_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('bakery_batches')
        .select('*')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false })

      if (error) throw error
      const list = data || []
      setBatches(list)

      // Set next auto batch number
      const count = list.length + 1
      const nextBatchNumber = `H-${String(count).padStart(3, '0')}`
      setBatchForm(prev => ({
        ...prev,
        batch_number: nextBatchNumber,
        exit_time: getCurrentTime()
      }))
    } catch (err) {
      console.error('Error loading bakery batches:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      // Build baked_at timestamp based on today and exit_time
      const today = new Date()
      if (batchForm.exit_time) {
        const [hours, mins] = batchForm.exit_time.split(':')
        today.setHours(parseInt(hours) || 0, parseInt(mins) || 0, 0, 0)
      }

      const { error } = await supabase.from('bakery_batches').insert({
        tenant_id: tenantId,
        batch_number: batchForm.batch_number || `H-${Date.now().toString().slice(-4)}`,
        recipe_name: batchForm.recipe_name,
        baker_name: batchForm.baker_name || null,
        units_produced: Number(batchForm.units_produced) || 1,
        units_wasted: Number(batchForm.units_wasted) || 0,
        baking_temp_celsius: Number(batchForm.baking_temp_celsius) || 200,
        baking_time_minutes: Number(batchForm.baking_time_minutes) || 20,
        baked_at: today.toISOString(),
        status: batchForm.status,
        notes: batchForm.notes || null
      })

      if (error) throw error
      setShowBatchModal(false)
      await loadBatches()
    } catch (err: any) {
      alert(err.message || 'Error al registrar horneada')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSeedDemoBatches() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const now = new Date()
      const time1 = new Date(now)
      time1.setHours(6, 0, 0, 0)
      const time2 = new Date(now)
      time2.setHours(8, 30, 0, 0)
      const time3 = new Date(now)
      time3.setHours(10, 15, 0, 0)

      const demo = [
        {
          tenant_id: tenantId,
          batch_number: 'H-001',
          recipe_name: 'Pan Francés / Baguette Tradicional',
          baker_name: 'Carlos Ruiz',
          units_produced: 60,
          units_wasted: 2,
          baking_temp_celsius: 210,
          baking_time_minutes: 25,
          baked_at: time1.toISOString(),
          status: 'ready',
          notes: 'Tanda matutina - Excelente dorado y corteza crujiente.'
        },
        {
          tenant_id: tenantId,
          batch_number: 'H-002',
          recipe_name: 'Croissant de Mantequilla',
          baker_name: 'Carlos Ruiz',
          units_produced: 30,
          units_wasted: 1,
          baking_temp_celsius: 190,
          baking_time_minutes: 18,
          baked_at: time2.toISOString(),
          status: 'ready',
          notes: 'Tanda media mañana - Hojaldrado perfecto.'
        },
        {
          tenant_id: tenantId,
          batch_number: 'H-003',
          recipe_name: 'Pan de Bono Valluno',
          baker_name: 'Andrea Gómez',
          units_produced: 50,
          units_wasted: 0,
          baking_temp_celsius: 220,
          baking_time_minutes: 15,
          baked_at: time3.toISOString(),
          status: 'baking',
          notes: 'En horno actualmente para la tanda de la tarde.'
        }
      ]
      await supabase.from('bakery_batches').insert(demo)
      await loadBatches()
    } catch (err: any) {
      alert('Error demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const totalProducedToday = batches.reduce((acc, b) => acc + Number(b.units_produced || 0), 0)
  const totalWastedToday = batches.reduce((acc, b) => acc + Number(b.units_wasted || 0), 0)
  const wasteRate = totalProducedToday > 0 ? (totalWastedToday / totalProducedToday) * 100 : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Operaciones & Panadería</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>Horneadas del Día</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Flame size={24} style={{ color: 'var(--accent-amber)' }} />
            Control de Horneadas & Producción Diaria
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Registro de tandas de horneado, número de horneada, hora de salida, control de temperatura y desperdicios.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Link
            href="/bakery/baker"
            className="btn-neu"
            style={{
              padding: '8px 14px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 800,
              background: '#FEF3C7',
              color: '#B45309',
              border: '1px solid #FDE68A'
            }}
          >
            <ChefHat size={15} strokeWidth={2.5} />
            <span>Vista Móvil Panadero</span>
          </Link>

          <button
            onClick={() => {
              const nextNum = `H-${String(batches.length + 1).padStart(3, '0')}`
              setBatchForm(prev => ({
                ...prev,
                batch_number: nextNum,
                exit_time: getCurrentTime()
              }))
              setShowBatchModal(true)
            }}
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Nueva Horneada</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="neu-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F0EDFC', color: '#714AD9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Croissant size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Unidades Horneadas</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A' }}>{totalProducedToday} unds</div>
          </div>
        </div>

        <div className="neu-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Desperdicio / Quemados</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#DC2626' }}>{totalWastedToday} unds</div>
          </div>
        </div>

        <div className="neu-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Eficiencia de Producción</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#059669' }}>
              {(100 - wasteRate).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Batches Table */}
      {batches.length === 0 && !loading ? (
        <div className="neu-card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F0EDFC', color: '#714AD9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Flame size={28} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>No hay horneadas registradas hoy</h3>
          <p style={{ fontSize: '0.84rem', color: '#64748B', maxWidth: 440, margin: 0 }}>
            Registra las tandas de horneado con su número y hora de salida para cargar stock fresco al punto de venta.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={handleSeedDemoBatches} className="btn-neu btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem', fontWeight: 800 }}>
              <Sparkles size={15} /> Cargar Horneadas Demo
            </button>
          </div>
        </div>
      ) : (
        <div className="neu-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>N° Horneada</th>
                  <th style={{ padding: '12px 14px' }}>Producto / Receta</th>
                  <th style={{ padding: '12px 14px' }}>Hora de Salida</th>
                  <th style={{ padding: '12px 14px' }}>Panadero</th>
                  <th style={{ padding: '12px 14px' }}>Parámetros Horno</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Unidades Listas</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Dañados</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b, idx) => {
                  const exitDate = b.baked_at ? new Date(b.baked_at) : new Date(b.created_at)
                  const timeStr = exitDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })

                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          background: '#E6F7F5',
                          color: '#008F7E',
                          border: '1px solid #99F6E4',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <Hash size={12} />
                          {b.batch_number || `H-${String(batches.length - idx).padStart(3, '0')}`}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>{b.recipe_name}</div>
                        {b.notes && <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{b.notes}</div>}
                      </td>

                      <td style={{ padding: '12px 14px', color: '#0F172A', fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Clock size={14} style={{ color: '#714AD9' }} />
                          <span>{timeStr}</span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px', color: '#64748B', fontWeight: 600 }}>
                        {b.baker_name || 'Panadero de turno'}
                      </td>

                      <td style={{ padding: '12px 14px', color: '#475569' }}>
                        <span style={{ fontWeight: 600 }}>{b.baking_temp_celsius || 200}°C</span> • {b.baking_time_minutes || 20} min
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                        {b.units_produced} unds
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: b.units_wasted > 0 ? '#DC2626' : '#94A3B8' }}>
                        {b.units_wasted} unds
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: 10,
                          background: b.status === 'ready' ? '#ECFDF5' : b.status === 'baking' ? '#F0EDFC' : '#F1F5F9',
                          color: b.status === 'ready' ? '#059669' : b.status === 'baking' ? '#714AD9' : '#64748B',
                          border: b.status === 'ready' ? '1px solid #A7F3D0' : b.status === 'baking' ? '1px solid #FDE68A' : '1px solid #CBD5E1'
                        }}>
                          {b.status === 'ready' ? ' Listo / En Vitrina' : b.status === 'baking' ? ' En Horno' : 'Pan de Ayer'}
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

      {/* Modal: Registrar Horneada */}
      {showBatchModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, overflowY: 'auto' }}>
          <div className="neu-card animate-scale-in" style={{ maxWidth: 500, width: '100%', maxHeight: 'calc(100dvh - 24px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, borderRadius: 16 }}>
            {/* Fixed Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', padding: '14px 18px', background: '#FFFFFF', flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                  Registrar Tanda de Horneado
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#64748B' }}>
                  Ingresa los datos de salida del horno para actualizar existencias en vitrina
                </p>
              </div>
              <button onClick={() => setShowBatchModal(false)} className="btn-neu btn-ghost" style={{ width: 30, height: 30, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateBatch} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                
                {/* Row: Número de Horneada & Hora de Salida del Horno */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Hash size={13} color="#008F7E" />
                      <span>Número de Horneada *</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: H-001"
                      value={batchForm.batch_number}
                      onChange={e => setBatchForm({ ...batchForm, batch_number: e.target.value })}
                      className="input-neu"
                      style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.88rem', fontWeight: 800, color: '#008F7E' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} color="#714AD9" />
                      <span>Hora de Salida *</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={batchForm.exit_time}
                      onChange={e => setBatchForm({ ...batchForm, exit_time: e.target.value })}
                      className="input-neu"
                      style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.88rem', fontWeight: 800 }}
                    />
                  </div>
                </div>

                {/* Producto / Receta */}
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>
                    Producto / Receta Horneada *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Pan Francés, Croissant, Almojábanas..."
                    value={batchForm.recipe_name}
                    onChange={e => setBatchForm({ ...batchForm, recipe_name: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                {/* Panadero Responsable & Estado */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>
                      Panadero Responsable
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Carlos Ruiz"
                      value={batchForm.baker_name}
                      onChange={e => setBatchForm({ ...batchForm, baker_name: e.target.value })}
                      className="input-neu"
                      style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>
                      Estado de la Horneada
                    </label>
                    <select
                      value={batchForm.status}
                      onChange={e => setBatchForm({ ...batchForm, status: e.target.value as any })}
                      className="input-neu"
                      style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem', background: '#FFFFFF' }}
                    >
                      <option value="ready"> Listo / Salido del Horno</option>
                      <option value="baking"> En Horno Actualmente</option>
                    </select>
                  </div>
                </div>

                {/* Unidades Listas & Dañados */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>
                      Unidades Listas / Buenas *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={batchForm.units_produced}
                      onChange={e => setBatchForm({ ...batchForm, units_produced: Number(e.target.value) })}
                      className="input-neu"
                      style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.95rem', fontWeight: 800, color: '#059669' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>
                      Panes Dañados / Quemados
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={batchForm.units_wasted}
                      onChange={e => setBatchForm({ ...batchForm, units_wasted: Number(e.target.value) })}
                      className="input-neu"
                      style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.95rem', fontWeight: 800, color: '#DC2626' }}
                    />
                  </div>
                </div>

                {/* Parámetros Horno */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>Temperatura Horno (°C)</label>
                    <input
                      type="number"
                      value={batchForm.baking_temp_celsius}
                      onChange={e => setBatchForm({ ...batchForm, baking_temp_celsius: Number(e.target.value) })}
                      className="input-neu"
                      style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>Tiempo Horneo (min)</label>
                    <input
                      type="number"
                      value={batchForm.baking_time_minutes}
                      onChange={e => setBatchForm({ ...batchForm, baking_time_minutes: Number(e.target.value) })}
                      className="input-neu"
                      style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                    />
                  </div>
                </div>

                {/* Notas */}
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>Notas de Panadero</label>
                  <input
                    type="text"
                    placeholder="Ej: Tanda matutina con masa madre..."
                    value={batchForm.notes}
                    onChange={e => setBatchForm({ ...batchForm, notes: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              {/* Fixed Action Footer */}
              <div style={{ display: 'flex', gap: 8, padding: '12px 18px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC', flexShrink: 0 }}>
                <button type="button" onClick={() => setShowBatchModal(false)} className="btn-neu" style={{ flex: 1, padding: 10 }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 2, padding: 10, fontWeight: 800 }}>
                  {submitting ? 'Guardando...' : 'Guardar e Ingresar a Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
