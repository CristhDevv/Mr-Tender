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
  X
} from 'lucide-react'

interface BakeryBatch {
  id: string
  tenant_id: string
  recipe_name: string
  units_produced: number
  units_wasted: number
  baking_time_minutes: number
  baking_temp_celsius: number
  status: 'baking' | 'ready' | 'yesterday_discount'
  notes?: string | null
  created_at: string
}

export default function BakeryProductionPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [batches, setBatches] = useState<BakeryBatch[]>([])
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [batchForm, setBatchForm] = useState({
    recipe_name: 'Pan Francés / Baguette Tradicional',
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
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('bakery_batches')
        .select('*')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false })

      if (error) throw error
      setBatches(data || [])
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
      const { error } = await supabase.from('bakery_batches').insert({
        tenant_id: tenantId,
        recipe_name: batchForm.recipe_name,
        units_produced: Number(batchForm.units_produced) || 1,
        units_wasted: Number(batchForm.units_wasted) || 0,
        baking_temp_celsius: Number(batchForm.baking_temp_celsius) || 200,
        baking_time_minutes: Number(batchForm.baking_time_minutes) || 20,
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
      const demo = [
        {
          tenant_id: tenantId,
          recipe_name: 'Pan Francés / Baguette Tradicional',
          units_produced: 60,
          units_wasted: 2,
          baking_temp_celsius: 210,
          baking_time_minutes: 25,
          status: 'ready',
          notes: 'Tanda 1 (06:00 AM) - Excelente dorado y corteza crujiente.'
        },
        {
          tenant_id: tenantId,
          recipe_name: 'Croissant de Mantequilla',
          units_produced: 30,
          units_wasted: 1,
          baking_temp_celsius: 190,
          baking_time_minutes: 18,
          status: 'ready',
          notes: 'Tanda 2 (08:30 AM) - Laminado perfecto.'
        },
        {
          tenant_id: tenantId,
          recipe_name: 'Pan de Bono Valluno',
          units_produced: 50,
          units_wasted: 0,
          baking_temp_celsius: 220,
          baking_time_minutes: 15,
          status: 'baking',
          notes: 'Tanda 3 en horno actualmente.'
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
            <span>Operaciones & Planta</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>Horneadas & Mermas</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Flame size={24} style={{ color: 'var(--accent-amber)' }} />
            Control de Horneadas, Producción & Mermas
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Registro de tandas de horneado del día, control de temperatura, tiempos de cocción y mermas.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/bakery/recipes"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Croissant size={15} />
            <span>Fichas de Recetas</span>
          </Link>
          <Link
            href="/bakery/custom-orders"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-purple)' }}
          >
            <Sparkles size={15} />
            <span>Encargos & Tortas</span>
          </Link>
          <button
            onClick={() => setShowBatchModal(true)}
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Nueva Horneada</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="neu-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-amber-lt)', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Croissant size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Unidades Horneadas</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalProducedToday} unds</div>
          </div>
        </div>

        <div className="neu-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-coral-lt)', color: 'var(--accent-coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Mermas / Desperdicio</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-coral)' }}>{totalWastedToday} unds</div>
          </div>
        </div>

        <div className="neu-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-green-lt)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Eficiencia de Producción</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-green)' }}>
              {(100 - wasteRate).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Batches Table */}
      {batches.length === 0 && !loading ? (
        <div className="neu-card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-amber-lt)', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Flame size={28} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>No hay horneadas registradas hoy</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 440, margin: 0 }}>
            Registra las tandas de horneado para descontar harina/insumos y cargar stock fresco al POS.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={handleSeedDemoBatches} className="btn-neu btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>
              <Sparkles size={15} /> Cargar Horneadas Demo
            </button>
          </div>
        </div>
      ) : (
        <div className="neu-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Producto / Tanda</th>
                  <th style={{ padding: '12px 14px' }}>Hora de Registro</th>
                  <th style={{ padding: '12px 14px' }}>Parámetros Horno</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Unidades Listas</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Mermas</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {batches.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{b.recipe_name}</div>
                      {b.notes && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{b.notes}</div>}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                      {formatDateTime(b.created_at)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontWeight: 600 }}>{b.baking_temp_celsius}°C</span> • {b.baking_time_minutes} min
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-blue)' }}>
                      {b.units_produced} unds
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: b.units_wasted > 0 ? 'var(--accent-coral)' : 'var(--text-muted)' }}>
                      {b.units_wasted} unds
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: b.status === 'ready' ? 'var(--accent-green-lt)' : b.status === 'baking' ? 'var(--accent-amber-lt)' : 'var(--bg-deep)',
                        color: b.status === 'ready' ? 'var(--accent-green)' : b.status === 'baking' ? 'var(--accent-amber)' : 'var(--text-muted)'
                      }}>
                        {b.status === 'ready' ? '✓ Listo / En Vitrina' : b.status === 'baking' ? '🔥 En Horno' : 'Pan de Ayer'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Registrar Horneada */}
      {showBatchModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 460, width: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Registrar Tanda de Horneado</h3>
              <button onClick={() => setShowBatchModal(false)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateBatch} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Producto / Receta Horneada</label>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Unidades Listas</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={batchForm.units_produced}
                    onChange={e => setBatchForm({ ...batchForm, units_produced: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Mermas / Quemados</label>
                  <input
                    type="number"
                    min="0"
                    value={batchForm.units_wasted}
                    onChange={e => setBatchForm({ ...batchForm, units_wasted: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Temperatura Horno (°C)</label>
                  <input
                    type="number"
                    value={batchForm.baking_temp_celsius}
                    onChange={e => setBatchForm({ ...batchForm, baking_temp_celsius: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Tiempo Horneo (min)</label>
                  <input
                    type="number"
                    value={batchForm.baking_time_minutes}
                    onChange={e => setBatchForm({ ...batchForm, baking_time_minutes: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Notas de Panadero</label>
                <input
                  type="text"
                  placeholder="Ej: Tanda matutina con masa madre..."
                  value={batchForm.notes}
                  onChange={e => setBatchForm({ ...batchForm, notes: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowBatchModal(false)} className="btn-neu" style={{ flex: 1, padding: 9 }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 2, padding: 9 }}>
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
