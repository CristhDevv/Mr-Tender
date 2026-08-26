'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import {
  Wine,
  GlassWater,
  Plus,
  RefreshCw,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Flame,
  CheckCircle2,
  Trash2,
  X
} from 'lucide-react'

interface OpenedBottle {
  id: string
  tenant_id: string
  product_name: string
  bottle_size_ml: number
  total_shots: number
  served_shots: number
  shot_price: number
  opened_by?: string | null
  opened_at: string
  status: 'active' | 'finished' | 'discarded'
  fiscal_stamp?: string | null
}

export default function EstancoBarPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [bottles, setBottles] = useState<OpenedBottle[]>([])
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    product_name: '',
    bottle_size_ml: 750,
    total_shots: 16,
    shot_price: 6000,
    opened_by: 'Bartender / Barra Principal',
    fiscal_stamp: ''
  })

  useEffect(() => {
    loadBottles()
  }, [])

  async function loadBottles() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('liquor_opened_bottles')
        .select('*')
        .eq('tenant_id', tid)
        .order('opened_at', { ascending: false })

      if (error) throw error
      setBottles(data || [])
    } catch (err) {
      console.error('Error loading opened bottles:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleOpenBottle(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('liquor_opened_bottles').insert({
        tenant_id: tenantId,
        product_name: form.product_name,
        bottle_size_ml: Number(form.bottle_size_ml) || 750,
        total_shots: Number(form.total_shots) || 16,
        served_shots: 0,
        shot_price: Number(form.shot_price) || 0,
        opened_by: form.opened_by || null,
        fiscal_stamp: form.fiscal_stamp || null,
        status: 'active'
      })

      if (error) throw error
      setShowModal(false)
      setForm({
        product_name: '',
        bottle_size_ml: 750,
        total_shots: 16,
        shot_price: 6000,
        opened_by: 'Bartender / Barra Principal',
        fiscal_stamp: ''
      })
      await loadBottles()
    } catch (err: any) {
      alert(err.message || 'Error al abrir botella')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleServeShot(bottleId: string, currentServed: number, totalShots: number) {
    const nextServed = currentServed + 1
    const isFinished = nextServed >= totalShots
    try {
      await supabase
        .from('liquor_opened_bottles')
        .update({
          served_shots: nextServed,
          status: isFinished ? 'finished' : 'active'
        })
        .eq('id', bottleId)
      await loadBottles()
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function handleSeedDemoBottles() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const demo = [
        {
          tenant_id: tenantId,
          product_name: 'Aguardiente Antioqueño Tapa Azul 750ml',
          bottle_size_ml: 750,
          total_shots: 16,
          served_shots: 6,
          shot_price: 5000,
          opened_by: 'Bartender Turno Noche',
          fiscal_stamp: 'ANT-2026-ESTAMPILLA-889',
          status: 'active'
        },
        {
          tenant_id: tenantId,
          product_name: 'Whisky Old Parr 12 Años 750ml',
          bottle_size_ml: 750,
          total_shots: 16,
          served_shots: 11,
          shot_price: 18000,
          opened_by: 'Caja Barra',
          fiscal_stamp: 'DIAN-IMPORT-5521',
          status: 'active'
        },
        {
          tenant_id: tenantId,
          product_name: 'Ron Medellín Añejo 3 Años 750ml',
          bottle_size_ml: 750,
          total_shots: 16,
          served_shots: 16,
          shot_price: 6000,
          opened_by: 'Barra',
          status: 'finished'
        }
      ]
      await supabase.from('liquor_opened_bottles').insert(demo)
      await loadBottles()
    } catch (err: any) {
      alert('Error demo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const activeBottles = bottles.filter(b => b.status === 'active')
  const totalShotsAvailable = activeBottles.reduce((acc, b) => acc + (b.total_shots - b.served_shots), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Operaciones & Planta</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>Barra & Copeo</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <GlassWater size={24} style={{ color: 'var(--accent-amber)' }} />
            Control de Botellas Abiertas en Barra & Venta por Trago
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Despiece de licores por onzas/tragos (16 tragos por 750ml), estampillas fiscales y consumo fraccionado.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/estanco/returns"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-green)' }}
          >
            <Wine size={15} />
            <span>Envases Retornables</span>
          </Link>
          <Link
            href="/estanco/combos"
            className="btn-neu"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-purple)' }}
          >
            <Sparkles size={15} />
            <span>Combos & Happy Hour</span>
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Abrir Botella en Barra</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="neu-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-amber-lt)', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wine size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Botellas en Barra</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{activeBottles.length} botellas</div>
          </div>
        </div>

        <div className="neu-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-blue-lt)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GlassWater size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Tragos Restantes</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-blue)' }}>{totalShotsAvailable} tragos</div>
          </div>
        </div>
      </div>

      {/* Bottles Grid */}
      {bottles.length === 0 && !loading ? (
        <div className="neu-card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-amber-lt)', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GlassWater size={28} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>No hay botellas abiertas en barra</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 440, margin: 0 }}>
            Abre una botella de licor para comenzar a vender por trago o copeo en el mostrador.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={handleSeedDemoBottles} className="btn-neu btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>
              Cargar Botellas Demo
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {bottles.map(b => {
            const isAct = b.status === 'active'
            const remaining = b.total_shots - b.served_shots
            const percent = (b.served_shots / (b.total_shots || 1)) * 100

            return (
              <div key={b.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{b.product_name}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{b.bottle_size_ml} ml • Precio trago: {formatCurrency(b.shot_price)}</div>
                  </div>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: isAct ? 'var(--accent-amber-lt)' : 'var(--bg-deep)',
                    color: isAct ? 'var(--accent-amber)' : 'var(--text-muted)'
                  }}>
                    {isAct ? 'En Servicio' : 'Botella Terminada'}
                  </span>
                </div>

                <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tragos Servidos: <strong>{b.served_shots} / {b.total_shots}</strong></span>
                    <strong style={{ color: remaining > 3 ? 'var(--accent-green)' : 'var(--accent-coral)' }}>{remaining} restantes</strong>
                  </div>
                  {/* Progress bar */}
                  <div style={{ width: '100%', height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                    <div style={{ width: `${percent}%`, height: '100%', background: 'var(--accent-amber)', borderRadius: 3 }} />
                  </div>
                  {b.fiscal_stamp && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Estampilla: {b.fiscal_stamp}</div>}
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 6 }}>
                  {isAct && (
                    <button
                      onClick={() => handleServeShot(b.id, b.served_shots, b.total_shots)}
                      className="btn-neu btn-primary"
                      style={{ width: '100%', padding: '7px 0', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <GlassWater size={14} /> Servir 1 Trago ({formatCurrency(b.shot_price)})
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Abrir Botella */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 460, width: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Abrir Botella para Barra</h3>
              <button onClick={() => setShowModal(false)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <form onSubmit={handleOpenBottle} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Licor / Producto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Aguardiente Antioqueño 750ml"
                  value={form.product_name}
                  onChange={e => setForm({ ...form, product_name: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Capacidad (ml)</label>
                  <input
                    type="number"
                    required
                    value={form.bottle_size_ml}
                    onChange={e => setForm({ ...form, bottle_size_ml: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Total Tragos (Rendimiento)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.total_shots}
                    onChange={e => setForm({ ...form, total_shots: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Precio por Trago (COP)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.shot_price}
                    onChange={e => setForm({ ...form, shot_price: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Estampilla Fiscal (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Código QR/DIAN"
                    value={form.fiscal_stamp}
                    onChange={e => setForm({ ...form, fiscal_stamp: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-neu" style={{ flex: 1, padding: 9 }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 2, padding: 9 }}>
                  {submitting ? 'Abriendo...' : 'Abrir Botella'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
