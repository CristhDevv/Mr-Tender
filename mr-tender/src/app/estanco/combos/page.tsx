'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import {
  Sparkles,
  Wine,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  ChevronRight,
  Flame,
  Percent,
  X
} from 'lucide-react'

interface LiquorCombo {
  id: string
  tenant_id: string
  combo_name: string
  combo_price: number
  regular_price: number
  items_json: Array<{ name: string; quantity: number }>
  is_active: boolean
  is_happy_hour: boolean
  happy_hour_start?: string | null
  happy_hour_end?: string | null
  created_at: string
}

export default function EstancoCombosPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [combos, setCombos] = useState<LiquorCombo[]>([])
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    combo_name: 'Combo Rumbero Aguardiente + Pasabocas',
    combo_price: 55000,
    regular_price: 68000,
    is_happy_hour: true,
    happy_hour_start: '18:00',
    happy_hour_end: '22:00',
    items: [
      { name: 'Aguardiente Antioqueño 750ml', quantity: 1 },
      { name: 'Bebida Energizante 250ml', quantity: 2 },
      { name: 'Bolsa de Hielo', quantity: 1 }
    ]
  })

  useEffect(() => {
    loadCombos()
  }, [])

  async function loadCombos() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tid = user.user_metadata?.tenant_id
      if (!tid) return
      setTenantId(tid)

      const { data, error } = await supabase
        .from('liquor_combos')
        .select('*')
        .eq('tenant_id', tid)
        .order('combo_name', { ascending: true })

      if (error) throw error
      setCombos(data || [])
    } catch (err) {
      console.error('Error loading liquor combos:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateCombo(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('liquor_combos').insert({
        tenant_id: tenantId,
        combo_name: form.combo_name,
        combo_price: Number(form.combo_price) || 0,
        regular_price: Number(form.regular_price) || 0,
        items_json: form.items,
        is_active: true,
        is_happy_hour: form.is_happy_hour,
        happy_hour_start: form.happy_hour_start || null,
        happy_hour_end: form.happy_hour_end || null
      })

      if (error) throw error
      setShowModal(false)
      await loadCombos()
    } catch (err: any) {
      alert(err.message || 'Error al crear combo')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSeedDemoCombos() {
    if (!tenantId || submitting) return
    setSubmitting(true)
    try {
      const demo = [
        {
          tenant_id: tenantId,
          combo_name: 'Combo Parrandero Antioqueño',
          combo_price: 58000,
          regular_price: 72000,
          items_json: [
            { name: 'Aguardiente Antioqueño Azul 750ml', quantity: 1 },
            { name: 'Gaseosa Ginger 1.5L', quantity: 1 },
            { name: 'Bolsa Hielo 2kg', quantity: 1 }
          ],
          is_active: true,
          is_happy_hour: true,
          happy_hour_start: '17:00',
          happy_hour_end: '21:00'
        },
        {
          tenant_id: tenantId,
          combo_name: 'Balde Cervecero x 6 Coronitas',
          combo_price: 36000,
          regular_price: 45000,
          items_json: [
            { name: 'Cerveza Corona 355ml', quantity: 6 },
            { name: 'Limón y Sal', quantity: 1 }
          ],
          is_active: true,
          is_happy_hour: true,
          happy_hour_start: '16:00',
          happy_hour_end: '20:00'
        }
      ]
      await supabase.from('liquor_combos').insert(demo)
      await loadCombos()
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
            <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>Combos & Happy Hour</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={24} style={{ color: 'var(--accent-purple)' }} />
            Combos de Fiesta, Promociones & Happy Hour
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Paquetes promocionales de botellas con pasabocas, baldes cerveceros y activación por franja horaria.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowModal(true)}
            className="btn-neu btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Nuevo Combo Promocional</span>
          </button>
        </div>
      </div>

      {/* Combos Grid */}
      {combos.length === 0 && !loading ? (
        <div className="neu-card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-purple-lt)', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={28} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>No hay combos promocionales</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 440, margin: 0 }}>
            Crea paquetes de fiesta para vender en el POS con descuento automático.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={handleSeedDemoCombos} className="btn-neu btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>
              Cargar Combos Demo
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {combos.map(c => {
            const savings = Number(c.regular_price || 0) - Number(c.combo_price || 0)
            const discountPercent = c.regular_price > 0 ? (savings / c.regular_price) * 100 : 0
            const items = Array.isArray(c.items_json) ? c.items_json : []

            return (
              <div key={c.id} className="neu-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{c.combo_name}</div>
                    {c.is_happy_hour && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--accent-purple)', fontWeight: 700, marginTop: 2 }}>
                        ⏰ Happy Hour: {c.happy_hour_start} a {c.happy_hour_end}
                      </div>
                    )}
                  </div>
                  {discountPercent > 0 && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: 'var(--accent-purple-lt)', color: 'var(--accent-purple)' }}>
                      -{discountPercent.toFixed(0)}% Ahorro
                    </span>
                  )}
                </div>

                <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Incluye:</div>
                  {items.map((it, i) => (
                    <div key={i} style={{ color: 'var(--text-muted)' }}>• {it.quantity}x {it.name}</div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 6 }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                      {formatCurrency(c.regular_price)}
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--accent-blue)' }}>
                      {formatCurrency(c.combo_price)}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: 'var(--accent-green-lt)', color: 'var(--accent-green)' }}>
                    Activo en POS
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Crear Combo */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="neu-card" style={{ maxWidth: 480, width: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Crear Combo Promocional</h3>
              <button onClick={() => setShowModal(false)} className="btn-neu btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateCombo} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nombre del Combo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Combo Rumbero Aguardiente"
                  value={form.combo_name}
                  onChange={e => setForm({ ...form, combo_name: e.target.value })}
                  className="input-neu"
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Precio Regular (COP)</label>
                  <input
                    type="number"
                    required
                    value={form.regular_price}
                    onChange={e => setForm({ ...form, regular_price: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Precio Oferta (COP)</label>
                  <input
                    type="number"
                    required
                    value={form.combo_price}
                    onChange={e => setForm({ ...form, combo_price: Number(e.target.value) })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Hora Inicio Happy Hour</label>
                  <input
                    type="time"
                    value={form.happy_hour_start}
                    onChange={e => setForm({ ...form, happy_hour_start: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Hora Fin Happy Hour</label>
                  <input
                    type="time"
                    value={form.happy_hour_end}
                    onChange={e => setForm({ ...form, happy_hour_end: e.target.value })}
                    className="input-neu"
                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-neu" style={{ flex: 1, padding: 9 }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-neu btn-primary" style={{ flex: 2, padding: 9 }}>
                  {submitting ? 'Guardando...' : 'Crear Combo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
