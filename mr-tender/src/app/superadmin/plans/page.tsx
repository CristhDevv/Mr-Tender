'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  max_users: number;
  max_products: number;
  max_branches: number;
  has_ecommerce: boolean;
  has_api_access: boolean;
  has_electronic_invoice: boolean;
  has_advanced_reports: boolean;
  trial_days: number;
  is_active: boolean;
  features: string[];
}

const PLAN_ICONS: Record<string, string> = {
  free: '🆓',
  basic: '⭐',
  professional: '🚀',
  enterprise: '🏢'
}

const PLAN_COLORS: Record<string, string> = {
  free: '#8B8B8B',
  basic: '#4A90D9',
  professional: '#8B72BE',
  enterprise: '#F2C14E'
}

export default function PlansAdminPage() {
  const supabase = createClient()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState<string>('')
  const [editUsers, setEditUsers] = useState<number>(0)
  const [editTrialDays, setEditTrialDays] = useState<number>(0)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPlans()
  }, [])

  async function fetchPlans() {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('platform_subscription_plans')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) throw error
      setPlans(data || [])
    } catch (err: any) {
      console.error('Error fetching plans:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function startEdit(plan: Plan) {
    setEditingId(plan.id)
    setEditPrice(plan.price_monthly.toString())
    setEditUsers(plan.max_users)
    setEditTrialDays(plan.trial_days)
  }

  async function savePlan(planId: string) {
    try {
      setUpdating(true)
      const { error } = await supabase.rpc('superadmin_update_plan', {
        p_plan_id: planId,
        p_price: parseFloat(editPrice),
        p_max_users: editUsers
      })

      if (error) throw error
      setPlans(prev => prev.map(p => p.id === planId ? {
        ...p,
        price_monthly: parseFloat(editPrice),
        max_users: editUsers
      } : p))
      setEditingId(null)
    } catch (err: any) {
      console.error('Error updating plan:', err)
      alert('Error al guardar los cambios: ' + err.message)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            Planes de Suscripción
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Configura y edita los precios, límites y características de los niveles de servicio
          </p>
        </div>
        <button onClick={fetchPlans} className="btn-neu btn-ghost" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
          ↻ Actualizar
        </button>
      </div>

      {error && (
        <div className="neu-card" style={{ padding: '16px 20px', background: 'rgba(235,94,85,0.08)', border: '1px solid rgba(235,94,85,0.2)' }}>
          <p style={{ color: 'var(--accent-coral)', fontSize: '0.85rem', margin: 0 }}>⚠️ {error}</p>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando planes...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {plans.map(p => {
            const isEditing = editingId === p.id
            const icon = PLAN_ICONS[p.slug] || '📋'
            const color = PLAN_COLORS[p.slug] || 'var(--accent-blue)'
            return (
              <div key={p.id} className="neu-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, borderTop: `3px solid ${color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.5rem' }}>{icon}</span>
                    <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{p.name}</h3>
                  </div>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                    background: p.is_active ? 'rgba(74,186,134,0.12)' : 'var(--border-color)',
                    color: p.is_active ? 'var(--accent-emerald)' : 'var(--text-muted)'
                  }}>
                    {p.is_active ? 'Activo' : 'Pausado'}
                  </span>
                </div>

                {/* Price */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>$</span>
                      <input
                        type="number"
                        className="input-neu"
                        value={editPrice}
                        onChange={e => setEditPrice(e.target.value)}
                        style={{ width: 90, padding: '4px 8px', fontSize: '1rem', fontWeight: 700 }}
                      />
                    </div>
                  ) : (
                    <span style={{ fontSize: '1.8rem', fontWeight: 900, color, letterSpacing: '-0.03em' }}>
                      {formatCurrency(p.price_monthly)}
                    </span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ mes ({p.currency})</span>
                </div>

                <div className="divider" />

                {/* Limits */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Usuarios máx:</span>
                    {isEditing ? (
                      <input type="number" className="input-neu" value={editUsers} onChange={e => setEditUsers(parseInt(e.target.value) || 0)} style={{ width: 70, padding: '2px 6px', textAlign: 'right' }} />
                    ) : (
                      <strong style={{ color: 'var(--text-primary)' }}>{p.max_users < 0 ? 'Ilimitados' : p.max_users}</strong>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Productos máx:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{p.max_products < 0 ? 'Ilimitados' : p.max_products}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Sucursales:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{p.max_branches < 0 ? 'Ilimitadas' : p.max_branches}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Período prueba:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{p.trial_days} días</strong>
                  </div>
                </div>

                {/* Feature chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {p.has_ecommerce && <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'rgba(74,186,134,0.1)', color: 'var(--accent-emerald)' }}>E-commerce</span>}
                  {p.has_electronic_invoice && <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'rgba(74,144,226,0.1)', color: 'var(--accent-blue)' }}>Facturación</span>}
                  {p.has_api_access && <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'rgba(139,114,190,0.1)', color: 'var(--accent-purple)' }}>API</span>}
                  {p.has_advanced_reports && <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'rgba(242,193,78,0.1)', color: 'var(--accent-gold)' }}>Reportes+</span>}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: 4 }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-neu btn-primary" onClick={() => savePlan(p.id)} disabled={updating} style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}>
                        {updating ? 'Guardando...' : '✓ Guardar'}
                      </button>
                      <button className="btn-neu btn-ghost" onClick={() => setEditingId(null)} style={{ padding: '8px 12px', fontSize: '0.8rem' }}>✕</button>
                    </div>
                  ) : (
                    <button className="btn-neu btn-ghost" onClick={() => startEdit(p)} style={{ width: '100%', padding: '8px', fontSize: '0.8rem' }}>
                      ✎ Editar Precio y Límites
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
