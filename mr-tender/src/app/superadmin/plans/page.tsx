'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import {
  ClipboardList,
  Plus,
  ArrowLeft,
  RefreshCw,
  Check,
  Zap,
  Globe,
  Receipt,
  BarChart3,
  Code
} from 'lucide-react'

interface Plan {
  id: string
  name: string
  slug: string
  description: string
  price_monthly: number
  price_yearly: number
  currency: string
  max_users: number
  max_products: number
  max_branches: number
  has_ecommerce: boolean
  has_api_access: boolean
  has_electronic_invoice: boolean
  has_advanced_reports: boolean
  trial_days: number
  is_active: boolean
}

const PLAN_ICONS: Record<string, string> = { free: '🆓', basic: '⭐', professional: '🚀', enterprise: '🏢' }
const PLAN_COLORS: Record<string, string> = { free: '#8B8B8B', basic: '#4A90D9', professional: '#8B72BE', enterprise: '#F2C14E' }

const EMPTY_PLAN = {
  name: '',
  slug: '',
  description: '',
  price_monthly: '0',
  price_yearly: '0',
  currency: 'USD',
  max_users: '5',
  max_products: '500',
  max_branches: '1',
  trial_days: '14'
}

export default function PlansAdminPage() {
  const supabase = createClient()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Dedicated view: 'list' | 'new'
  const [view, setView] = useState<'list' | 'new'>('list')
  const [newPlan, setNewPlan] = useState(EMPTY_PLAN)

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [editUsers, setEditUsers] = useState(0)

  useEffect(() => {
    fetchPlans()
  }, [])

  async function fetchPlans() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from('platform_subscription_plans').select('*').order('sort_order', { ascending: true })
    if (error) setError(error.message)
    else setPlans(data || [])
    setLoading(false)
  }

  async function savePlan(planId: string) {
    setSaving(true)
    const { error } = await supabase.rpc('superadmin_update_plan', {
      p_plan_id: planId,
      p_price: parseFloat(editPrice),
      p_max_users: editUsers
    })
    if (error) return alert('Error: ' + error.message)
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, price_monthly: parseFloat(editPrice), max_users: editUsers } : p))
    setEditingId(null)
    setSaving(false)
  }

  async function togglePlan(planId: string, current: boolean) {
    const { error } = await supabase.rpc('superadmin_toggle_plan', { p_plan_id: planId, p_is_active: !current })
    if (error) return alert('Error: ' + error.message)
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, is_active: !current } : p))
  }

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.rpc('superadmin_create_plan', {
        p_name: newPlan.name.trim(),
        p_slug: newPlan.slug.toLowerCase().replace(/\s+/g, '-').trim(),
        p_description: newPlan.description.trim(),
        p_price_monthly: parseFloat(newPlan.price_monthly),
        p_price_yearly: parseFloat(newPlan.price_yearly),
        p_currency: newPlan.currency,
        p_max_users: parseInt(newPlan.max_users),
        p_max_products: parseInt(newPlan.max_products),
        p_max_branches: parseInt(newPlan.max_branches),
        p_trial_days: parseInt(newPlan.trial_days)
      })
      if (error) throw error
      await fetchPlans()
      setView('list')
      setNewPlan(EMPTY_PLAN)
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', overflowX: 'hidden' }}>
      
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.4rem' }}>📋</span>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Planes de Suscripción
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0' }}>
            Configuración de tarifas, límites y capacidades de servicio de la plataforma (Sin modales).
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchPlans} className="btn-neu btn-ghost" title="Recargar" style={{ padding: '8px 12px' }}>
            <RefreshCw size={15} />
          </button>
          {view === 'list' ? (
            <button
              onClick={() => setView('new')}
              className="btn-neu btn-primary"
              style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Nuevo Plan</span>
            </button>
          ) : (
            <button
              onClick={() => setView('list')}
              className="btn-neu btn-ghost"
              style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ArrowLeft size={16} />
              <span>Volver a Planes</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="neu-card" style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <span style={{ color: 'var(--accent-coral)', fontSize: '0.82rem', fontWeight: 600 }}>⚠️ {error}</span>
        </div>
      )}

      {/* ── DEDICATED VIEW: CREATE NEW PLAN ── */}
      {view === 'new' ? (
        <div className="neu-card animate-scale-in" style={{ padding: 26, maxWidth: 800, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
              + Crear Nuevo Nivel de Suscripción
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Define los límites de usuarios, productos, sucursales y tarifas del nuevo plan.
            </p>
          </div>

          <form onSubmit={handleCreatePlan} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                  Nombre del Plan *
                </label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Ej: Plan Crecimiento Pro"
                  value={newPlan.name}
                  onChange={e => setNewPlan(f => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-') }))}
                  required
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                  Slug (identificador) *
                </label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="plan-crecimiento"
                  value={newPlan.slug}
                  onChange={e => setNewPlan(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  required
                  style={{ width: '100%', fontSize: '0.85rem', fontFamily: 'monospace' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                Descripción del Plan
              </label>
              <input
                type="text"
                className="input-neu"
                placeholder="Ideal para cadenas de tiendas con facturación electrónica..."
                value={newPlan.description}
                onChange={e => setNewPlan(f => ({ ...f, description: e.target.value }))}
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                  Precio Mensual ($) *
                </label>
                <input
                  type="number"
                  className="input-neu"
                  value={newPlan.price_monthly}
                  onChange={e => setNewPlan(f => ({ ...f, price_monthly: e.target.value }))}
                  required
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                  Precio Anual ($)
                </label>
                <input
                  type="number"
                  className="input-neu"
                  value={newPlan.price_yearly}
                  onChange={e => setNewPlan(f => ({ ...f, price_yearly: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                  Moneda
                </label>
                <select
                  className="input-neu"
                  value={newPlan.currency}
                  onChange={e => setNewPlan(f => ({ ...f, currency: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="COP">COP ($)</option>
                  <option value="USD">USD ($)</option>
                  <option value="MXN">MXN ($)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                  Máx Usuarios
                </label>
                <input
                  type="number"
                  className="input-neu"
                  value={newPlan.max_users}
                  onChange={e => setNewPlan(f => ({ ...f, max_users: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                  Máx Productos
                </label>
                <input
                  type="number"
                  className="input-neu"
                  value={newPlan.max_products}
                  onChange={e => setNewPlan(f => ({ ...f, max_products: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                  Máx Sucursales
                </label>
                <input
                  type="number"
                  className="input-neu"
                  value={newPlan.max_branches}
                  onChange={e => setNewPlan(f => ({ ...f, max_branches: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                  Días Prueba
                </label>
                <input
                  type="number"
                  className="input-neu"
                  value={newPlan.trial_days}
                  onChange={e => setNewPlan(f => ({ ...f, trial_days: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 10 }}>
              <button
                type="button"
                onClick={() => setView('list')}
                className="btn-neu btn-ghost"
                style={{ padding: '8px 18px' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-neu btn-primary"
                style={{ padding: '8px 24px', fontWeight: 800 }}
              >
                {saving ? 'Creando...' : 'Crear Nivel de Plan'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* ── DEDICATED VIEW: PLANS GRID LIST ── */
        loading ? (
          <div className="neu-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            <div>Cargando planes...</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {plans.map(p => {
              const isEditing = editingId === p.id
              const icon = PLAN_ICONS[p.slug] || '📋'
              const color = PLAN_COLORS[p.slug] || 'var(--accent-blue)'

              return (
                <div
                  key={p.id}
                  className="neu-card"
                  style={{
                    padding: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    borderTop: `3px solid ${color}`,
                    opacity: p.is_active ? 1 : 0.65
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: '1.4rem' }}>{icon}</span>
                      <h3 style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>
                        {p.name}
                      </h3>
                    </div>

                    <button
                      onClick={() => togglePlan(p.id, p.is_active)}
                      style={{
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: p.is_active ? 'rgba(74,186,134,0.15)' : 'var(--border-color)',
                        color: p.is_active ? 'var(--accent-emerald)' : 'var(--text-muted)'
                      }}
                    >
                      {p.is_active ? '🟢 Activo' : '⏸ Pausado'}
                    </button>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, minHeight: 32 }}>
                    {p.description || 'Nivel de servicio para comercios'}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontWeight: 700 }}>$</span>
                        <input
                          type="number"
                          className="input-neu"
                          value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                          style={{ width: 100, padding: '4px 8px', fontSize: '1.1rem', fontWeight: 800 }}
                        />
                      </div>
                    ) : (
                      <span style={{ fontSize: '1.6rem', fontWeight: 900, color, letterSpacing: '-0.02em' }}>
                        {formatCurrency(p.price_monthly)}
                      </span>
                    )}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ mes ({p.currency})</span>
                  </div>

                  <div style={{ background: 'var(--bg-deep)', padding: 10, borderRadius: 8, fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Usuarios:</span>
                      {isEditing ? (
                        <input
                          type="number"
                          className="input-neu"
                          value={editUsers}
                          onChange={e => setEditUsers(+e.target.value)}
                          style={{ width: 60, padding: '2px 4px', textAlign: 'right' }}
                        />
                      ) : (
                        <strong>{p.max_users < 0 ? '∞ Ilimitados' : p.max_users}</strong>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Productos:</span>
                      <strong>{p.max_products < 0 ? '∞ Ilimitados' : p.max_products}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Sucursales:</span>
                      <strong>{p.max_branches < 0 ? '∞ Ilimitadas' : p.max_branches}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Prueba gratuita:</span>
                      <strong>{p.trial_days} días</strong>
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn-neu btn-primary"
                          onClick={() => savePlan(p.id)}
                          disabled={saving}
                          style={{ flex: 1, padding: '7px', fontSize: '0.75rem' }}
                        >
                          {saving ? '...' : '✓ Guardar'}
                        </button>
                        <button
                          className="btn-neu btn-ghost"
                          onClick={() => setEditingId(null)}
                          style={{ padding: '7px 12px', fontSize: '0.75rem' }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn-neu btn-ghost"
                        onClick={() => { setEditingId(p.id); setEditPrice(p.price_monthly.toString()); setEditUsers(p.max_users) }}
                        style={{ width: '100%', padding: '7px', fontSize: '0.75rem' }}
                      >
                        ✎ Modificar Precio y Usuarios
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

    </div>
  )
}
